-- Public reader profile details
--
-- Optional public-facing reader metadata. Core account identity stays on
-- public.profiles; this table stores only reader profile details users choose
-- to show.

create table if not exists public.user_public_profile (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  jlpt_level_public text,
  favorite_genres text[] not null default '{}',
  bio text not null default '',
  public_name_choice text not null default 'display_name'
    check (public_name_choice in ('display_name', 'username')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_public_profile_updated_at()
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

drop trigger if exists set_user_public_profile_updated_at
  on public.user_public_profile;

create trigger set_user_public_profile_updated_at
before update on public.user_public_profile
for each row
execute function public.set_user_public_profile_updated_at();

alter table public.user_public_profile enable row level security;

drop policy if exists "Authenticated users can read public reader profiles"
  on public.user_public_profile;
create policy "Authenticated users can read public reader profiles"
  on public.user_public_profile
  for select
  using (auth.uid() is not null);

drop policy if exists "Users can create their own public reader profile"
  on public.user_public_profile;
create policy "Users can create their own public reader profile"
  on public.user_public_profile
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own public reader profile"
  on public.user_public_profile;
create policy "Users can update their own public reader profile"
  on public.user_public_profile
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own public reader profile"
  on public.user_public_profile;
create policy "Users can delete their own public reader profile"
  on public.user_public_profile
  for delete
  using (auth.uid() = user_id);

comment on table public.user_public_profile is
  'Optional public-facing reader profile details controlled by each user.';
