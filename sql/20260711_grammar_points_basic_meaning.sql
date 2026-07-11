-- Add compact reader-facing summary meaning for shared grammar points.

alter table public.grammar_points
add column if not exists basic_meaning_en text;

comment on column public.grammar_points.basic_meaning_en is
  'Compact reader-facing summary meaning for future Follow-Along or simple grammar cards.';
