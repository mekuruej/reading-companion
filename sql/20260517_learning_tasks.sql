-- Learning Tasks
--
-- Run this in Supabase SQL editor.
-- Teacher-guided study tasks are separate from assigning books.
-- A task may point at a learner's user_book_id, but global tasks can leave it null.

create extension if not exists pgcrypto;

create table if not exists public.learning_tasks (
  id uuid primary key default gen_random_uuid(),

  created_by uuid not null references auth.users(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  user_book_id uuid references public.user_books(id) on delete set null,

  task_type text not null
    check (
      task_type in (
        'reread_pages',
        'review_book_words',
        'review_recent_words',
        'kanji_reading_practice'
      )
    ),

  title text not null,
  instructions text,
  task_payload jsonb not null default '{}'::jsonb,

  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'completed', 'cancelled')),

  due_on date,
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_tasks_learner_status_due_idx
  on public.learning_tasks (learner_id, status, due_on);

create index if not exists learning_tasks_created_by_status_idx
  on public.learning_tasks (created_by, status);

create index if not exists learning_tasks_user_book_id_idx
  on public.learning_tasks (user_book_id);

create or replace function public.set_learning_tasks_updated_at()
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

drop trigger if exists set_learning_tasks_updated_at
  on public.learning_tasks;

create trigger set_learning_tasks_updated_at
before update on public.learning_tasks
for each row
execute function public.set_learning_tasks_updated_at();

alter table public.learning_tasks enable row level security;

drop policy if exists "Learners can read their own learning tasks"
  on public.learning_tasks;
create policy "Learners can read their own learning tasks"
  on public.learning_tasks
  for select
  using (auth.uid() = learner_id);

drop policy if exists "Task creators can read their own learning tasks"
  on public.learning_tasks;
create policy "Task creators can read their own learning tasks"
  on public.learning_tasks
  for select
  using (auth.uid() = created_by);

drop policy if exists "Teachers can create learning tasks"
  on public.learning_tasks;
create policy "Teachers can create learning tasks"
  on public.learning_tasks
  for insert
  with check (
    auth.uid() = created_by
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

drop policy if exists "Task creators can update their own learning tasks"
  on public.learning_tasks;
create policy "Task creators can update their own learning tasks"
  on public.learning_tasks
  for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "Task creators can delete their own learning tasks"
  on public.learning_tasks;
create policy "Task creators can delete their own learning tasks"
  on public.learning_tasks
  for delete
  using (auth.uid() = created_by);
