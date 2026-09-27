-- Apply before deploying Teaching Reflection. Existing reader reflections are unchanged.
begin;
create table if not exists public.book_teaching_reflections (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  student_level text not null check (student_level ~ '^Level ([1-9]|10)$'),
  student_difficulty smallint not null check (student_difficulty between 1 and 5),
  teaching_difficulty smallint not null check (teaching_difficulty between 1 and 5),
  difficulties text not null default '' check (char_length(difficulties) <= 2000),
  comments text not null default '' check (char_length(comments) <= 2000),
  primary key (teacher_id, book_id, student_level)
);
comment on table public.book_teaching_reflections is 'Teaching feedback by MEKURU student level. One editable contribution per teacher, catalog book and level. No student identifiers. Future shared summaries must not expose teacher IDs.';
alter table public.book_teaching_reflections enable row level security;
revoke all on public.book_teaching_reflections from anon;
grant select, insert, update, delete on public.book_teaching_reflections to authenticated;
drop policy if exists own_teaching_reflections on public.book_teaching_reflections;
create policy own_teaching_reflections on public.book_teaching_reflections
  for all to authenticated
  using (
    teacher_id = auth.uid() and exists (
      select 1 from public.profiles p where p.id = auth.uid()
      and (p.role in ('teacher', 'admin', 'super_teacher') or coalesce(p.is_super_teacher, false))
    )
  )
  with check (
    teacher_id = auth.uid() and exists (
      select 1 from public.profiles p where p.id = auth.uid()
      and (p.role in ('teacher', 'admin', 'super_teacher') or coalesce(p.is_super_teacher, false))
    )
  );
notify pgrst, 'reload schema';
commit;
