-- Teacher Book assessment fields
--
-- These fields describe teacher-facing book fit. They do not change reader
-- library state, student-facing lesson content, or teacher_book_items.

alter table public.teacher_books
  add column if not exists teacher_jlpt_difficulty text,
  add column if not exists teaching_suitability text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_books_teacher_jlpt_difficulty_check'
      and conrelid = 'public.teacher_books'::regclass
  ) then
    alter table public.teacher_books
      add constraint teacher_books_teacher_jlpt_difficulty_check
      check (
        teacher_jlpt_difficulty is null
        or teacher_jlpt_difficulty in ('n5', 'n4', 'n3', 'n2', 'n1', 'above_n1')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_books_teaching_suitability_check'
      and conrelid = 'public.teacher_books'::regclass
  ) then
    alter table public.teacher_books
      add constraint teacher_books_teaching_suitability_check
      check (
        teaching_suitability is null
        or teaching_suitability in ('excellent', 'usable', 'poor_fit')
      );
  end if;
end $$;

create index if not exists teacher_books_teacher_assessment_idx
  on public.teacher_books (
    teacher_id,
    teacher_jlpt_difficulty,
    teaching_suitability,
    teacher_use_status,
    updated_at desc
  );

comment on column public.teacher_books.teacher_jlpt_difficulty is
  'Teacher-facing JLPT difficulty estimate for using this book in lessons.';

comment on column public.teacher_books.teaching_suitability is
  'Teacher-facing suitability rating for lesson use. Separate from workflow status.';
