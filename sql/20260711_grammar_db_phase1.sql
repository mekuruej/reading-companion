-- MEKURU Grammar DB Phase 1
--
-- Shared grammar knowledge foundation plus teacher-only review access.
-- Personal/book grammar encounters intentionally stay out of this phase.

create extension if not exists pgcrypto;

create table if not exists public.grammar_points (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  pattern text not null,
  reading text,
  jlpt_level text,
  register_tags text[] not null default '{}',
  spoken_written_tendency text,
  register_note_en text,
  status text not null default 'needs_review',
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  source_label text,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_points_status_check
    check (status in ('needs_review', 'in_progress', 'complete', 'excluded')),
  constraint grammar_points_jlpt_level_check
    check (jlpt_level is null or jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  constraint grammar_points_slug_not_blank check (length(trim(slug)) > 0),
  constraint grammar_points_pattern_not_blank check (length(trim(pattern)) > 0)
);

create table if not exists public.grammar_point_senses (
  id uuid primary key default gen_random_uuid(),
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  sense_number integer not null,
  meaning_en text not null,
  nuance_en text,
  usage_note_en text,
  register_tags text[],
  spoken_written_tendency text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_point_senses_sense_number_positive check (sense_number > 0),
  constraint grammar_point_senses_meaning_not_blank check (length(trim(meaning_en)) > 0),
  constraint grammar_point_senses_unique_number unique (grammar_point_id, sense_number)
);

create table if not exists public.grammar_point_constructions (
  id uuid primary key default gen_random_uuid(),
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  grammar_point_sense_id uuid references public.grammar_point_senses(id) on delete cascade,
  construction_text text not null,
  construction_note_en text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_point_constructions_text_not_blank check (length(trim(construction_text)) > 0)
);

create table if not exists public.grammar_point_aliases (
  id uuid primary key default gen_random_uuid(),
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  alias_text text not null,
  normalized_alias text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint grammar_point_aliases_alias_not_blank check (length(trim(alias_text)) > 0),
  constraint grammar_point_aliases_normalized_not_blank check (length(trim(normalized_alias)) > 0),
  constraint grammar_point_aliases_unique_normalized unique (grammar_point_id, normalized_alias)
);

create table if not exists public.grammar_point_relations (
  id uuid primary key default gen_random_uuid(),
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  related_grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  relationship_type text not null,
  relationship_note_en text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_point_relations_type_not_blank check (length(trim(relationship_type)) > 0),
  constraint grammar_point_relations_not_self check (grammar_point_id <> related_grammar_point_id),
  constraint grammar_point_relations_unique unique (
    grammar_point_id,
    related_grammar_point_id,
    relationship_type
  )
);

create table if not exists public.grammar_point_examples (
  id uuid primary key default gen_random_uuid(),
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  grammar_point_sense_id uuid references public.grammar_point_senses(id) on delete set null,
  sentence_ja text not null,
  translation_en text,
  example_note_en text,
  source_type text not null default 'original',
  source_label text,
  source_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_point_examples_sentence_not_blank check (length(trim(sentence_ja)) > 0),
  constraint grammar_point_examples_source_type_check
    check (source_type in ('original', 'licensed', 'public_domain'))
);

create index if not exists grammar_points_status_idx
  on public.grammar_points (status, updated_at desc);

create index if not exists grammar_points_active_status_idx
  on public.grammar_points (is_active, status, updated_at desc);

create index if not exists grammar_points_pattern_idx
  on public.grammar_points (pattern);

create index if not exists grammar_point_senses_point_sort_idx
  on public.grammar_point_senses (grammar_point_id, sort_order, sense_number);

create index if not exists grammar_point_constructions_point_sort_idx
  on public.grammar_point_constructions (grammar_point_id, sort_order);

create index if not exists grammar_point_constructions_sense_idx
  on public.grammar_point_constructions (grammar_point_sense_id);

create index if not exists grammar_point_aliases_normalized_idx
  on public.grammar_point_aliases (normalized_alias);

create index if not exists grammar_point_aliases_point_sort_idx
  on public.grammar_point_aliases (grammar_point_id, sort_order);

create index if not exists grammar_point_relations_point_sort_idx
  on public.grammar_point_relations (grammar_point_id, sort_order);

create index if not exists grammar_point_relations_related_idx
  on public.grammar_point_relations (related_grammar_point_id);

create index if not exists grammar_point_examples_point_sort_idx
  on public.grammar_point_examples (grammar_point_id, sort_order);

create index if not exists grammar_point_examples_sense_idx
  on public.grammar_point_examples (grammar_point_sense_id);

create or replace function public.set_grammar_points_updated_at()
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

create or replace function public.set_grammar_child_updated_at()
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

drop trigger if exists set_grammar_points_updated_at on public.grammar_points;
create trigger set_grammar_points_updated_at
before update on public.grammar_points
for each row
execute function public.set_grammar_points_updated_at();

drop trigger if exists set_grammar_point_senses_updated_at on public.grammar_point_senses;
create trigger set_grammar_point_senses_updated_at
before update on public.grammar_point_senses
for each row
execute function public.set_grammar_child_updated_at();

drop trigger if exists set_grammar_point_constructions_updated_at on public.grammar_point_constructions;
create trigger set_grammar_point_constructions_updated_at
before update on public.grammar_point_constructions
for each row
execute function public.set_grammar_child_updated_at();

drop trigger if exists set_grammar_point_relations_updated_at on public.grammar_point_relations;
create trigger set_grammar_point_relations_updated_at
before update on public.grammar_point_relations
for each row
execute function public.set_grammar_child_updated_at();

drop trigger if exists set_grammar_point_examples_updated_at on public.grammar_point_examples;
create trigger set_grammar_point_examples_updated_at
before update on public.grammar_point_examples
for each row
execute function public.set_grammar_child_updated_at();

alter table public.grammar_points enable row level security;
alter table public.grammar_point_senses enable row level security;
alter table public.grammar_point_constructions enable row level security;
alter table public.grammar_point_aliases enable row level security;
alter table public.grammar_point_relations enable row level security;
alter table public.grammar_point_examples enable row level security;

drop policy if exists "grammar_points_teacher_select" on public.grammar_points;
create policy "grammar_points_teacher_select"
on public.grammar_points
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

drop policy if exists "grammar_points_teacher_manage" on public.grammar_points;
create policy "grammar_points_teacher_manage"
on public.grammar_points
for all
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
)
with check (
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

drop policy if exists "grammar_point_senses_teacher_select" on public.grammar_point_senses;
create policy "grammar_point_senses_teacher_select"
on public.grammar_point_senses
for select
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

drop policy if exists "grammar_point_senses_teacher_manage" on public.grammar_point_senses;
create policy "grammar_point_senses_teacher_manage"
on public.grammar_point_senses
for all
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
)
with check (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

drop policy if exists "grammar_point_constructions_teacher_select" on public.grammar_point_constructions;
create policy "grammar_point_constructions_teacher_select"
on public.grammar_point_constructions
for select
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

drop policy if exists "grammar_point_constructions_teacher_manage" on public.grammar_point_constructions;
create policy "grammar_point_constructions_teacher_manage"
on public.grammar_point_constructions
for all
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
)
with check (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

drop policy if exists "grammar_point_aliases_teacher_select" on public.grammar_point_aliases;
create policy "grammar_point_aliases_teacher_select"
on public.grammar_point_aliases
for select
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

drop policy if exists "grammar_point_aliases_teacher_manage" on public.grammar_point_aliases;
create policy "grammar_point_aliases_teacher_manage"
on public.grammar_point_aliases
for all
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
)
with check (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

drop policy if exists "grammar_point_relations_teacher_select" on public.grammar_point_relations;
create policy "grammar_point_relations_teacher_select"
on public.grammar_point_relations
for select
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

drop policy if exists "grammar_point_relations_teacher_manage" on public.grammar_point_relations;
create policy "grammar_point_relations_teacher_manage"
on public.grammar_point_relations
for all
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
)
with check (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

drop policy if exists "grammar_point_examples_teacher_select" on public.grammar_point_examples;
create policy "grammar_point_examples_teacher_select"
on public.grammar_point_examples
for select
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

drop policy if exists "grammar_point_examples_teacher_manage" on public.grammar_point_examples;
create policy "grammar_point_examples_teacher_manage"
on public.grammar_point_examples
for all
to authenticated
using (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
)
with check (
  exists (
    select 1
    from public.grammar_points gp
    where gp.id = grammar_point_id
  )
);

comment on table public.grammar_points is
  'Shared grammar point identity and review metadata. Phase 1 is teacher-visible only.';

comment on table public.grammar_point_senses is
  'Distinct meanings or nuances for a shared grammar point.';

comment on table public.grammar_point_constructions is
  'How a grammar point connects to surrounding words.';

comment on table public.grammar_point_aliases is
  'Search aliases and normalized forms for future grammar lookup.';

comment on table public.grammar_point_relations is
  'Structured relationships between grammar points.';

comment on table public.grammar_point_examples is
  'Reusable original, licensed, or public-domain grammar examples. Do not store ordinary copyrighted book quotations here.';

insert into public.grammar_points (
  slug,
  pattern,
  reading,
  jlpt_level,
  status,
  source_label
)
values (
  'te-kuru',
  '〜てくる',
  'てくる',
  'N4',
  'needs_review',
  'MEKURU seed'
)
on conflict (slug) do nothing;
