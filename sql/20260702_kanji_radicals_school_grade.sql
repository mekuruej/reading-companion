-- Add optional Japanese school grade metadata for kanji-level study and future Kanken support.

alter table if exists public.kanji_radicals
add column if not exists school_grade integer;

comment on column public.kanji_radicals.school_grade is
  'Optional Japanese school grade when the kanji is taught. Use 1-6 for elementary grades, 8 for junior high, and 9 for high school; null means unchecked/unknown.';

alter table if exists public.kanji_radicals
  drop constraint if exists kanji_radicals_school_grade_check;

alter table if exists public.kanji_radicals
  add constraint kanji_radicals_school_grade_check
  check (school_grade is null or school_grade between 1 and 9);

create index if not exists kanji_radicals_school_grade_idx
on public.kanji_radicals(school_grade);

notify pgrst, 'reload schema';
