-- Archived teacher/student relationships are historical records and must not
-- authorize private learner reads.

begin;

drop policy if exists "Readers and their teachers can read detective entries"
  on public.user_book_detective_entries;
create policy "Readers and their teachers can read detective entries"
  on public.user_book_detective_entries
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.teacher_students ts
      where ts.teacher_id = auth.uid()
        and ts.student_id = user_id
        and ts.archived_at is null
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.role in ('admin', 'super_teacher')
          or coalesce(p.is_super_teacher, false) = true
        )
    )
  );

drop policy if exists "Readers and their teachers can read setting items"
  on public.user_book_setting_items;
create policy "Readers and their teachers can read setting items"
  on public.user_book_setting_items
  for select
  using (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and (
          ub.user_id = auth.uid()
          or exists (
            select 1
            from public.teacher_students ts
            where ts.teacher_id = auth.uid()
              and ts.student_id = ub.user_id
              and ts.archived_at is null
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and (
                p.role in ('admin', 'super_teacher')
                or coalesce(p.is_super_teacher, false) = true
              )
          )
        )
    )
  );

drop policy if exists "Readers and their teachers can read cultural items"
  on public.user_book_cultural_items;
create policy "Readers and their teachers can read cultural items"
  on public.user_book_cultural_items
  for select
  using (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and (
          ub.user_id = auth.uid()
          or exists (
            select 1
            from public.teacher_students ts
            where ts.teacher_id = auth.uid()
              and ts.student_id = ub.user_id
              and ts.archived_at is null
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and (
                p.role in ('admin', 'super_teacher')
                or coalesce(p.is_super_teacher, false) = true
              )
          )
        )
    )
  );

drop policy if exists "Readers and their teachers can read book reviews"
  on public.user_book_reviews;
create policy "Readers and their teachers can read book reviews"
  on public.user_book_reviews
  for select
  using (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and (
          ub.user_id = auth.uid()
          or exists (
            select 1
            from public.teacher_students ts
            where ts.teacher_id = auth.uid()
              and ts.student_id = ub.user_id
              and ts.archived_at is null
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and (
                p.role in ('admin', 'super_teacher')
                or coalesce(p.is_super_teacher, false) = true
              )
          )
        )
    )
  );

commit;
