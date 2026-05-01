-- Library word encounter summaries: 02a refresh one word
--
-- Run this after 01_table.
-- Important: the final line must be $refresh_one$;

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
