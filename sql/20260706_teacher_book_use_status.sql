alter table public.teacher_books
  add column if not exists teacher_use_status text not null default 'want_to_test',
  add column if not exists teacher_use_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_books_teacher_use_status_check'
      and conrelid = 'public.teacher_books'::regclass
  ) then
    alter table public.teacher_books
      add constraint teacher_books_teacher_use_status_check
      check (
        teacher_use_status in (
          'want_to_test',
          'testing',
          'currently_using',
          'approved_for_lesson',
          'use_with_caution',
          'do_not_use'
        )
      );
  end if;
end $$;

create index if not exists teacher_books_teacher_use_status_idx
  on public.teacher_books (teacher_id, teacher_use_status, updated_at desc);

drop policy if exists "Teachers can update their teacher library books"
  on public.teacher_books;
create policy "Teachers can update their teacher library books"
  on public.teacher_books
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
