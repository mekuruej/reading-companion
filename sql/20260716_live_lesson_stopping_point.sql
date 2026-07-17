-- Live Lesson explicit end-of-lesson stopping point.
--
-- This checkpoint belongs to the teacher/student/book Live Lesson session. It is
-- intentionally separate from saved vocabulary rows, reader progress, and
-- furthest-page calculations.

alter table public.live_lesson_capture_sessions
  add column if not exists stopping_page_number integer,
  add column if not exists stopping_text text,
  add column if not exists stopping_point_saved_at timestamptz;

alter table public.live_lesson_capture_sessions
  drop constraint if exists live_lesson_capture_sessions_stopping_text_length;

alter table public.live_lesson_capture_sessions
  add constraint live_lesson_capture_sessions_stopping_text_length
    check (stopping_text is null or char_length(stopping_text) <= 500);

create index if not exists live_lesson_capture_sessions_stopping_point_idx
  on public.live_lesson_capture_sessions (
    teacher_id,
    student_id,
    user_book_id,
    stopping_point_saved_at desc
  )
  where stopping_point_saved_at is not null;

comment on column public.live_lesson_capture_sessions.stopping_page_number is
  'Teacher-confirmed page where a Live Lesson ended. Separate from vocabulary page history and reader progress.';

comment on column public.live_lesson_capture_sessions.stopping_text is
  'Optional short text/snippet from the place where the Live Lesson ended. Not a vocabulary row.';

comment on column public.live_lesson_capture_sessions.stopping_point_saved_at is
  'Timestamp when the teacher explicitly saved the Live Lesson stopping point.';
