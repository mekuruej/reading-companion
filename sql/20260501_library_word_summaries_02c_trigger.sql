-- Library word encounter summaries: 02c trigger
--
-- Run this after 02b_refresh_all.

create or replace function public.refresh_library_word_summary_from_word()
returns trigger
language plpgsql
security definer
set search_path = public
as $summary_trigger$
declare
  v_old_user_id uuid;
  v_new_user_id uuid;
  v_old_key text;
  v_new_key text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select user_id into v_old_user_id
    from public.user_books
    where id = old.user_book_id;

    v_old_key := public.library_study_identity_key(old.surface, old.reading);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select user_id into v_new_user_id
    from public.user_books
    where id = new.user_book_id;

    v_new_key := public.library_study_identity_key(new.surface, new.reading);
  end if;

  if v_old_user_id is not null and coalesce(v_old_key, '') <> '' then
    perform public.refresh_user_library_word_summary_for_key(v_old_user_id, v_old_key);
  end if;

  if v_new_user_id is not null
    and coalesce(v_new_key, '') <> ''
    and (v_old_user_id is distinct from v_new_user_id or v_old_key is distinct from v_new_key)
  then
    perform public.refresh_user_library_word_summary_for_key(v_new_user_id, v_new_key);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$summary_trigger$;

drop trigger if exists refresh_library_word_summary_from_word
  on public.user_book_words;

create trigger refresh_library_word_summary_from_word
after insert or update or delete on public.user_book_words
for each row
execute function public.refresh_library_word_summary_from_word();
