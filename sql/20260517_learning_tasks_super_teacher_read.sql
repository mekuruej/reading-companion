-- Learning Tasks: super teacher read access
--
-- Run this after 20260517_learning_tasks.sql.
-- Super teachers need oversight across learner tasks for testing and support.

drop policy if exists "Super teachers can read all learning tasks"
  on public.learning_tasks;

create policy "Super teachers can read all learning tasks"
  on public.learning_tasks
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'super_teacher'
          or coalesce(p.is_super_teacher, false) = true
        )
    )
  );
