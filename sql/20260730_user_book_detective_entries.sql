-- Reading Journal Detective Entries
--
-- Detective entries are reader-owned notes attached to one user book.
-- They support the active "what do I know / suspect / wonder?" journal flow.

create extension if not exists pgcrypto;

create table if not exists public.user_book_detective_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_book_id uuid not null references public.user_books(id) on delete cascade,
  title text,
  chapter_label text,
  chapter_number integer,
  page_number integer,
  certain_text text,
  likely_text text,
  possible_text text,
  unknown_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_book_detective_entries_has_content check (
    nullif(btrim(coalesce(certain_text, '')), '') is not null
    or nullif(btrim(coalesce(likely_text, '')), '') is not null
    or nullif(btrim(coalesce(possible_text, '')), '') is not null
    or nullif(btrim(coalesce(unknown_text, '')), '') is not null
  ),
  constraint user_book_detective_entries_positive_chapter check (
    chapter_number is null or chapter_number >= 1
  ),
  constraint user_book_detective_entries_positive_page check (
    page_number is null or page_number >= 1
  )
);

create index if not exists user_book_detective_entries_user_book_idx
  on public.user_book_detective_entries (user_book_id, sort_order, created_at desc);

create index if not exists user_book_detective_entries_user_idx
  on public.user_book_detective_entries (user_id, created_at desc);

create or replace function public.set_user_book_detective_entries_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_book_detective_entries_updated_at
  on public.user_book_detective_entries;

create trigger set_user_book_detective_entries_updated_at
before update on public.user_book_detective_entries
for each row
execute function public.set_user_book_detective_entries_updated_at();

alter table public.user_book_detective_entries enable row level security;

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

drop policy if exists "Readers and their teachers can create detective entries"
  on public.user_book_detective_entries;
create policy "Readers and their teachers can create detective entries"
  on public.user_book_detective_entries
  for insert
  with check (
    user_id = (
      select ub.user_id
      from public.user_books ub
      where ub.id = user_book_id
    )
    and (
      auth.uid() = user_id
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
  );

drop policy if exists "Readers and their teachers can update detective entries"
  on public.user_book_detective_entries;
create policy "Readers and their teachers can update detective entries"
  on public.user_book_detective_entries
  for update
  using (
    auth.uid() = user_id
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
  with check (
    user_id = (
      select ub.user_id
      from public.user_books ub
      where ub.id = user_book_id
    )
    and (
      auth.uid() = user_id
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
  );

drop policy if exists "Readers and their teachers can delete detective entries"
  on public.user_book_detective_entries;
create policy "Readers and their teachers can delete detective entries"
  on public.user_book_detective_entries
  for delete
  using (
    auth.uid() = user_id
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

comment on table public.user_book_detective_entries is
  'Reader-owned Reading Journal detective notes attached to a user book.';
