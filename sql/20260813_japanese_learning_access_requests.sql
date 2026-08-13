-- Japanese Learning invitation requests for the manual pilot.

create table if not exists public.japanese_learning_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  note text,
  request_source text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_note text,
  constraint japanese_learning_access_requests_status_check
    check (status in ('pending', 'approved', 'declined')),
  constraint japanese_learning_access_requests_source_check
    check (
      request_source is null or
      request_source in ('study_hub', 'book_hub', 'japanese_learning_page')
    )
);

create unique index if not exists japanese_learning_access_requests_one_pending_per_user
  on public.japanese_learning_access_requests(user_id)
  where status = 'pending';

create index if not exists japanese_learning_access_requests_status_requested_at_idx
  on public.japanese_learning_access_requests(status, requested_at desc);

alter table public.japanese_learning_access_requests enable row level security;

drop policy if exists "Users can read their own Japanese Learning requests"
  on public.japanese_learning_access_requests;
create policy "Users can read their own Japanese Learning requests"
  on public.japanese_learning_access_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own pending Japanese Learning requests"
  on public.japanese_learning_access_requests;
create policy "Users can create their own pending Japanese Learning requests"
  on public.japanese_learning_access_requests
  for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

drop policy if exists "Staff can read Japanese Learning requests"
  on public.japanese_learning_access_requests;
create policy "Staff can read Japanese Learning requests"
  on public.japanese_learning_access_requests
  for select
  using (
    exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = auth.uid()
        and (
          reviewer.role in ('teacher', 'super_teacher', 'admin')
          or reviewer.is_super_teacher = true
        )
    )
  );

drop policy if exists "Staff can review Japanese Learning requests"
  on public.japanese_learning_access_requests;
create policy "Staff can review Japanese Learning requests"
  on public.japanese_learning_access_requests
  for update
  using (
    exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = auth.uid()
        and (
          reviewer.role in ('teacher', 'super_teacher', 'admin')
          or reviewer.is_super_teacher = true
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = auth.uid()
        and (
          reviewer.role in ('teacher', 'super_teacher', 'admin')
          or reviewer.is_super_teacher = true
        )
    )
  );

comment on table public.japanese_learning_access_requests is
  'Manual pilot requests for Japanese Learning invitation/trial review.';
