-- Library word encounter summaries
--
-- Run this in Supabase SQL editor.
-- This table gives Word History, vocab badges, and Library Check one shared
-- source for cross-book encounter counts.

create extension if not exists pgcrypto;

create or replace function public.library_study_identity_key(
  p_surface text,
  p_reading text
)
returns text
language sql
immutable
as $$
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
$$;

create table if not exists public.user_library_word_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_identity_key text not null,

  -- Reserved for definition-aware summaries later.
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

create or replace function public.refresh_user_library_word_summary_for_key(
  p_user_id uuid,
  p_study_identity_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or coalesce(p_study_identity_key, '') = '' then
    return;
  end if;

  delete from public.user_library_word_summaries
  where user_id = p_user_id
    and study_identity_key = p_study_identity_key
    and not exists (
      select 1
      from public.user_book_words ubw
      join public.user_books ub on ub.id = ubw.user_book_id
      where ub.user_id = p_user_id
        and public.library_study_identity_key(ubw.surface, ubw.reading) = p_study_identity_key
    );

  insert into public.user_library_word_summaries (
    user_id,
    study_identity_key,
    definition_key,
    surface,
    reading,
    meaning,
    jlpt,
    is_common,
    total_encounter_count,
    check_ready_encounter_count,
    hidden_encounter_count,
    book_count,
    first_seen_at,
    last_seen_at,
    sample_user_book_word_id,
    sample_user_book_id,
    sample_book_title,
    sample_book_cover_url,
    updated_at
  )
  select
    ub.user_id,
    p_study_identity_key,
    '',
    (array_agg(nullif(btrim(ubw.surface), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.reading), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.meaning), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.jlpt), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    bool_or(coalesce(ubw.is_common, false)),
    count(*)::integer,
    count(*) filter (
      where coalesce(ubw.hidden, false) = false
        and nullif(btrim(coalesce(ubw.surface, '')), '') is not null
        and nullif(btrim(coalesce(ubw.reading, '')), '') is not null
        and nullif(btrim(coalesce(ubw.meaning, '')), '') is not null
    )::integer,
    count(*) filter (where coalesce(ubw.hidden, false) = true)::integer,
    count(distinct ubw.user_book_id)::integer,
    min(ubw.created_at),
    max(ubw.created_at),
    (array_agg(ubw.id order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(ubw.user_book_id order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(b.title order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(b.cover_url order by ubw.created_at desc nulls last, ubw.id desc))[1],
    now()
  from public.user_book_words ubw
  join public.user_books ub on ub.id = ubw.user_book_id
  left join public.books b on b.id = ub.book_id
  where ub.user_id = p_user_id
    and public.library_study_identity_key(ubw.surface, ubw.reading) = p_study_identity_key
  group by ub.user_id
  on conflict (user_id, study_identity_key, definition_key)
  do update set
    surface = excluded.surface,
    reading = excluded.reading,
    meaning = excluded.meaning,
    jlpt = excluded.jlpt,
    is_common = excluded.is_common,
    total_encounter_count = excluded.total_encounter_count,
    check_ready_encounter_count = excluded.check_ready_encounter_count,
    hidden_encounter_count = excluded.hidden_encounter_count,
    book_count = excluded.book_count,
    first_seen_at = excluded.first_seen_at,
    last_seen_at = excluded.last_seen_at,
    sample_user_book_word_id = excluded.sample_user_book_word_id,
    sample_user_book_id = excluded.sample_user_book_id,
    sample_book_title = excluded.sample_book_title,
    sample_book_cover_url = excluded.sample_book_cover_url,
    updated_at = now();
end;
$$;

create or replace function public.refresh_user_library_word_summaries(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
begin
  if p_user_id is null then
    return;
  end if;

  delete from public.user_library_word_summaries
  where user_id = p_user_id
    and study_identity_key not in (
      select distinct public.library_study_identity_key(ubw.surface, ubw.reading)
      from public.user_book_words ubw
      join public.user_books ub on ub.id = ubw.user_book_id
      where ub.user_id = p_user_id
        and public.library_study_identity_key(ubw.surface, ubw.reading) <> ''
    );

  for v_key in
    select distinct public.library_study_identity_key(ubw.surface, ubw.reading)
    from public.user_book_words ubw
    join public.user_books ub on ub.id = ubw.user_book_id
    where ub.user_id = p_user_id
      and public.library_study_identity_key(ubw.surface, ubw.reading) <> ''
  loop
    perform public.refresh_user_library_word_summary_for_key(p_user_id, v_key);
  end loop;
end;
$$;

create or replace function public.refresh_my_library_word_summaries()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_user_library_word_summaries(auth.uid());
end;
$$;

create or replace function public.refresh_library_word_summary_from_word()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_user_id uuid;
  v_new_user_id uuid;
  v_old_key text;
  v_new_key text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select user_id into v_old_user_id
    from public.user_books
    where id = old.user_book_id;

    v_old_key := public.library_study_identity_key(old.surface, old.reading);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select user_id into v_new_user_id
    from public.user_books
    where id = new.user_book_id;

    v_new_key := public.library_study_identity_key(new.surface, new.reading);
  end if;

  if v_old_user_id is not null and coalesce(v_old_key, '') <> '' then
    perform public.refresh_user_library_word_summary_for_key(v_old_user_id, v_old_key);
  end if;

  if v_new_user_id is not null
    and coalesce(v_new_key, '') <> ''
    and (v_old_user_id is distinct from v_new_user_id or v_old_key is distinct from v_new_key)
  then
    perform public.refresh_user_library_word_summary_for_key(v_new_user_id, v_new_key);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists refresh_library_word_summary_from_word
  on public.user_book_words;

create trigger refresh_library_word_summary_from_word
after insert or update or delete on public.user_book_words
for each row
execute function public.refresh_library_word_summary_from_word();

alter table public.user_library_word_summaries enable row level security;

drop policy if exists "Users can read their own library word summaries"
  on public.user_library_word_summaries;
create policy "Users can read their own library word summaries"
  on public.user_library_word_summaries
  for select
  using (auth.uid() = user_id);

grant execute on function public.refresh_my_library_word_summaries() to authenticated;

-- After running this file, run this once to backfill your existing vocabulary:
--
-- select public.refresh_my_library_word_summaries();
