-- Allow super teachers to see and resolve reader book requests in Needs Attention.
--
-- Reader inserts may already be covered by existing live policies. This migration
-- only adds the teacher-side access the app expects for request queues.

drop policy if exists "Super teachers can read all book requests"
  on public.book_requests;
create policy "Super teachers can read all book requests"
  on public.book_requests
  for select
  to authenticated
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

drop policy if exists "Super teachers can update book requests"
  on public.book_requests;
create policy "Super teachers can update book requests"
  on public.book_requests
  for update
  to authenticated
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
  )
  with check (
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
