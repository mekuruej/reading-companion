-- Reading Journal content belongs only to the owner of its user_books row.
-- This migration deliberately leaves Reading Reflections and teacher workflows
-- on user_books unchanged.

begin;

-- Record this one-shot migration explicitly. It is intentionally guarded
-- rather than rerunnable because it removes legacy columns at the end.
create table if not exists public.mekuru_migration_state (
  migration_name text primary key,
  applied_at timestamptz not null default now()
);
alter table public.mekuru_migration_state enable row level security;
revoke all on public.mekuru_migration_state from public, anon, authenticated;

do $$
begin
  if exists (
    select 1 from public.mekuru_migration_state
    where migration_name = '20261014_private_reading_journal_ownership'
  ) then
    raise exception 'Reading Journal privacy migration is already recorded; no changes were applied.'
      using errcode = '55000';
  end if;

  if (
    select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'user_books'
      and column_name in ('notes', 'favorite_quotes')
  ) <> 2 then
    raise exception 'Reading Journal privacy migration requires both legacy user_books columns; inspect migration state before proceeding.'
      using errcode = '55000';
  end if;
end $$;

create table if not exists public.user_book_private_journals (
  user_book_id uuid primary key references public.user_books(id) on delete cascade,
  notes text,
  favorite_quotes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Preserve the existing owner's journal values before removing them from the
-- broadly readable user_books record. On a retry, never overwrite content that
-- has already been copied to the private table.
insert into public.user_book_private_journals (user_book_id, notes, favorite_quotes)
select id, notes, favorite_quotes
from public.user_books
where notes is not null or favorite_quotes is not null
on conflict (user_book_id) do update
set notes = coalesce(public.user_book_private_journals.notes, excluded.notes),
    favorite_quotes = coalesce(public.user_book_private_journals.favorite_quotes, excluded.favorite_quotes),
    updated_at = now();

alter table public.user_book_private_journals enable row level security;
revoke all on public.user_book_private_journals from public, anon;
grant select, insert, update, delete on public.user_book_private_journals to authenticated;

drop policy if exists "Owners can manage their private book journal" on public.user_book_private_journals;
create policy "Owners can manage their private book journal"
  on public.user_book_private_journals
  for all to authenticated
  using (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and ub.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and ub.user_id = auth.uid()
    )
  );

-- Teacher-authored assessment notes use their own storage now that user_books
-- no longer carries a mixed owner/teacher notes field. By the confirmed data
-- decision, legacy notes are moved only to the book owner's private journal;
-- they are not backfilled as teacher notes. Any legacy assessment note in that
-- shared field may therefore become private journal content. New assessment
-- notes continue to be stored here under the teacher's ownership.
create table if not exists public.teacher_user_book_assessment_notes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  user_book_id uuid not null references public.user_books(id) on delete cascade,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, user_book_id)
);
create index if not exists teacher_user_book_assessment_notes_book_idx
  on public.teacher_user_book_assessment_notes (user_book_id, teacher_id);
alter table public.teacher_user_book_assessment_notes enable row level security;
revoke all on public.teacher_user_book_assessment_notes from public, anon;
grant select, insert, update, delete on public.teacher_user_book_assessment_notes to authenticated;
create policy "Linked teachers manage their assessment notes"
  on public.teacher_user_book_assessment_notes for all to authenticated
  using (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      join public.user_books ub on ub.id = user_book_id
      where p.id = auth.uid()
        and (p.role = 'teacher' or p.role = 'super_teacher' or coalesce(p.is_super_teacher, false))
        and (
          p.role = 'super_teacher'
          or coalesce(p.is_super_teacher, false)
          or exists (
            select 1 from public.teacher_students ts
            where ts.teacher_id = p.id
              and ts.student_id = ub.user_id
              and ts.archived_at is null
          )
        )
      )
  )
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      join public.user_books ub on ub.id = user_book_id
      where p.id = auth.uid()
        and (p.role = 'teacher' or p.role = 'super_teacher' or coalesce(p.is_super_teacher, false))
        and (
          p.role = 'super_teacher'
          or coalesce(p.is_super_teacher, false)
          or exists (
            select 1 from public.teacher_students ts
            where ts.teacher_id = p.id
              and ts.student_id = ub.user_id
              and ts.archived_at is null
          )
        )
      )
  );

