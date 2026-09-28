-- Additive migration. Existing assessments, journals and links stay intact.
begin;
create table if not exists public.book_reading_experiences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  person_id uuid references public.profiles(id) on delete set null,
  experienced_on date not null,
  context text check (context in ('Private lesson', 'Guided group', 'Book club', 'Reading together', 'Other')),
  notes text not null check (char_length(btrim(notes)) > 0 and char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Intentionally no uniqueness constraint on teacher/book/person: repeat visits are separate records.
create index if not exists book_reading_experiences_teacher_book_date_idx
  on public.book_reading_experiences (teacher_id, book_id, experienced_on desc, created_at desc, id);
create index if not exists book_reading_experiences_person_idx
  on public.book_reading_experiences (teacher_id, person_id);

alter table public.book_reading_experiences enable row level security;
revoke all on public.book_reading_experiences from anon;
grant select, insert, update, delete on public.book_reading_experiences to authenticated;
drop policy if exists own_reading_experiences on public.book_reading_experiences;
create policy own_reading_experiences on public.book_reading_experiences
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
comment on table public.book_reading_experiences is
  'Private repeatable experiences keyed to canonical books and people, independent of teacher_students and teacher_books. Overall assessments remain in teacher_books keyed by teacher_id/book_id.';
notify pgrst, 'reload schema';
commit;
