-- Personal display preferences. Does not alter encounters, reviews, or scheduling.
-- Apply after finalized_user_book_words and user_library_word_summaries exist.
begin;
create table public.user_book_word_visibility (
  word_id uuid primary key references public.user_book_words(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_book_id uuid not null references public.user_books(id) on delete cascade,
  follow_along_hidden boolean not null default false,
  flashcard_hidden boolean not null default false
);
create index user_book_word_visibility_owner_book on public.user_book_word_visibility(user_id, user_book_id);
alter table public.user_book_word_visibility enable row level security;
create policy visibility_owner_read on public.user_book_word_visibility for select to authenticated
using (user_id = auth.uid() and exists (
  select 1 from public.user_book_words w join public.user_books b on b.id = w.user_book_id
  where w.id = word_id and b.id = user_book_word_visibility.user_book_id and b.user_id = auth.uid()
));
-- Writes go through the narrow RPC; clients cannot change ownership or both flags accidentally.
revoke all on public.user_book_word_visibility from public, anon, authenticated;
grant select on public.user_book_word_visibility to authenticated;
create function public.set_book_word_visibility(p_word uuid, p_book uuid, p_feature text, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_hidden is null or p_feature not in ('follow_along', 'flashcard') or p_feature is null then
    raise exception 'Invalid visibility request' using errcode = '22023';
  end if;
  perform 1 from public.user_book_words w join public.user_books b on b.id = w.user_book_id
    where w.id = p_word and b.id = p_book and b.user_id = auth.uid() for share of w, b;
  if not found then raise exception 'Word is not in your book' using errcode = '42501'; end if;
  insert into public.user_book_word_visibility(word_id, user_id, user_book_id, follow_along_hidden, flashcard_hidden)
    values (p_word, auth.uid(), p_book, p_feature = 'follow_along' and p_hidden, p_feature = 'flashcard' and p_hidden)
  on conflict (word_id) do update set
    user_id = excluded.user_id, user_book_id = excluded.user_book_id,
    follow_along_hidden = case when p_feature = 'follow_along' then p_hidden else user_book_word_visibility.follow_along_hidden end,
    flashcard_hidden = case when p_feature = 'flashcard' then p_hidden else user_book_word_visibility.flashcard_hidden end;
end $$;
revoke all on function public.set_book_word_visibility(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.set_book_word_visibility(uuid, uuid, text, boolean) to authenticated;
create view public.personal_user_book_words with (security_invoker = true) as
select w.*, coalesce(v.follow_along_hidden, false) as follow_along_hidden,
  coalesce(v.flashcard_hidden, false) as flashcard_hidden
from public.finalized_user_book_words w
left join public.user_book_word_visibility v on v.word_id = w.id and v.user_id = auth.uid();
create view public.study_visible_user_book_words with (security_invoker = true) as
select * from public.personal_user_book_words where not flashcard_hidden;
create view public.study_available_library_word_summaries with (security_invoker = true) as
select s.* from public.user_library_word_summaries s where exists (
  select 1 from public.study_visible_user_book_words w join public.user_books b on b.id = w.user_book_id
  where b.user_id = s.user_id and w.study_identity_key = s.study_identity_key and w.hidden is not true
);
-- Used to prevent a global/claim fallback from reintroducing a personally hidden card.
create view public.personally_hidden_study_identities with (security_invoker = true) as
select distinct w.study_identity_key from public.personal_user_book_words w
join public.user_books b on b.id = w.user_book_id
where b.user_id = auth.uid() and w.flashcard_hidden and not exists (
  select 1 from public.study_visible_user_book_words active join public.user_books ab on ab.id = active.user_book_id
  where ab.user_id = auth.uid() and active.study_identity_key = w.study_identity_key and active.hidden is not true
);
grant select on public.personally_hidden_study_identities to authenticated;
grant select on public.personal_user_book_words, public.study_visible_user_book_words,
  public.study_available_library_word_summaries to authenticated;
commit;
