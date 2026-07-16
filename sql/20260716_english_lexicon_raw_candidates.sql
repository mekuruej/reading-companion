-- English -> Japanese Lexicon Raw Candidate Foundation
--
-- Quiet imported dictionary source material only. These rows are not approved
-- MEKURU lexicon entries and must not automatically become student-facing data,
-- Needs Attention work, user_book_words, Follow-Along support, or flashcards.

create extension if not exists pgcrypto;

create table if not exists public.english_lexicon_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_version text,
  license_label text,
  license_url text,
  source_url text,
  imported_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint english_lexicon_sources_name_not_blank
    check (length(trim(source_name)) > 0),
  constraint english_lexicon_sources_version_not_blank
    check (source_version is null or length(trim(source_version)) > 0)
);

create unique index if not exists english_lexicon_sources_name_version_unique_idx
  on public.english_lexicon_sources (
    lower(trim(source_name)),
    coalesce(lower(trim(source_version)), '')
  );

create index if not exists english_lexicon_sources_imported_at_idx
  on public.english_lexicon_sources (imported_at desc nulls last);

create table if not exists public.english_lexicon_raw_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.english_lexicon_sources(id) on delete cascade,
  source_entry_key text not null,
  headword text not null,
  normalized_lookup text not null,
  item_type text not null,
  part_of_speech text,
  pronunciations text[] not null default '{}',
  raw_senses jsonb not null default '[]'::jsonb,
  quality_flags text[] not null default '{}',
  raw_entry jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint english_lexicon_raw_candidates_item_type_check
    check (item_type in ('word', 'phrase')),
  constraint english_lexicon_raw_candidates_source_key_not_blank
    check (length(trim(source_entry_key)) > 0),
  constraint english_lexicon_raw_candidates_headword_not_blank
    check (length(trim(headword)) > 0),
  constraint english_lexicon_raw_candidates_lookup_not_blank
    check (length(trim(normalized_lookup)) > 0),
  constraint english_lexicon_raw_candidates_pos_not_blank
    check (part_of_speech is null or length(trim(part_of_speech)) > 0),
  constraint english_lexicon_raw_candidates_raw_senses_array
    check (jsonb_typeof(raw_senses) = 'array'),
  constraint english_lexicon_raw_candidates_unique_source_entry
    unique (source_id, source_entry_key)
);

create index if not exists english_lexicon_raw_candidates_source_idx
  on public.english_lexicon_raw_candidates (source_id);

create index if not exists english_lexicon_raw_candidates_lookup_idx
  on public.english_lexicon_raw_candidates (normalized_lookup);

create index if not exists english_lexicon_raw_candidates_lookup_type_idx
  on public.english_lexicon_raw_candidates (normalized_lookup, item_type);

create index if not exists english_lexicon_raw_candidates_item_type_idx
  on public.english_lexicon_raw_candidates (item_type);

create index if not exists english_lexicon_raw_candidates_part_of_speech_idx
  on public.english_lexicon_raw_candidates (part_of_speech)
  where part_of_speech is not null;

create index if not exists english_lexicon_raw_candidates_raw_senses_gin_idx
  on public.english_lexicon_raw_candidates using gin (raw_senses);

create or replace function public.set_english_lexicon_sources_updated_at()
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

create or replace function public.set_english_lexicon_raw_candidates_updated_at()
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

drop trigger if exists set_english_lexicon_sources_updated_at
  on public.english_lexicon_sources;

create trigger set_english_lexicon_sources_updated_at
before update on public.english_lexicon_sources
for each row
execute function public.set_english_lexicon_sources_updated_at();

drop trigger if exists set_english_lexicon_raw_candidates_updated_at
  on public.english_lexicon_raw_candidates;

create trigger set_english_lexicon_raw_candidates_updated_at
before update on public.english_lexicon_raw_candidates
for each row
execute function public.set_english_lexicon_raw_candidates_updated_at();

alter table public.english_lexicon_sources enable row level security;
alter table public.english_lexicon_raw_candidates enable row level security;

drop policy if exists "english_lexicon_sources_teacher_select"
  on public.english_lexicon_sources;
create policy "english_lexicon_sources_teacher_select"
on public.english_lexicon_sources
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('teacher', 'super_teacher')
        or coalesce(p.is_super_teacher, false) = true
      )
  )
);

drop policy if exists "english_lexicon_sources_super_teacher_manage"
  on public.english_lexicon_sources;
create policy "english_lexicon_sources_super_teacher_manage"
on public.english_lexicon_sources
for all
to authenticated
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

drop policy if exists "english_lexicon_raw_candidates_teacher_select"
  on public.english_lexicon_raw_candidates;
create policy "english_lexicon_raw_candidates_teacher_select"
on public.english_lexicon_raw_candidates
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('teacher', 'super_teacher')
        or coalesce(p.is_super_teacher, false) = true
      )
  )
);

drop policy if exists "english_lexicon_raw_candidates_super_teacher_manage"
  on public.english_lexicon_raw_candidates;
create policy "english_lexicon_raw_candidates_super_teacher_manage"
on public.english_lexicon_raw_candidates
for all
to authenticated
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

comment on table public.english_lexicon_sources is
  'Provenance and licensing records for imported English-to-Japanese lexicon candidate sources.';

comment on table public.english_lexicon_raw_candidates is
  'Quiet, unapproved English-to-Japanese dictionary candidate source rows. Not learner-facing and not connected to review queues.';

comment on column public.english_lexicon_raw_candidates.raw_senses is
  'Source-preserved sense candidates, such as sense order, raw English definitions, Japanese translation candidates, and source-specific nesting.';

comment on column public.english_lexicon_raw_candidates.raw_entry is
  'Optional original source entry payload for debugging, provenance review, and future teacher approval tooling.';
