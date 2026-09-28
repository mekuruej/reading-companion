-- Explicit submission state for the personal assessment queue.
-- Existing meaningful assessments count as complete, including Not for Teaching.
begin;
alter table public.teacher_books add column if not exists assessed_at timestamptz;
update public.teacher_books
set assessed_at = coalesce(updated_at, created_at, now())
where assessed_at is null and (
  teacher_jlpt_difficulty is not null or teaching_suitability is not null
  or nullif(btrim(teacher_use_note), '') is not null
  or teacher_use_status in ('approved_for_lesson', 'usable', 'use_with_caution', 'do_not_use')
);
comment on column public.teacher_books.assessed_at is
  'Last explicit Overall Teaching Assessment save. Completes the personal assessment queue even when optional fields are blank. Shared discovery exposes structured ratings only, never private notes or Reading Experiences.';
notify pgrst, 'reload schema';
commit;
