-- Teacher Book Prep Shelf
--
-- A prep item is not learner-visible. It is a teacher planning row that can later
-- be turned into a learner's user_books row when the support is ready.

create extension if not exists pgcrypto;

create table if not exists public.teacher_book_prep_items (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  learner_id uuid references auth.users(id) on delete set null,
  book_id uuid not null references public.books(id) on delete cascade,
  prep_user_book_id uuid references public.user_books(id) on delete set null,
  status text not null default 'prepping'
    check (status in ('prepping', 'ready', 'added_to_library', 'cancelled')),
  intended_user_book_status text not null default 'reading',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_book_prep_items
add column if not exists intended_user_book_status text not null default 'reading';

create index if not exists teacher_book_prep_items_teacher_status_idx
  on public.teacher_book_prep_items (teacher_id, status, created_at desc);

create index if not exists teacher_book_prep_items_learner_idx
  on public.teacher_book_prep_items (learner_id);

create unique index if not exists teacher_book_prep_items_active_unique_idx
  on public.teacher_book_prep_items (teacher_id, learner_id, book_id)
  where status in ('prepping', 'ready');

create or replace function public.set_teacher_book_prep_items_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_teacher_book_prep_items_updated_at
  on public.teacher_book_prep_items;

create trigger set_teacher_book_prep_items_updated_at
before update on public.teacher_book_prep_items
for each row
execute function public.set_teacher_book_prep_items_updated_at();

alter table public.teacher_book_prep_items enable row level security;

drop policy if exists "Teachers can read their own prep items"
  on public.teacher_book_prep_items;
create policy "Teachers can read their own prep items"
  on public.teacher_book_prep_items
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

drop policy if exists "Teachers can create their own prep items"
  on public.teacher_book_prep_items;
create policy "Teachers can create their own prep items"
  on public.teacher_book_prep_items
  for insert
  with check (
    auth.uid() = teacher_id
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.role in ('teacher', 'super_teacher')
          or coalesce(p.is_super_teacher, false) = true
        )
    )
  );

drop policy if exists "Teachers can update their own prep items"
  on public.teacher_book_prep_items;
create policy "Teachers can update their own prep items"
  on public.teacher_book_prep_items
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists "Teachers can delete their own prep items"
  on public.teacher_book_prep_items;
create policy "Teachers can delete their own prep items"
  on public.teacher_book_prep_items
  for delete
  using (auth.uid() = teacher_id);
