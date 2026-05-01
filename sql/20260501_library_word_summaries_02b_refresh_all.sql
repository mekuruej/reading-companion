-- Library word encounter summaries: 02b refresh all words
--
-- Run this after 02a_refresh_one.

create or replace function public.refresh_user_library_word_summaries(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $refresh_all$
declare
  v_key text;
begin
  if p_user_id is null then
    return;
  end if;

  delete from public.user_library_word_summaries
  where user_id = p_user_id
    and study_identity_key not in (
      select distinct public.library_study_identity_key(ubw.surface, ubw.reading)
      from public.user_book_words ubw
      join public.user_books ub on ub.id = ubw.user_book_id
      where ub.user_id = p_user_id
        and public.library_study_identity_key(ubw.surface, ubw.reading) <> ''
    );

  for v_key in
    select distinct public.library_study_identity_key(ubw.surface, ubw.reading)
    from public.user_book_words ubw
    join public.user_books ub on ub.id = ubw.user_book_id
    where ub.user_id = p_user_id
      and public.library_study_identity_key(ubw.surface, ubw.reading) <> ''
  loop
    perform public.refresh_user_library_word_summary_for_key(p_user_id, v_key);
  end loop;
end;
$refresh_all$;

create or replace function public.refresh_my_library_word_summaries()
returns void
language plpgsql
security definer
set search_path = public
as $refresh_mine$
begin
  perform public.refresh_user_library_word_summaries(auth.uid());
end;
$refresh_mine$;

grant execute on function public.refresh_my_library_word_summaries() to authenticated;
