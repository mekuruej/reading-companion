-- Learning task completion by learners
--
-- Teachers create learning_tasks, but learners need to be able to mark their
-- own assigned tasks completed from their Library page.

drop policy if exists "Learners can complete their own learning tasks"
  on public.learning_tasks;

create policy "Learners can complete their own learning tasks"
  on public.learning_tasks
  for update
  using (
    auth.uid() = learner_id
    and status = 'assigned'
    and cancelled_at is null
  )
  with check (
    auth.uid() = learner_id
    and status = 'completed'
    and completed_at is not null
    and cancelled_at is null
  );
