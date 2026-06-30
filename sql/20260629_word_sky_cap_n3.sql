-- Keep Word Sky motivating by limiting its shared starter pool to N5-N3.
-- Harder, unlabeled, or obscure words can still live in vocabulary_cache and book study.

delete from public.word_sky_starter_words
where jlpt_level not in ('N5', 'N4', 'N3');

create or replace function public.get_word_sky_pool(p_limit integer default 140)
returns table (
  study_identity_key text,
  surface text,
  reading text,
  meaning text,
  jlpt text,
  total_encounter_count integer,
  book_count integer
)
language sql
security definer
set search_path = public
as $word_sky_pool$
  with requested as (
    select greatest(1, least(coalesce(p_limit, 140), 300)) as row_limit
  ),
  starter_pool as (
    select
      public.library_study_identity_key(w.surface, w.reading) as study_identity_key,
      w.surface,
      w.reading,
      w.meaning,
      w.jlpt_level as jlpt,
      0::integer as total_encounter_count,
      0::integer as book_count
    from public.word_sky_starter_words w
    where w.active = true
      and w.jlpt_level in ('N5', 'N4', 'N3')
      and nullif(btrim(coalesce(w.surface, '')), '') is not null
      and nullif(btrim(coalesce(w.reading, '')), '') is not null
      and nullif(btrim(coalesce(w.meaning, '')), '') is not null
    order by random()
    limit (select row_limit from requested)
  ),
  library_pool as (
    select
      s.study_identity_key,
      s.surface,
      s.reading,
      s.meaning,
      coalesce(nullif(s.jlpt, ''), 'NON-JLPT') as jlpt,
      s.total_encounter_count,
      s.book_count
    from public.user_library_word_summaries s
    where s.jlpt in ('N5', 'N4', 'N3')
      and nullif(btrim(coalesce(s.surface, '')), '') is not null
      and nullif(btrim(coalesce(s.reading, '')), '') is not null
      and nullif(btrim(coalesce(s.meaning, '')), '') is not null
    order by random()
    limit (select row_limit from requested)
  ),
  mixed_pool as (
    select * from starter_pool
    union all
    select * from library_pool
  ),
  deduped_pool as (
    select distinct on (study_identity_key)
      study_identity_key,
      surface,
      reading,
      meaning,
      jlpt,
      total_encounter_count,
      book_count
    from mixed_pool
    order by study_identity_key, random()
  )
  select
    study_identity_key,
    surface,
    reading,
    meaning,
    jlpt,
    total_encounter_count,
    book_count
  from deduped_pool
  order by random()
  limit (select row_limit from requested);
$word_sky_pool$;

grant execute on function public.get_word_sky_pool(integer) to authenticated;
