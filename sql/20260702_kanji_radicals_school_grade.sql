-- Add optional Japanese school grade metadata for kanji-level study and future Kanken support.

alter table if exists public.kanji_radicals
add column if not exists school_grade integer;

comment on column public.kanji_radicals.school_grade is
  'Optional Japanese school grade when the kanji is taught. Use 1-6 for elementary grades and 8 for junior high+; null means unchecked/unknown.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kanji_radicals_school_grade_check'
  ) then
    alter table public.kanji_radicals
    add constraint kanji_radicals_school_grade_check
    check (school_grade is null or school_grade between 1 and 8);
  end if;
end $$;

create index if not exists kanji_radicals_school_grade_idx
on public.kanji_radicals(school_grade);

notify pgrst, 'reload schema';
