-- Add per-kanji JLPT-ish level metadata for radical/kanji study filtering.
-- This is separate from vocabulary_cache.jlpt, which describes the word level.

alter table if exists public.kanji_radicals
add column if not exists jlpt_level text;

comment on column public.kanji_radicals.jlpt_level is
  'Optional per-kanji level label used for kanji/radical study filtering. Separate from vocabulary_cache.jlpt, which is word-level.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kanji_radicals_jlpt_level_check'
  ) then
    alter table public.kanji_radicals
    add constraint kanji_radicals_jlpt_level_check
    check (jlpt_level is null or jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1'));
  end if;
end $$;

create index if not exists kanji_radicals_jlpt_level_idx
on public.kanji_radicals(jlpt_level);
