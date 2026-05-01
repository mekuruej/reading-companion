-- Library word encounter summaries: 03 fast backfill from SQL editor
--
-- Run this last, after the table and functions are created.
-- This version avoids the per-word refresh loop so it can handle a larger library.

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
  base.user_id,
  base.study_identity_key,
  '',
  (array_agg(base.surface order by base.created_at desc nulls last, base.id desc))[1],
  (array_agg(base.reading order by base.created_at desc nulls last, base.id desc))[1],
  (array_agg(base.meaning order by base.created_at desc nulls last, base.id desc))[1],
  (array_agg(base.jlpt order by base.created_at desc nulls last, base.id desc))[1],
  bool_or(coalesce(base.is_common, false)),
  count(*)::integer,
  count(*) filter (
    where coalesce(base.hidden, false) = false
      and base.surface is not null
      and base.reading is not null
      and base.meaning is not null
  )::integer,
  count(*) filter (where coalesce(base.hidden, false) = true)::integer,
  count(distinct base.user_book_id)::integer,
  min(base.created_at),
  max(base.created_at),
  (array_agg(base.id order by base.created_at desc nulls last, base.id desc))[1],
  (array_agg(base.user_book_id order by base.created_at desc nulls last, base.id desc))[1],
  (array_agg(base.book_title order by base.created_at desc nulls last, base.id desc))[1],
  (array_agg(base.book_cover_url order by base.created_at desc nulls last, base.id desc))[1],
  now()
from (
  select
    ub.user_id,
    ubw.id,
    ubw.user_book_id,
    nullif(btrim(ubw.surface), '') as surface,
    nullif(btrim(ubw.reading), '') as reading,
    nullif(btrim(ubw.meaning), '') as meaning,
    nullif(btrim(ubw.jlpt), '') as jlpt,
    ubw.is_common,
    ubw.hidden,
    ubw.created_at,
    b.title as book_title,
    b.cover_url as book_cover_url,
    public.library_study_identity_key(ubw.surface, ubw.reading) as study_identity_key
  from public.user_book_words ubw
  join public.user_books ub on ub.id = ubw.user_book_id
  left join public.books b on b.id = ub.book_id
) base
where base.study_identity_key <> ''
group by base.user_id, base.study_identity_key
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
