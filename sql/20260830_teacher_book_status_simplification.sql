-- Simplify teacher-facing book status choices.
--
-- Existing workflow status records are preserved for history, but new teacher
-- assessment UI can leave status blank or choose a compact recommendation.

alter table public.teacher_books
  alter column teacher_use_status drop not null,
  alter column teacher_use_status drop default;

alter table public.teacher_books
  drop constraint if exists teacher_books_teacher_use_status_check;

alter table public.teacher_books
  add constraint teacher_books_teacher_use_status_check
  check (
    teacher_use_status is null
    or teacher_use_status in (
      'want_to_test',
      'testing',
      'currently_using',
      'approved_for_lesson',
      'usable',
      'use_with_caution',
      'do_not_use'
    )
  );
