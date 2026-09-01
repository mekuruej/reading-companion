-- Teaching-mode Students' Progress resume bookmark.
--
-- This belongs to the teacher/student/student-owned-book relationship. It is
-- intentionally separate from vocabulary, reading progress, sessions, and Live
-- Lesson capture history.

alter table public.teacher_student_lesson_books
  add column if not exists resume_at_text text,
  add column if not exists resume_updated_at timestamptz;

alter table public.teacher_student_lesson_books
  drop constraint if exists teacher_student_lesson_books_resume_at_text_length;

alter table public.teacher_student_lesson_books
  add constraint teacher_student_lesson_books_resume_at_text_length
    check (resume_at_text is null or char_length(resume_at_text) <= 500);

create index if not exists teacher_student_lesson_books_resume_idx
  on public.teacher_student_lesson_books (
    teacher_id,
    status,
    resume_updated_at desc
  )
  where resume_updated_at is not null;

create or replace function public.validate_teacher_student_lesson_book_resume()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    tg_op = 'INSERT'
    and (new.resume_at_text is not null or new.resume_updated_at is not null)
  ) or (
    tg_op = 'UPDATE'
    and (
      new.resume_at_text is distinct from old.resume_at_text
      or new.resume_updated_at is distinct from old.resume_updated_at
    )
  ) then
    if new.status <> 'active' then
      raise exception 'Resume bookmark can only be changed on active lesson books.';
    end if;

    if not exists (
      select 1
      from public.teacher_students ts
      where ts.teacher_id = new.teacher_id
        and ts.student_id = new.student_id
        and ts.archived_at is null
    ) then
      raise exception 'Resume bookmark requires an active teacher/student relationship.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_teacher_student_lesson_book_resume
  on public.teacher_student_lesson_books;

create trigger validate_teacher_student_lesson_book_resume
before insert or update on public.teacher_student_lesson_books
for each row
execute function public.validate_teacher_student_lesson_book_resume();

comment on column public.teacher_student_lesson_books.resume_at_text is
  'Private teacher-controlled lesson bookmark for where the next lesson should begin. Does not create vocabulary or change personal reading progress.';

comment on column public.teacher_student_lesson_books.resume_updated_at is
  'Timestamp when the private lesson resume bookmark was last saved.';
