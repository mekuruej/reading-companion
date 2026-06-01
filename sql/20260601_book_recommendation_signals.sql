-- Book Recommendation Signals
--
-- Run this in Supabase SQL editor.
-- Public/discovery-safe snapshots of reader-fit ratings.
-- Do not store private reviews, notes, saved words, reading sessions, or vocabulary here.

create extension if not exists pgcrypto;

create table if not exists public.book_recommendation_signals (
  id uuid primary key default gen_random_uuid(),

  book_id uuid not null references public.books(id) on delete cascade,
  user_book_id uuid not null references public.user_books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  reader_level text,
  book_type text,
  difficulty_rating numeric(3, 2),
  entertainment_rating numeric(3, 2),
  reader_advice text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint book_recommendation_signals_rating_range
    check (
      (difficulty_rating is null or (difficulty_rating >= 1 and difficulty_rating <= 5))
      and
      (entertainment_rating is null or (entertainment_rating >= 1 and entertainment_rating <= 5))
    ),

  constraint book_recommendation_signals_reader_advice_length
    check (reader_advice is null or char_length(reader_advice) <= 160),

  constraint book_recommendation_signals_user_book_unique
    unique (user_book_id)
);

create index if not exists book_recommendation_signals_active_book_idx
  on public.book_recommendation_signals (is_active, book_id);

create index if not exists book_recommendation_signals_active_filters_idx
  on public.book_recommendation_signals (
    is_active,
    reader_level,
    book_type,
    difficulty_rating,
    entertainment_rating
  );

create index if not exists book_recommendation_signals_user_idx
  on public.book_recommendation_signals (user_id);

create or replace function public.set_book_recommendation_signals_updated_at()
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

drop trigger if exists set_book_recommendation_signals_updated_at
  on public.book_recommendation_signals;

create trigger set_book_recommendation_signals_updated_at
before update on public.book_recommendation_signals
for each row
execute function public.set_book_recommendation_signals_updated_at();

alter table public.book_recommendation_signals enable row level security;

drop policy if exists "Anyone can read active book recommendation signals"
  on public.book_recommendation_signals;

create policy "Anyone can read active book recommendation signals"
  on public.book_recommendation_signals
  for select
  using (is_active = true);

drop policy if exists "Readers can manage their own recommendation signals"
  on public.book_recommendation_signals;

create policy "Readers can manage their own recommendation signals"
  on public.book_recommendation_signals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Super teachers can manage all recommendation signals"
  on public.book_recommendation_signals;

create policy "Super teachers can manage all recommendation signals"
  on public.book_recommendation_signals
  for all
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

comment on table public.book_recommendation_signals is
  'Public/discovery-safe snapshots of anonymous reader recommendation signals.';

comment on column public.book_recommendation_signals.reader_advice is
  'Short anonymous advice for future readers. Do not store private review text here.';

