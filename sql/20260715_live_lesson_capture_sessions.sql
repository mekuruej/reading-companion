-- Live Lesson Add Word persistent capture/review sessions.
--
-- Vocabulary rows remain permanent user_book_words rows. These tables only
-- preserve the teacher workflow batch around a temporary capture/review session.

create extension if not exists pgcrypto;

create table if not exists public.live_lesson_capture_sessions (
  id uuid primary key default gen_random_uuid(),

  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  user_book_id uuid not null references public.user_books(id) on delete cascade,

  status text not null default 'capturing'
    check (status in ('capturing', 'reviewing', 'deferred', 'completed', 'cancelled')),

  started_at timestamptz not null default now(),
  ended_adding_at timestamptz,
  review_started_at timestamptz,
  review_deferred_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_lesson_capture_session_words (
  session_id uuid not null
    references public.live_lesson_capture_sessions(id) on delete cascade,
  user_book_word_id uuid not null
    references public.user_book_words(id) on delete cascade,
  position integer not null default 0,
  captured_at timestamptz not null default now(),

  primary key (session_id, user_book_word_id)
);

create index if not exists live_lesson_capture_sessions_teacher_status_idx
  on public.live_lesson_capture_sessions (teacher_id, status, updated_at desc);

create index if not exists live_lesson_capture_sessions_student_book_status_idx
  on public.live_lesson_capture_sessions (student_id, user_book_id, status, updated_at desc);

create index if not exists live_lesson_capture_session_words_session_position_idx
  on public.live_lesson_capture_session_words (session_id, position, captured_at);

create index if not exists live_lesson_capture_session_words_word_idx
  on public.live_lesson_capture_session_words (user_book_word_id);

create or replace function public.set_live_lesson_capture_sessions_updated_at()
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

drop trigger if exists set_live_lesson_capture_sessions_updated_at
  on public.live_lesson_capture_sessions;

create trigger set_live_lesson_capture_sessions_updated_at
before update on public.live_lesson_capture_sessions
for each row
execute function public.set_live_lesson_capture_sessions_updated_at();

alter table public.live_lesson_capture_sessions enable row level security;
alter table public.live_lesson_capture_session_words enable row level security;

drop policy if exists "Teachers can read their own live lesson sessions"
  on public.live_lesson_capture_sessions;
create policy "Teachers can read their own live lesson sessions"
  on public.live_lesson_capture_sessions
  for select
  using (auth.uid() = teacher_id);

drop policy if exists "Teachers can create their own live lesson sessions"
  on public.live_lesson_capture_sessions;
create policy "Teachers can create their own live lesson sessions"
  on public.live_lesson_capture_sessions
  for insert
  with check (auth.uid() = teacher_id);

drop policy if exists "Teachers can update their own live lesson sessions"
  on public.live_lesson_capture_sessions;
create policy "Teachers can update their own live lesson sessions"
  on public.live_lesson_capture_sessions
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists "Teachers can delete their own live lesson sessions"
  on public.live_lesson_capture_sessions;
create policy "Teachers can delete their own live lesson sessions"
  on public.live_lesson_capture_sessions
  for delete
  using (auth.uid() = teacher_id);

drop policy if exists "Teachers can read words in their own live lesson sessions"
  on public.live_lesson_capture_session_words;
create policy "Teachers can read words in their own live lesson sessions"
  on public.live_lesson_capture_session_words
  for select
  using (
    exists (
      select 1
      from public.live_lesson_capture_sessions s
      where s.id = session_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can create words in their own live lesson sessions"
  on public.live_lesson_capture_session_words;
create policy "Teachers can create words in their own live lesson sessions"
  on public.live_lesson_capture_session_words
  for insert
  with check (
    exists (
      select 1
      from public.live_lesson_capture_sessions s
      where s.id = session_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can update words in their own live lesson sessions"
  on public.live_lesson_capture_session_words;
create policy "Teachers can update words in their own live lesson sessions"
  on public.live_lesson_capture_session_words
  for update
  using (
    exists (
      select 1
      from public.live_lesson_capture_sessions s
      where s.id = session_id
        and s.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.live_lesson_capture_sessions s
      where s.id = session_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can delete words in their own live lesson sessions"
  on public.live_lesson_capture_session_words;
create policy "Teachers can delete words in their own live lesson sessions"
  on public.live_lesson_capture_session_words
  for delete
  using (
    exists (
      select 1
      from public.live_lesson_capture_sessions s
      where s.id = session_id
        and s.teacher_id = auth.uid()
    )
  );

comment on table public.live_lesson_capture_sessions is
  'Teacher-scoped Live Lesson Add Word capture/review batches.';

comment on table public.live_lesson_capture_session_words is
  'Ordered association between a Live Lesson capture session and permanent user_book_words rows.';
