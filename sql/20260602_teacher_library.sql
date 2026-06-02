-- Teacher Library
--
-- Teacher-only lesson prep data. This is intentionally separate from user_books,
-- user_book_words, reading sessions, stats, and learner study queues.

create extension if not exists pgcrypto;

create table if not exists public.teacher_books (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_books_teacher_book_unique unique (teacher_id, book_id)
);

create table if not exists public.teacher_book_items (
  id uuid primary key default gen_random_uuid(),
  teacher_book_id uuid not null references public.teacher_books(id) on delete cascade,
  item_type text not null default 'word'
    check (item_type in ('word', 'phrase', 'grammar', 'sentence', 'note')),
  surface_text text,
  reading text,
  meaning text,
  vocabulary_cache_id bigint references public.vocabulary_cache(id) on delete set null,
  page_number integer,
  chapter_number integer,
  chapter_name text,
  teacher_note text,
  explanation text,
  translation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_book_items
  add column if not exists vocabulary_cache_id bigint references public.vocabulary_cache(id) on delete set null,
  add column if not exists chapter_number integer;

create index if not exists teacher_books_teacher_idx
  on public.teacher_books (teacher_id, created_at desc);

create index if not exists teacher_book_items_teacher_book_page_idx
  on public.teacher_book_items (teacher_book_id, chapter_number, page_number, created_at);

create or replace function public.set_teacher_books_updated_at()
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

drop trigger if exists set_teacher_books_updated_at
  on public.teacher_books;

create trigger set_teacher_books_updated_at
before update on public.teacher_books
for each row
execute function public.set_teacher_books_updated_at();

create or replace function public.set_teacher_book_items_updated_at()
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

drop trigger if exists set_teacher_book_items_updated_at
  on public.teacher_book_items;

create trigger set_teacher_book_items_updated_at
before update on public.teacher_book_items
for each row
execute function public.set_teacher_book_items_updated_at();

alter table public.teacher_books enable row level security;
alter table public.teacher_book_items enable row level security;

drop policy if exists "Teachers can read their teacher library books"
  on public.teacher_books;
create policy "Teachers can read their teacher library books"
  on public.teacher_books
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

drop policy if exists "Teachers can create their teacher library books"
  on public.teacher_books;
create policy "Teachers can create their teacher library books"
  on public.teacher_books
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

drop policy if exists "Teachers can update their teacher library books"
  on public.teacher_books;
create policy "Teachers can update their teacher library books"
  on public.teacher_books
  for update
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

drop policy if exists "Teachers can delete their teacher library books"
  on public.teacher_books;
create policy "Teachers can delete their teacher library books"
  on public.teacher_books
  for delete
  using (auth.uid() = teacher_id);

drop policy if exists "Teachers can read their teacher book items"
  on public.teacher_book_items;
create policy "Teachers can read their teacher book items"
  on public.teacher_book_items
  for select
  using (
    exists (
      select 1
      from public.teacher_books tb
      where tb.id = teacher_book_id
        and (
          tb.teacher_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and (p.role = 'super_teacher' or coalesce(p.is_super_teacher, false) = true)
          )
        )
    )
  );

drop policy if exists "Teachers can create their teacher book items"
  on public.teacher_book_items;
create policy "Teachers can create their teacher book items"
  on public.teacher_book_items
  for insert
  with check (
    exists (
      select 1
      from public.teacher_books tb
      where tb.id = teacher_book_id
        and tb.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can update their teacher book items"
  on public.teacher_book_items;
create policy "Teachers can update their teacher book items"
  on public.teacher_book_items
  for update
  using (
    exists (
      select 1
      from public.teacher_books tb
      where tb.id = teacher_book_id
        and tb.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.teacher_books tb
      where tb.id = teacher_book_id
        and tb.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers can delete their teacher book items"
  on public.teacher_book_items;
create policy "Teachers can delete their teacher book items"
  on public.teacher_book_items
  for delete
  using (
    exists (
      select 1
      from public.teacher_books tb
      where tb.id = teacher_book_id
        and tb.teacher_id = auth.uid()
    )
  );

comment on table public.teacher_books is
  'Teacher-only lesson prep shelf. Does not affect learner libraries or reading stats.';

comment on table public.teacher_book_items is
  'Teacher-only prep items for follow-along lessons. Does not write to user_book_words.';
