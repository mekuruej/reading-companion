-- Add optional Jouyou metadata for kanji-level study and radical upkeep.

alter table if exists public.kanji_radicals
add column if not exists is_jouyou boolean;

comment on column public.kanji_radicals.is_jouyou is
  'Optional kanji-level flag for whether the kanji is in the Jouyou kanji list. Null means unchecked/unknown.';

create index if not exists kanji_radicals_is_jouyou_idx
on public.kanji_radicals(is_jouyou);

notify pgrst, 'reload schema';
