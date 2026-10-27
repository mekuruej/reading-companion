-- Only after installed definitions/ACLs are checked against the saved pre-migration snapshot.
-- Stop on drift; this restores the repository baseline, not an arbitrary live definition.
-- Manual rollback only. No vocabulary or review-progress writes.
begin;
set local lock_timeout = '3s';
create or replace view public.study_available_library_word_summaries with (security_invoker = true) as
select s.* from public.user_library_word_summaries s where exists (
  select 1 from public.study_visible_user_book_words w join public.user_books b on b.id = w.user_book_id
  where b.user_id = s.user_id and w.study_identity_key = s.study_identity_key and w.hidden is not true
);
-- Used to prevent a global/claim fallback from reintroducing a personally hidden card.
create or replace view public.personally_hidden_study_identities with (security_invoker = true) as
select distinct w.study_identity_key from public.personal_user_book_words w
join public.user_books b on b.id = w.user_book_id
where b.user_id = auth.uid() and w.flashcard_hidden and not exists (
  select 1 from public.study_visible_user_book_words active join public.user_books ab on ab.id = active.user_book_id
  where ab.user_id = auth.uid() and active.study_identity_key = w.study_identity_key and active.hidden is not true
);
commit;
