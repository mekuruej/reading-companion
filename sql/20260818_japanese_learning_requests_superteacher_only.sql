-- Restrict Japanese Learning invitation request review queues to super-teachers/admins.
-- Users can still create and read their own requests through the existing policies.

drop policy if exists "Staff can read Japanese Learning requests"
  on public.japanese_learning_access_requests;
create policy "Staff can read Japanese Learning requests"
  on public.japanese_learning_access_requests
  for select
  using (
    exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = auth.uid()
        and (
          reviewer.role in ('super_teacher', 'admin')
          or reviewer.is_super_teacher = true
        )
    )
  );

drop policy if exists "Staff can review Japanese Learning requests"
  on public.japanese_learning_access_requests;
create policy "Staff can review Japanese Learning requests"
  on public.japanese_learning_access_requests
  for update
  using (
    exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = auth.uid()
        and (
          reviewer.role in ('super_teacher', 'admin')
          or reviewer.is_super_teacher = true
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = auth.uid()
        and (
          reviewer.role in ('super_teacher', 'admin')
          or reviewer.is_super_teacher = true
        )
    )
  );
