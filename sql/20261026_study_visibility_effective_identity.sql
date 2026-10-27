-- Optional pinned identities take precedence; ordinary words derive their identity.
-- CREATE OR REPLACE preserves existing ownership and grants; predicates remain unchanged.
begin;
set local lock_timeout = '3s';
create or replace view public.study_available_library_word_summaries with (security_invoker = true) as
select s.* from public.user_library_word_summaries s where exists (
  select 1 from public.study_visible_user_book_words w join public.user_books b on b.id = w.user_book_id
  where b.user_id = s.user_id and coalesce(w.study_identity_key, public.library_study_identity_key(w.surface, w.reading)) = s.study_identity_key and w.hidden is not true
);
-- Used to prevent a global/claim fallback from reintroducing a personally hidden card.
create or replace view public.personally_hidden_study_identities with (security_invoker = true) as
select distinct coalesce(w.study_identity_key, public.library_study_identity_key(w.surface, w.reading)) as study_identity_key from public.personal_user_book_words w
join public.user_books b on b.id = w.user_book_id
where b.user_id = auth.uid() and w.flashcard_hidden and not exists (
  select 1 from public.study_visible_user_book_words active join public.user_books ab on ab.id = active.user_book_id
  where ab.user_id = auth.uid() and coalesce(active.study_identity_key, public.library_study_identity_key(active.surface, active.reading)) = coalesce(w.study_identity_key, public.library_study_identity_key(w.surface, w.reading)) and active.hidden is not true
);
commit;
