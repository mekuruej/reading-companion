-- Teacher Notebook V1
--
-- Private teacher-owned notebook storage. These tables do not create student
-- vocabulary rows and do not expose notebook data to learners.

create extension if not exists pgcrypto;

create table if not exists public.teacher_notebook_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null
    check (entry_type in ('special_vocab', 'grammar', 'phrase', 'translation', 'note')),
  title text,
  surface_text text,
  reading text,
  meaning text,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_notebook_entry_contexts (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.teacher_notebook_entries(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  book_id uuid references public.books(id) on delete set null,
  user_book_id uuid references public.user_books(id) on delete set null,
  teacher_book_id uuid references public.teacher_books(id) on delete set null,
  page_number integer,
  percent_location numeric(5,2),
  lesson_date date,
  created_at timestamptz not null default now(),
  constraint teacher_notebook_context_percent_check
    check (percent_location is null or (percent_location >= 0 and percent_location <= 100))
);

create table if not exists public.teacher_notebook_word_lists (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  book_id uuid references public.books(id) on delete set null,
  user_book_id uuid references public.user_books(id) on delete set null,
  teacher_book_id uuid references public.teacher_books(id) on delete set null,
  lesson_date date,
  status text not null default 'active'
    check (status in ('active', 'processed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_notebook_word_drafts (
  id uuid primary key default gen_random_uuid(),
  word_list_id uuid not null references public.teacher_notebook_word_lists(id) on delete cascade,
  surface text not null,
  sort_order integer not null default 0,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists teacher_notebook_entries_teacher_type_idx
  on public.teacher_notebook_entries (teacher_id, entry_type, updated_at desc);

create index if not exists teacher_notebook_entries_teacher_search_idx
  on public.teacher_notebook_entries (teacher_id, lower(coalesce(surface_text, title, '')));

create index if not exists teacher_notebook_contexts_entry_idx
  on public.teacher_notebook_entry_contexts (entry_id, created_at desc);

create index if not exists teacher_notebook_contexts_teacher_book_idx
  on public.teacher_notebook_entry_contexts (teacher_book_id, created_at desc);

create index if not exists teacher_notebook_word_lists_teacher_status_idx
  on public.teacher_notebook_word_lists (teacher_id, status, updated_at desc);

create index if not exists teacher_notebook_word_lists_teacher_book_idx
  on public.teacher_notebook_word_lists (teacher_id, teacher_book_id, status, updated_at desc);

create index if not exists teacher_notebook_word_drafts_list_order_idx
  on public.teacher_notebook_word_drafts (word_list_id, sort_order, created_at);

create or replace function public.set_teacher_notebook_entries_updated_at()
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

drop trigger if exists set_teacher_notebook_entries_updated_at
  on public.teacher_notebook_entries;

create trigger set_teacher_notebook_entries_updated_at
before update on public.teacher_notebook_entries
for each row
execute function public.set_teacher_notebook_entries_updated_at();

create or replace function public.set_teacher_notebook_word_lists_updated_at()
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

drop trigger if exists set_teacher_notebook_word_lists_updated_at
  on public.teacher_notebook_word_lists;

create trigger set_teacher_notebook_word_lists_updated_at
before update on public.teacher_notebook_word_lists
for each row
execute function public.set_teacher_notebook_word_lists_updated_at();

alter table public.teacher_notebook_entries enable row level security;
alter table public.teacher_notebook_entry_contexts enable row level security;
alter table public.teacher_notebook_word_lists enable row level security;
alter table public.teacher_notebook_word_drafts enable row level security;

drop policy if exists "Teachers can read their own notebook entries"
  on public.teacher_notebook_entries;
create policy "Teachers can read their own notebook entries"
  on public.teacher_notebook_entries
  for select
  using (auth.uid() = teacher_id);

drop policy if exists "Teachers can create their own notebook entries"
  on public.teacher_notebook_entries;
create policy "Teachers can create their own notebook entries"
  on public.teacher_notebook_entries
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

drop policy if exists "Teachers can update their own notebook entries"
  on public.teacher_notebook_entries;
create policy "Teachers can update their own notebook entries"
  on public.teacher_notebook_entries
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists "Teachers can delete their own notebook entries"
  on public.teacher_notebook_entries;
create policy "Teachers can delete their own notebook entries"
  on public.teacher_notebook_entries
  for delete
  using (auth.uid() = teacher_id);

drop policy if exists "Teachers can read contexts for their notebook entries"
  on public.teacher_notebook_entry_contexts;
create policy "Teachers can read contexts for their notebook entries"
  on public.teacher_notebook_entry_contexts
  for select
  using (
    exists (
      select 1
      from public.teacher_notebook_entries e
      where e.id = entry_id
        and e.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can create contexts for their notebook entries"
  on public.teacher_notebook_entry_contexts;
create policy "Teachers can create contexts for their notebook entries"
  on public.teacher_notebook_entry_contexts
  for insert
  with check (
    exists (
      select 1
      from public.teacher_notebook_entries e
      where e.id = entry_id
        and e.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can update contexts for their notebook entries"
  on public.teacher_notebook_entry_contexts;
create policy "Teachers can update contexts for their notebook entries"
  on public.teacher_notebook_entry_contexts
  for update
  using (
    exists (
      select 1
      from public.teacher_notebook_entries e
      where e.id = entry_id
        and e.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.teacher_notebook_entries e
      where e.id = entry_id
        and e.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can delete contexts for their notebook entries"
  on public.teacher_notebook_entry_contexts;
create policy "Teachers can delete contexts for their notebook entries"
  on public.teacher_notebook_entry_contexts
  for delete
  using (
    exists (
      select 1
      from public.teacher_notebook_entries e
      where e.id = entry_id
        and e.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can read their own notebook word lists"
  on public.teacher_notebook_word_lists;
create policy "Teachers can read their own notebook word lists"
  on public.teacher_notebook_word_lists
  for select
  using (auth.uid() = teacher_id);

drop policy if exists "Teachers can create their own notebook word lists"
  on public.teacher_notebook_word_lists;
create policy "Teachers can create their own notebook word lists"
  on public.teacher_notebook_word_lists
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

drop policy if exists "Teachers can update their own notebook word lists"
  on public.teacher_notebook_word_lists;
create policy "Teachers can update their own notebook word lists"
  on public.teacher_notebook_word_lists
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists "Teachers can delete their own notebook word lists"
  on public.teacher_notebook_word_lists;
create policy "Teachers can delete their own notebook word lists"
  on public.teacher_notebook_word_lists
  for delete
  using (auth.uid() = teacher_id);

drop policy if exists "Teachers can read word drafts in their notebook word lists"
  on public.teacher_notebook_word_drafts;
create policy "Teachers can read word drafts in their notebook word lists"
  on public.teacher_notebook_word_drafts
  for select
  using (
    exists (
      select 1
      from public.teacher_notebook_word_lists wl
      where wl.id = word_list_id
        and wl.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can create word drafts in their notebook word lists"
  on public.teacher_notebook_word_drafts;
create policy "Teachers can create word drafts in their notebook word lists"
  on public.teacher_notebook_word_drafts
  for insert
  with check (
    exists (
      select 1
      from public.teacher_notebook_word_lists wl
      where wl.id = word_list_id
        and wl.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can update word drafts in their notebook word lists"
  on public.teacher_notebook_word_drafts;
create policy "Teachers can update word drafts in their notebook word lists"
  on public.teacher_notebook_word_drafts
  for update
  using (
    exists (
      select 1
      from public.teacher_notebook_word_lists wl
      where wl.id = word_list_id
        and wl.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.teacher_notebook_word_lists wl
      where wl.id = word_list_id
        and wl.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can delete word drafts in their notebook word lists"
  on public.teacher_notebook_word_drafts;
create policy "Teachers can delete word drafts in their notebook word lists"
  on public.teacher_notebook_word_drafts
  for delete
  using (
    exists (
      select 1
      from public.teacher_notebook_word_lists wl
      where wl.id = word_list_id
        and wl.teacher_id = auth.uid()
    )
  );

comment on table public.teacher_notebook_entries is
  'Private teacher-owned reusable notebook entries. Not visible to students.';

comment on table public.teacher_notebook_entry_contexts is
  'Optional where-used context for teacher notebook entries.';

comment on table public.teacher_notebook_word_lists is
  'Private teacher-owned word-list scratchpads. Drafts are not user_book_words.';

comment on table public.teacher_notebook_word_drafts is
  'Quick-captured teacher notebook word drafts pending copy/Bulk Add processing.';
