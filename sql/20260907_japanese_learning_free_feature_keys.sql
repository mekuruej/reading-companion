-- Register admin-controlled free Japanese Learning feature toggles.
-- Run this once before using the Reading Reflections / Find Your Next Book
-- free-user toggles in production.

create table if not exists public.japanese_learning_free_features (
  feature_key text primary key,
  label text not null,
  description text not null,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.japanese_learning_free_features
  (feature_key, label, description, is_enabled)
values
  (
    'reading_reflections',
    'Reading Reflections',
    'View and submit public learner reflections for Japanese books.',
    false
  ),
  (
    'find_next_book',
    'Find Your Next Book',
    'Use the full reader-fit book discovery experience.',
    false
  )
on conflict (feature_key) do update
set
  label = excluded.label,
  description = excluded.description,
  updated_at = now();

alter table public.japanese_learning_free_features enable row level security;

drop policy if exists "Signed-in users can read Japanese Learning free features"
  on public.japanese_learning_free_features;
create policy "Signed-in users can read Japanese Learning free features"
  on public.japanese_learning_free_features
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can update Japanese Learning free features"
  on public.japanese_learning_free_features;
create policy "Admins can update Japanese Learning free features"
  on public.japanese_learning_free_features
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = auth.uid()
        and (
          reviewer.role in ('super_teacher', 'admin')
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
          reviewer.role in ('super_teacher', 'admin')
          or reviewer.is_super_teacher = true
        )
    )
  );

create or replace function public.current_user_has_japanese_learning_feature(
  required_feature_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.japanese_learning_free_features f
      on f.feature_key = required_feature_key
    where p.id = auth.uid()
      and (
        p.role in ('teacher', 'super_teacher', 'admin')
        or coalesce(p.is_super_teacher, false) = true
        or (
          p.app_access_type = 'trial'
          and p.app_access_expires_at is not null
          and p.app_access_expires_at >= now()
        )
        or (
          p.app_access_type in (
            'reading_access',
            'lesson_access',
            'student',
            'paid',
            'book_club',
            'full_access'
          )
          and (
            p.app_access_expires_at is null
            or p.app_access_expires_at >= now()
          )
        )
        or (
          p.app_access_type = 'free'
          and coalesce(f.is_enabled, false) = true
        )
      )
  );
$$;

drop policy if exists "Anyone can read active book recommendation signals"
  on public.book_recommendation_signals;
drop policy if exists "Signed-in users can read active book recommendation signals"
  on public.book_recommendation_signals;
create policy "Signed-in users can read active book recommendation signals"
  on public.book_recommendation_signals
  for select
  to authenticated
  using (
    is_active = true
    and public.current_user_has_japanese_learning_feature('find_next_book')
  );

drop policy if exists "Readers can manage their own recommendation signals"
  on public.book_recommendation_signals;
create policy "Readers can manage their own recommendation signals"
  on public.book_recommendation_signals
  for all
  to authenticated
  using (
    auth.uid() = user_id
    and public.current_user_has_japanese_learning_feature('reading_reflections')
  )
  with check (
    auth.uid() = user_id
    and public.current_user_has_japanese_learning_feature('reading_reflections')
  );

create or replace function public.require_reading_reflection_access_for_user_books()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  book_language_code text;
  changed_reflection_fields boolean;
begin
  changed_reflection_fields :=
    new.reader_advice is distinct from old.reader_advice
    or new.rating_overall is distinct from old.rating_overall
    or new.rating_difficulty is distinct from old.rating_difficulty
    or new.reader_level is distinct from old.reader_level;

  if not changed_reflection_fields then
    return new;
  end if;

  select b.language_code
    into book_language_code
  from public.books b
  where b.id = new.book_id;

  if coalesce(book_language_code, '') <> 'ja' then
    return new;
  end if;

  if not public.current_user_has_japanese_learning_feature('reading_reflections') then
    raise exception 'Reading Reflections are locked for this account right now.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists require_reading_reflection_access_for_user_books
  on public.user_books;
create trigger require_reading_reflection_access_for_user_books
before update of reader_advice, rating_overall, rating_difficulty, reader_level
on public.user_books
for each row
execute function public.require_reading_reflection_access_for_user_books();
