-- Library Study gate progress
--
-- Run this in Supabase SQL editor.
-- This table stores knowledge-gate progress for the global Library Study system.
-- Red/orange/yellow still come from real user_book_words encounters.
-- Green/blue/grey/purple come from this table.

create extension if not exists pgcrypto;

create table if not exists public.user_library_word_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Normalized shared word identity used by Library Study.
  -- First version uses surface + reading, for example: 読む||よむ
  study_identity_key text not null,
  surface text,
  reading text,

  -- Reserved for definition-aware gates later.
  -- Keep blank for the first version so one word identity has one progress row.
  definition_key text not null default '',

  reading_gate_status text not null default 'not_started'
    check (reading_gate_status in ('not_started', 'passed', 'failed')),
  meaning_gate_status text not null default 'not_started'
    check (meaning_gate_status in ('not_started', 'passed', 'failed')),

  held_before_reading_gate boolean not null default false,
  held_before_meaning_gate boolean not null default false,
  mastered boolean not null default false,

  reading_gate_attempts integer not null default 0 check (reading_gate_attempts >= 0),
  meaning_gate_attempts integer not null default 0 check (meaning_gate_attempts >= 0),

  reading_gate_passed_at timestamptz,
  reading_gate_failed_at timestamptz,
  meaning_gate_passed_at timestamptz,
  meaning_gate_failed_at timestamptz,
  mastered_at timestamptz,
  last_studied_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, study_identity_key, definition_key)
);

create index if not exists user_library_word_progress_user_id_idx
  on public.user_library_word_progress (user_id);

create index if not exists user_library_word_progress_study_identity_key_idx
  on public.user_library_word_progress (study_identity_key);

create or replace function public.set_user_library_word_progress_updated_at()
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

drop trigger if exists set_user_library_word_progress_updated_at
  on public.user_library_word_progress;

create trigger set_user_library_word_progress_updated_at
before update on public.user_library_word_progress
for each row
execute function public.set_user_library_word_progress_updated_at();

alter table public.user_library_word_progress enable row level security;

drop policy if exists "Users can read their own library word progress"
  on public.user_library_word_progress;
create policy "Users can read their own library word progress"
  on public.user_library_word_progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own library word progress"
  on public.user_library_word_progress;
create policy "Users can insert their own library word progress"
  on public.user_library_word_progress
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own library word progress"
  on public.user_library_word_progress;
create policy "Users can update their own library word progress"
  on public.user_library_word_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own library word progress"
  on public.user_library_word_progress;
create policy "Users can delete their own library word progress"
  on public.user_library_word_progress
  for delete
  using (auth.uid() = user_id);
