create extension if not exists pgcrypto;

create table if not exists public.teacher_student_lesson_books (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  user_book_id uuid not null references public.user_books(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'removed')),
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint teacher_student_lesson_books_unique
    unique (teacher_id, student_id, user_book_id)
);

create index if not exists teacher_student_lesson_books_teacher_student_status_idx
  on public.teacher_student_lesson_books (teacher_id, student_id, status, updated_at desc);

create index if not exists teacher_student_lesson_books_user_book_idx
  on public.teacher_student_lesson_books (user_book_id);

create or replace function public.validate_teacher_student_lesson_book()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.user_books ub
    where ub.id = new.user_book_id
      and ub.user_id = new.student_id
  ) then
    raise exception 'Lesson book user_book_id must belong to student_id.';
  end if;

  if new.status = 'active' then
    new.removed_at = null;
    if new.added_at is null then
      new.added_at = now();
    end if;
  elsif new.status = 'removed' and new.removed_at is null then
    new.removed_at = now();
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists validate_teacher_student_lesson_book
  on public.teacher_student_lesson_books;

create trigger validate_teacher_student_lesson_book
before insert or update on public.teacher_student_lesson_books
for each row
execute function public.validate_teacher_student_lesson_book();

alter table public.teacher_student_lesson_books enable row level security;

drop policy if exists "Teachers can read their student lesson books"
  on public.teacher_student_lesson_books;
create policy "Teachers can read their student lesson books"
  on public.teacher_student_lesson_books
  for select
  using (
    auth.uid() = teacher_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'super_teacher' or coalesce(p.is_super_teacher, false) = true)
    )
  );

drop policy if exists "Teachers can create their student lesson books"
  on public.teacher_student_lesson_books;
create policy "Teachers can create their student lesson books"
  on public.teacher_student_lesson_books
  for insert
  with check (
    auth.uid() = teacher_id
    and (
      exists (
        select 1
        from public.teacher_students ts
        where ts.teacher_id = auth.uid()
          and ts.student_id = student_id
          and ts.archived_at is null
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and (p.role = 'super_teacher' or coalesce(p.is_super_teacher, false) = true)
      )
    )
    and exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and ub.user_id = student_id
    )
  );

drop policy if exists "Teachers can update their student lesson books"
  on public.teacher_student_lesson_books;
create policy "Teachers can update their student lesson books"
  on public.teacher_student_lesson_books
  for update
  using (
    auth.uid() = teacher_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'super_teacher' or coalesce(p.is_super_teacher, false) = true)
    )
  )
  with check (
    auth.uid() = teacher_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'super_teacher' or coalesce(p.is_super_teacher, false) = true)
    )
  );

comment on table public.teacher_student_lesson_books is
  'Teacher workflow metadata for student-owned books currently active in one teacher/student workspace.';
