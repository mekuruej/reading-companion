-- Library word encounter summaries: 01 table
--
-- Run this first in Supabase SQL editor.

create extension if not exists pgcrypto;

create or replace function public.library_study_identity_key(
  p_surface text,
  p_reading text
)
returns text
language sql
immutable
as $identity_key$
  select case
    when btrim(coalesce(p_surface, '')) = '' then ''
    else
      lower(regexp_replace(btrim(coalesce(p_surface, '')), '\s+', ' ', 'g'))
      || '||' ||
      lower(
        translate(
          regexp_replace(btrim(coalesce(p_reading, '')), '\s+', '', 'g'),
          'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヶ',
          'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゖ'
        )
      )
  end;
$identity_key$;

create table if not exists public.user_library_word_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_identity_key text not null,
  definition_key text not null default '',

  surface text,
  reading text,
  meaning text,
  jlpt text,
  is_common boolean,

  total_encounter_count integer not null default 0 check (total_encounter_count >= 0),
  check_ready_encounter_count integer not null default 0 check (check_ready_encounter_count >= 0),
  hidden_encounter_count integer not null default 0 check (hidden_encounter_count >= 0),
  book_count integer not null default 0 check (book_count >= 0),

  first_seen_at timestamptz,
  last_seen_at timestamptz,

  sample_user_book_word_id uuid,
  sample_user_book_id uuid,
  sample_book_title text,
  sample_book_cover_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, study_identity_key, definition_key)
);

create index if not exists user_library_word_summaries_user_count_idx
  on public.user_library_word_summaries (user_id, total_encounter_count desc);

create index if not exists user_library_word_summaries_user_books_idx
  on public.user_library_word_summaries (user_id, book_count desc);

create index if not exists user_library_word_summaries_user_ready_idx
  on public.user_library_word_summaries (user_id, check_ready_encounter_count desc);

alter table public.user_library_word_summaries enable row level security;

drop policy if exists "Users can read their own library word summaries"
  on public.user_library_word_summaries;

create policy "Users can read their own library word summaries"
  on public.user_library_word_summaries
  for select
  using (auth.uid() = user_id);
