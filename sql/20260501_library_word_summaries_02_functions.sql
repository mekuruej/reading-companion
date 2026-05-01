-- Library word encounter summaries: 02 functions and trigger
--
-- Run this after 20260501_library_word_summaries_01_table.sql.

create or replace function public.refresh_user_library_word_summary_for_key(
  p_user_id uuid,
  p_study_identity_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $refresh_one$
begin
  if p_user_id is null or coalesce(p_study_identity_key, '') = '' then
    return;
  end if;

  delete from public.user_library_word_summaries
  where user_id = p_user_id
    and study_identity_key = p_study_identity_key
    and not exists (
      select 1
      from public.user_book_words ubw
      join public.user_books ub on ub.id = ubw.user_book_id
      where ub.user_id = p_user_id
        and public.library_study_identity_key(ubw.surface, ubw.reading) = p_study_identity_key
    );

  insert into public.user_library_word_summaries (
    user_id,
    study_identity_key,
    definition_key,
    surface,
    reading,
    meaning,
    jlpt,
    is_common,
    total_encounter_count,
    check_ready_encounter_count,
    hidden_encounter_count,
    book_count,
    first_seen_at,
    last_seen_at,
    sample_user_book_word_id,
    sample_user_book_id,
    sample_book_title,
    sample_book_cover_url,
    updated_at
  )
  select
    ub.user_id,
    p_study_identity_key,
    '',
    (array_agg(nullif(btrim(ubw.surface), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.reading), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.meaning), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.jlpt), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    bool_or(coalesce(ubw.is_common, false)),
    count(*)::integer,
    count(*) filter (
      where coalesce(ubw.hidden, false) = false
        and nullif(btrim(coalesce(ubw.surface, '')), '') is not null
        and nullif(btrim(coalesce(ubw.reading, '')), '') is not null
        and nullif(btrim(coalesce(ubw.meaning, '')), '') is not null
    )::integer,
    count(*) filter (where coalesce(ubw.hidden, false) = true)::integer,
    count(distinct ubw.user_book_id)::integer,
    min(ubw.created_at),
    max(ubw.created_at),
    (array_agg(ubw.id order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(ubw.user_book_id order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(b.title order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(b.cover_url order by ubw.created_at desc nulls last, ubw.id desc))[1],
    now()
  from public.user_book_words ubw
  join public.user_books ub on ub.id = ubw.user_book_id
  left join public.books b on b.id = ub.book_id
  where ub.user_id = p_user_id
    and public.library_study_identity_key(ubw.surface, ubw.reading) = p_study_identity_key
  group by ub.user_id
  on conflict (user_id, study_identity_key, definition_key)
  do update set
    surface = excluded.surface,
    reading = excluded.reading,
    meaning = excluded.meaning,
    jlpt = excluded.jlpt,
    is_common = excluded.is_common,
    total_encounter_count = excluded.total_encounter_count,
    check_ready_encounter_count = excluded.check_ready_encounter_count,
    hidden_encounter_count = excluded.hidden_encounter_count,
    book_count = excluded.book_count,
    first_seen_at = excluded.first_seen_at,
    last_seen_at = excluded.last_seen_at,
    sample_user_book_word_id = excluded.sample_user_book_word_id,
    sample_user_book_id = excluded.sample_user_book_id,
    sample_book_title = excluded.sample_book_title,
    sample_book_cover_url = excluded.sample_book_cover_url,
    updated_at = now();
end;
$refresh_one$;

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

grant execute on function public.refresh_my_library_word_summaries() to authenticated;
