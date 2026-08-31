-- Teacher context vocabulary and journal scaffolding
--
-- This migration adds explicit teacher-owned teaching vocabulary without
-- creating hidden user_books rows, and lets Teacher Notebook distinguish shared
-- Book Journal entries from private Teaching Notes.

create extension if not exists pgcrypto;

create table if not exists public.teacher_book_vocabulary (
  id uuid primary key default gen_random_uuid(),
  teacher_book_id uuid not null references public.teacher_books(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  linked_user_book_word_id uuid references public.user_book_words(id) on delete set null,
  source_teacher_book_item_id uuid references public.teacher_book_items(id) on delete set null,
  vocabulary_cache_id bigint references public.vocabulary_cache(id) on delete set null,
  surface text not null,
  reading text,
  meaning text,
  meaning_choices jsonb,
  meaning_choice_index integer,
  page_number integer,
  page_order integer,
  chapter_number integer,
  chapter_name text,
  origin_my_library boolean not null default false,
  origin_teaching boolean not null default true,
  hidden_from_my_library boolean not null default false,
  hidden_from_teaching boolean not null default false,
  included_in_follow_along boolean not null default false,
  follow_along_order integer,
  follow_along_support_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_book_vocabulary_has_origin
    check (origin_my_library or origin_teaching),
  constraint teacher_book_vocabulary_meaning_choice_index_check
    check (meaning_choice_index is null or meaning_choice_index >= 0)
);

create unique index if not exists teacher_book_vocabulary_linked_word_uidx
  on public.teacher_book_vocabulary (linked_user_book_word_id)
  where linked_user_book_word_id is not null;

create unique index if not exists teacher_book_vocabulary_teacher_surface_uidx
  on public.teacher_book_vocabulary (
    teacher_book_id,
    lower(trim(surface)),
    lower(trim(coalesce(reading, ''))),
    coalesce(vocabulary_cache_id, -1)
  )
  where linked_user_book_word_id is null;

create index if not exists teacher_book_vocabulary_teacher_book_idx
  on public.teacher_book_vocabulary (teacher_book_id, hidden_from_teaching, created_at desc);

create index if not exists teacher_book_vocabulary_follow_along_idx
  on public.teacher_book_vocabulary (
    teacher_book_id,
    included_in_follow_along,
    follow_along_order,
    page_number,
    page_order
  );

create or replace function public.set_teacher_book_vocabulary_updated_at()
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

drop trigger if exists set_teacher_book_vocabulary_updated_at
  on public.teacher_book_vocabulary;

create trigger set_teacher_book_vocabulary_updated_at
before update on public.teacher_book_vocabulary
for each row
execute function public.set_teacher_book_vocabulary_updated_at();

create or replace function public.validate_teacher_book_vocabulary_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  owner_book_id uuid;
begin
  select teacher_id, book_id
    into owner_id, owner_book_id
  from public.teacher_books
  where id = new.teacher_book_id;

  if owner_id is null then
    raise exception 'teacher_book_vocabulary.teacher_book_id must reference an existing teacher_book';
  end if;

  new.teacher_id := owner_id;
  new.book_id := owner_book_id;
  new.surface := nullif(trim(new.surface), '');

  if new.surface is null then
    raise exception 'teacher_book_vocabulary.surface is required';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_teacher_book_vocabulary_owner
  on public.teacher_book_vocabulary;

create trigger validate_teacher_book_vocabulary_owner
before insert or update on public.teacher_book_vocabulary
for each row
execute function public.validate_teacher_book_vocabulary_owner();

alter table public.teacher_book_vocabulary enable row level security;

drop policy if exists "Teachers can read their own teacher book vocabulary"
  on public.teacher_book_vocabulary;
create policy "Teachers can read their own teacher book vocabulary"
  on public.teacher_book_vocabulary
  for select
  using (
    teacher_id = auth.uid()
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

drop policy if exists "Teachers can create their own teacher book vocabulary"
  on public.teacher_book_vocabulary;
create policy "Teachers can create their own teacher book vocabulary"
  on public.teacher_book_vocabulary
  for insert
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.role in ('teacher', 'admin', 'super_teacher')
          or coalesce(p.is_super_teacher, false) = true
        )
    )
  );

drop policy if exists "Teachers can update their own teacher book vocabulary"
  on public.teacher_book_vocabulary;
create policy "Teachers can update their own teacher book vocabulary"
  on public.teacher_book_vocabulary
  for update
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "Teachers can delete their own teacher book vocabulary"
  on public.teacher_book_vocabulary;
create policy "Teachers can delete their own teacher book vocabulary"
  on public.teacher_book_vocabulary
  for delete
  using (teacher_id = auth.uid());

alter table public.teacher_notebook_entries
  add column if not exists journal_visibility text not null default 'teaching_private';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'teacher_notebook_entries_entry_type_check'
      and conrelid = 'public.teacher_notebook_entries'::regclass
  ) then
    alter table public.teacher_notebook_entries
      drop constraint teacher_notebook_entries_entry_type_check;
  end if;

  alter table public.teacher_notebook_entries
    add constraint teacher_notebook_entries_entry_type_check
    check (
      entry_type in (
        'book_character',
        'book_plot',
        'book_quote',
        'book_note',
        'special_vocab',
        'grammar',
        'phrase',
        'translation',
        'note'
      )
    );

  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_notebook_entries_journal_visibility_check'
      and conrelid = 'public.teacher_notebook_entries'::regclass
  ) then
    alter table public.teacher_notebook_entries
      add constraint teacher_notebook_entries_journal_visibility_check
      check (journal_visibility in ('book_shared', 'teaching_private'));
  end if;
end $$;

create index if not exists teacher_notebook_entries_visibility_idx
  on public.teacher_notebook_entries (teacher_id, journal_visibility, entry_type, updated_at desc);

comment on table public.teacher_book_vocabulary is
  'Teacher-owned vocabulary for a catalog book teaching context. Does not create My Library rows or reading sessions.';

comment on column public.teacher_book_vocabulary.linked_user_book_word_id is
  'Optional link to a personal user_book_words row when the same teacher/book also exists in My Library.';

comment on column public.teacher_book_vocabulary.hidden_from_my_library is
  'Visual curation flag for personal vocabulary views; does not delete the teaching vocabulary row.';

comment on column public.teacher_book_vocabulary.hidden_from_teaching is
  'Visual curation flag for teacher vocabulary views; does not delete the personal vocabulary row.';

comment on column public.teacher_book_vocabulary.included_in_follow_along is
  'Whether this teacher-owned vocabulary row is included in Teacher Follow-Along.';

comment on column public.teacher_notebook_entries.journal_visibility is
  'book_shared entries belong to the shared Book Journal layer; teaching_private entries remain Teacher Journal only.';
