-- Phase 1: explicit work membership only. Apply before deploying the catalog UI.
-- No edition grouping/backfill, ownership creation, or teaching changes.
begin;
create table if not exists public.book_works (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 500),
  author text check (author is null or length(author) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.book_works is 'Explicitly confirmed underlying works. Membership does not imply equal text, pagination, location, or progress.';
alter table public.books add column if not exists work_id uuid references public.book_works(id) on delete restrict;
alter table public.books add column if not exists work_linked_by uuid references auth.users(id) on delete set null;
alter table public.books add column if not exists work_linked_at timestamptz;
create index if not exists books_work_id_idx on public.books(work_id) where work_id is not null;
comment on column public.books.work_id is 'Optional explicit work membership. This row remains one exact edition; no inferred grouping.';

alter table public.book_works enable row level security;
revoke all on public.book_works from anon, authenticated;
grant select on public.book_works to authenticated;
grant all on public.book_works to service_role;
drop policy if exists "Authenticated users can read work metadata" on public.book_works;
create policy "Authenticated users can read work metadata" on public.book_works for select to authenticated using (true);

create or replace function public.touch_book_work_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin NEW.updated_at = now(); return NEW; end $$;
drop trigger if exists touch_book_work_updated_at on public.book_works;
create trigger touch_book_work_updated_at before update on public.book_works
for each row execute function public.touch_book_work_updated_at();

-- Existing books policies may allow reader metadata edits. A separate guard
-- protects these new columns even if a caller bypasses the maintenance UI.
create or replace function public.guard_book_work_membership()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    if TG_OP = 'INSERT' then
      if NEW.work_id is not null or NEW.work_linked_by is not null or NEW.work_linked_at is not null then
        raise exception 'Use authorized catalog maintenance to link a work.' using errcode = '42501';
      end if;
    elsif NEW.work_id is distinct from OLD.work_id
       or NEW.work_linked_by is distinct from OLD.work_linked_by
       or NEW.work_linked_at is distinct from OLD.work_linked_at then
      raise exception 'Use authorized catalog maintenance to link a work.' using errcode = '42501';
    end if;
  end if;
  return NEW;
end $$;
drop trigger if exists guard_book_work_membership on public.books;
create trigger guard_book_work_membership before insert or update on public.books
for each row execute function public.guard_book_work_membership();

-- Server-only transaction: lock the exact edition and compare the relationship
-- the maintainer actually reviewed. Creation + linking commits atomically.
create or replace function public.maintain_book_work(
  p_actor_id uuid, p_book_id uuid, p_expected_work_id uuid,
  p_action text, p_confirmed boolean,
  p_work_id uuid default null, p_title text default null, p_author text default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare previous_work uuid; next_work uuid;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id
    and (role in ('admin', 'super_teacher') or is_super_teacher::text = 'true')) then
    raise exception 'Catalog maintenance access required.' using errcode = '42501';
  end if;
  if p_confirmed is distinct from true then
    raise exception 'Explicit confirmation required.' using errcode = '22023';
  end if;
  select work_id into previous_work from public.books where id = p_book_id for update;
  if not found then raise exception 'Edition not found.' using errcode = 'P0002'; end if;
  if previous_work is distinct from p_expected_work_id then
    raise exception 'Work link changed. Reload and confirm the current relationship.' using errcode = '40001';
  end if;
  if p_action = 'create' then
    if previous_work is not null or p_work_id is not null or nullif(btrim(p_title), '') is null then
      raise exception 'Create a work from an unlinked edition with a display title.' using errcode = '22023';
    end if;
    insert into public.book_works(title, author, created_by)
      values (btrim(p_title), nullif(btrim(p_author), ''), p_actor_id) returning id into next_work;
  elsif p_action = 'link' then
    if p_work_id is null then raise exception 'Choose an existing work.' using errcode = '22023'; end if;
    perform 1 from public.book_works where id = p_work_id for key share;
    if not found then raise exception 'Work not found.' using errcode = 'P0002'; end if;
    next_work = p_work_id;
  elsif p_action = 'unlink' then
    if p_work_id is not null then raise exception 'Unlink must not include a destination.' using errcode = '22023'; end if;
    next_work = null;
  else
    raise exception 'Unknown work action.' using errcode = '22023';
  end if;
  if next_work is distinct from previous_work then
    update public.books set work_id = next_work,
      work_linked_by = p_actor_id, work_linked_at = now() where id = p_book_id;
  end if;
  return next_work;
end $$;
revoke all on function public.maintain_book_work(uuid, uuid, uuid, text, boolean, uuid, text, text) from public, anon, authenticated;
grant execute on function public.maintain_book_work(uuid, uuid, uuid, text, boolean, uuid, text, text) to service_role;
notify pgrst, 'reload schema';
commit;
