-- Protect canonical books that are still referenced by a reader's library.
-- Only change this FK's ON DELETE action; retain its name and other options.
-- Apply atomically so no session can observe a missing constraint.
begin;

set local lock_timeout = '5s';
lock table public.books, public.user_books in access exclusive mode;

do $migration$
declare
  target_fk record;
  fk_count integer;
  replacement_definition text;
begin
  select count(*) into fk_count
  from pg_constraint c
  where c.contype = 'f'
    and c.conrelid = 'public.user_books'::regclass
    and c.confrelid = 'public.books'::regclass
    and c.conkey = array[(select attnum from pg_attribute
      where attrelid = 'public.user_books'::regclass and attname = 'book_id'
        and not attisdropped)]::smallint[]
    and c.confkey = array[(select attnum from pg_attribute
      where attrelid = 'public.books'::regclass and attname = 'id'
        and not attisdropped)]::smallint[];

  if fk_count <> 1 then
    raise exception 'Expected exactly one user_books.book_id -> books.id FK; found %', fk_count;
  end if;

  select c.*, pg_get_constraintdef(c.oid) as definition,
    obj_description(c.oid, 'pg_constraint') as constraint_comment
  into strict target_fk
  from pg_constraint c
  where c.contype = 'f'
    and c.conrelid = 'public.user_books'::regclass
    and c.confrelid = 'public.books'::regclass
    and c.conkey = array[(select attnum from pg_attribute
      where attrelid = 'public.user_books'::regclass and attname = 'book_id'
        and not attisdropped)]::smallint[]
    and c.confkey = array[(select attnum from pg_attribute
      where attrelid = 'public.books'::regclass and attname = 'id'
        and not attisdropped)]::smallint[];

  if target_fk.confdeltype <> 'c' or not target_fk.convalidated then
    raise exception 'Expected a validated ON DELETE CASCADE FK; refusing to change unexpected schema';
  end if;

  if exists (
    select 1 from public.user_books ub
    where ub.book_id is not null
      and not exists (select 1 from public.books b where b.id = ub.book_id)
  ) then
    raise exception 'Orphaned user_books.book_id values exist; no changes applied';
  end if;

  replacement_definition := replace(target_fk.definition,
    'ON DELETE CASCADE', 'ON DELETE RESTRICT');
  if replacement_definition = target_fk.definition then
    raise exception 'Could not locate ON DELETE CASCADE in FK definition';
  end if;

  execute format('alter table public.user_books drop constraint %I', target_fk.conname);
  -- ADD CONSTRAINT validates all existing rows; any failure rolls back the drop.
  execute format('alter table public.user_books add constraint %I %s',
    target_fk.conname, replacement_definition);

  if target_fk.constraint_comment is not null then
    execute format('comment on constraint %I on public.user_books is %L',
      target_fk.conname, target_fk.constraint_comment);
  end if;
end;
$migration$;

commit;
