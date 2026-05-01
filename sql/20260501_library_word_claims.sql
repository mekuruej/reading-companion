-- Library Word Sky claims
--
-- Run this in Supabase SQL editor after the summary-table SQL.
-- These rows are learner claims, not book encounters.

create extension if not exists pgcrypto;

create table if not exists public.user_library_word_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  study_identity_key text not null,
  surface text not null,
  reading text,
  meaning text,

  -- First version: Word Sky only means "I can read it."
  claimed_color text not null default 'green'
    check (claimed_color = 'green'),
  source text not null default 'word_sky'
    check (source in ('word_sky')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, study_identity_key)
);

alter table public.user_library_word_claims
  alter column claimed_color set default 'green';

do $$
begin
  alter table public.user_library_word_claims
    drop constraint if exists user_library_word_claims_claimed_color_check;

  alter table public.user_library_word_claims
    add constraint user_library_word_claims_claimed_color_check
    check (claimed_color = 'green');
end;
$$;

create index if not exists user_library_word_claims_user_id_idx
  on public.user_library_word_claims (user_id);

alter table public.user_library_word_claims enable row level security;

drop policy if exists "Users can read their own library word claims"
  on public.user_library_word_claims;
create policy "Users can read their own library word claims"
  on public.user_library_word_claims
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own library word claims"
  on public.user_library_word_claims;
create policy "Users can insert their own library word claims"
  on public.user_library_word_claims
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own library word claims"
  on public.user_library_word_claims;
create policy "Users can update their own library word claims"
  on public.user_library_word_claims
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own library word claims"
  on public.user_library_word_claims;
create policy "Users can delete their own library word claims"
  on public.user_library_word_claims
  for delete
  using (auth.uid() = user_id);

create or replace function public.get_word_sky_pool(p_limit integer default 140)
returns table (
  study_identity_key text,
  surface text,
  reading text,
  meaning text,
  jlpt text,
  total_encounter_count integer,
  book_count integer
)
language sql
security definer
set search_path = public
as $word_sky_pool$
  select
    s.study_identity_key,
    s.surface,
    s.reading,
    s.meaning,
    s.jlpt,
    s.total_encounter_count,
    s.book_count
  from public.user_library_word_summaries s
  where nullif(btrim(coalesce(s.surface, '')), '') is not null
    and nullif(btrim(coalesce(s.reading, '')), '') is not null
    and nullif(btrim(coalesce(s.meaning, '')), '') is not null
  order by random()
  limit greatest(1, least(coalesce(p_limit, 140), 300));
$word_sky_pool$;

grant execute on function public.get_word_sky_pool(integer) to authenticated;
