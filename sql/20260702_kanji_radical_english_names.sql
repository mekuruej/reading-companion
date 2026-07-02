-- Add an optional learner-friendly English radical name alongside the source/Kakimashou name.

alter table if exists public.kanji_radicals
add column if not exists radical_english_name text;

comment on column public.kanji_radicals.radical_name is
  'Source/Kakimashou-style name for the main radical. Kept separate from learner-facing English naming.';

comment on column public.kanji_radicals.radical_english_name is
  'Optional learner-friendly English display name for the main radical, for example speech, water, hand.';

notify pgrst, 'reload schema';