-- Drop every prior policy rather than relying on known policy names: permissive
-- policies combine with OR and would otherwise continue granting teacher or
-- elevated-role access.
do $$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array[
    'user_book_chapter_summaries',
    'user_book_characters',
    'user_book_cultural_items',
    'user_book_detective_entries',
    'user_book_reviews',
    'user_book_setting_items'
  ] loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all on public.%I from public, anon', target_table);
    execute format('grant select, insert, update, delete on public.%I to authenticated', target_table);
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy %I on public.%I', existing_policy.policyname, target_table);
    end loop;
  end loop;
end $$;

create policy "Reading Journal owner select"
  on public.user_book_chapter_summaries for select to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner insert"
  on public.user_book_chapter_summaries for insert to authenticated
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner update"
  on public.user_book_chapter_summaries for update to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()))
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner delete"
  on public.user_book_chapter_summaries for delete to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));

create policy "Reading Journal owner select"
  on public.user_book_characters for select to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner insert"
  on public.user_book_characters for insert to authenticated
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner update"
  on public.user_book_characters for update to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()))
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner delete"
  on public.user_book_characters for delete to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));

create policy "Reading Journal owner select"
  on public.user_book_cultural_items for select to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner insert"
  on public.user_book_cultural_items for insert to authenticated
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner update"
  on public.user_book_cultural_items for update to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()))
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner delete"
  on public.user_book_cultural_items for delete to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));

create policy "Reading Journal owner select"
  on public.user_book_detective_entries for select to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid())
  );
create policy "Reading Journal owner insert"
  on public.user_book_detective_entries for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid())
  );
create policy "Reading Journal owner update"
  on public.user_book_detective_entries for update to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid())
  );
create policy "Reading Journal owner delete"
  on public.user_book_detective_entries for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid())
  );

create or replace function public.validate_user_book_detective_entry_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  book_owner_id uuid;
begin
  select ub.user_id into book_owner_id
  from public.user_books ub
  where ub.id = new.user_book_id;

  if book_owner_id is null or new.user_id is distinct from book_owner_id then
    raise exception 'Detective entry user_id must match the referenced book owner';
  end if;

  return new;
end;
$$;
revoke all on function public.validate_user_book_detective_entry_owner() from public;
drop trigger if exists validate_user_book_detective_entry_owner on public.user_book_detective_entries;
create trigger validate_user_book_detective_entry_owner
  before insert or update of user_id, user_book_id
  on public.user_book_detective_entries
  for each row execute function public.validate_user_book_detective_entry_owner();

create policy "Reading Journal owner select"
  on public.user_book_reviews for select to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner insert"
  on public.user_book_reviews for insert to authenticated
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner update"
  on public.user_book_reviews for update to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()))
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner delete"
  on public.user_book_reviews for delete to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));

create policy "Reading Journal owner select"
  on public.user_book_setting_items for select to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner insert"
  on public.user_book_setting_items for insert to authenticated
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner update"
  on public.user_book_setting_items for update to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()))
  with check (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));
create policy "Reading Journal owner delete"
  on public.user_book_setting_items for delete to authenticated
  using (exists (select 1 from public.user_books ub where ub.id = user_book_id and ub.user_id = auth.uid()));

-- Neither PostgREST nor broad user_books readers should be able to fetch the
-- journal fields after the copy has been secured above.
alter table public.user_books drop column if exists notes;
alter table public.user_books drop column if exists favorite_quotes;

insert into public.mekuru_migration_state (migration_name)
values ('20261014_private_reading_journal_ownership');

commit;
