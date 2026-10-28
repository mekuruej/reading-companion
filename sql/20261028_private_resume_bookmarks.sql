-- Private reader-owned stopping cues. No changes to user_books grants, policies,
-- columns, triggers, session history, vocabulary, or stored reading progress.
begin;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_books' and column_name='id' and udt_name='uuid')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_books' and column_name='user_id' and udt_name='uuid')
     or not exists (select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='id' and udt_name='uuid') then
    raise exception 'Private bookmarks require UUID user_books.id/user_id and auth.users.id';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_books' and column_name like 'resume_bookmark_%') then
    raise exception 'Legacy user_books bookmark columns found; inspect and prepare a separate data-preserving transition';
  end if;
end $$;

create table if not exists public.user_book_resume_bookmarks (
  user_id uuid not null,
  user_book_id uuid not null,
  kind text not null,
  page integer not null,
  phrase text,
  constraint user_book_resume_bookmarks_pkey primary key (user_id, user_book_id),
  constraint user_book_resume_bookmarks_user_fk foreign key (user_id) references auth.users(id) on delete cascade,
  constraint user_book_resume_bookmarks_book_fk foreign key (user_book_id) references public.user_books(id) on delete cascade
);

-- Fail on unexpected preexisting objects rather than inheriting access rules or
-- invoking unreviewed triggers. Reapplication supports only this table contract.
do $$
declare r record;
begin
  if exists (
    (select attnum, attname::text, atttypid::regtype::text, attnotnull from pg_attribute where attrelid='public.user_book_resume_bookmarks'::regclass and attnum>0 and not attisdropped
     except values (1,'user_id','uuid',true),(2,'user_book_id','uuid',true),(3,'kind','text',true),(4,'page','integer',true),(5,'phrase','text',false))
    union all
    (values (1,'user_id','uuid',true),(2,'user_book_id','uuid',true),(3,'kind','text',true),(4,'page','integer',true),(5,'phrase','text',false)
     except select attnum, attname::text, atttypid::regtype::text, attnotnull from pg_attribute where attrelid='public.user_book_resume_bookmarks'::regclass and attnum>0 and not attisdropped)
  ) then raise exception 'Unexpected private bookmark column contract'; end if;
  if exists (select 1 from pg_attribute where attrelid='public.user_book_resume_bookmarks'::regclass and attnum>0 and not attisdropped and (atthasdef or attidentity<>'' or attgenerated<>''))
     or exists (select 1 from pg_inherits where inhrelid='public.user_book_resume_bookmarks'::regclass or inhparent='public.user_book_resume_bookmarks'::regclass)
     or exists (select 1 from pg_trigger where tgrelid='public.user_book_resume_bookmarks'::regclass and not tgisinternal) then
    raise exception 'Unexpected private bookmark defaults, inheritance, or triggers';
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.user_book_resume_bookmarks'::regclass and conname='user_book_resume_bookmarks_pkey' and contype='p' and conkey=array[1,2]::smallint[])
     or not exists (select 1 from pg_constraint where conrelid='public.user_book_resume_bookmarks'::regclass and conname='user_book_resume_bookmarks_user_fk' and contype='f' and conkey=array[1]::smallint[] and confrelid='auth.users'::regclass and confdeltype='c' and confupdtype='a' and confkey=array[(select attnum from pg_attribute where attrelid='auth.users'::regclass and attname='id')]::smallint[] and convalidated)
     or not exists (select 1 from pg_constraint where conrelid='public.user_book_resume_bookmarks'::regclass and conname='user_book_resume_bookmarks_book_fk' and contype='f' and conkey=array[2]::smallint[] and confrelid='public.user_books'::regclass and confdeltype='c' and confupdtype='a' and confkey=array[(select attnum from pg_attribute where attrelid='public.user_books'::regclass and attname='id')]::smallint[] and convalidated) then
    raise exception 'Unexpected private bookmark primary/foreign key contract';
  end if;
  if exists (select 1 from pg_constraint where conrelid='public.user_book_resume_bookmarks'::regclass and contype<>'n' and conname not in ('user_book_resume_bookmarks_pkey','user_book_resume_bookmarks_user_fk','user_book_resume_bookmarks_book_fk','user_book_resume_bookmarks_valid'))
     or exists (select 1 from pg_policies where schemaname='public' and tablename='user_book_resume_bookmarks' and policyname not in ('resume_bookmark_select_own','resume_bookmark_insert_own','resume_bookmark_update_own','resume_bookmark_delete_own')) then
    raise exception 'Unexpected private bookmark constraints or policies';
  end if;
  for r in select acl.grantee,c.relowner from pg_class c cross join lateral aclexplode(c.relacl) acl where c.oid='public.user_book_resume_bookmarks'::regclass loop
    if r.grantee<>0 and r.grantee<>r.relowner and pg_get_userbyid(r.grantee) not in ('anon','authenticated','service_role') then
      raise exception 'Unexpected private bookmark grantee';
    end if;
  end loop;
  if exists (select 1 from pg_attribute a cross join lateral aclexplode(a.attacl) acl where a.attrelid='public.user_book_resume_bookmarks'::regclass) then
    raise exception 'Unexpected private bookmark column grants';
  end if;
end $$;

-- Support the Library-entry foreign-key cascade without scanning all readers.
create index if not exists user_book_resume_bookmarks_book_idx
  on public.user_book_resume_bookmarks(user_book_id);

-- Revalidate this feature's own CHECK on repeat; invalid existing rows cause a
-- transaction rollback. Never reinterpret or rewrite saved bookmark values.
alter table public.user_book_resume_bookmarks drop constraint if exists user_book_resume_bookmarks_valid;
alter table public.user_book_resume_bookmarks add constraint user_book_resume_bookmarks_valid check (
  kind in ('top','end','phrase') and page>=0 and
  ((kind='phrase' and nullif(btrim(phrase),'') is not null and char_length(phrase)<=500)
   or (kind in ('top','end') and phrase is null))
);
alter table public.user_book_resume_bookmarks enable row level security;
alter table public.user_book_resume_bookmarks force row level security;

-- Override Supabase default table grants, including possible service_role grants.
revoke all on public.user_book_resume_bookmarks from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.user_book_resume_bookmarks to authenticated;

do $$
begin
  if has_table_privilege('anon','public.user_book_resume_bookmarks','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     or has_table_privilege('service_role','public.user_book_resume_bookmarks','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'Unexpected inherited anonymous/service-role access to private bookmarks';
  end if;
end $$;

drop policy if exists resume_bookmark_select_own on public.user_book_resume_bookmarks;
drop policy if exists resume_bookmark_insert_own on public.user_book_resume_bookmarks;
drop policy if exists resume_bookmark_update_own on public.user_book_resume_bookmarks;
drop policy if exists resume_bookmark_delete_own on public.user_book_resume_bookmarks;

-- Private ownership stays pinned to the original reader, even if an existing
-- teacher operation transfers the Library row. A new reader gets a separate key.
-- The original reader can still read/delete their own private cue directly; the
-- app additionally requires current Library ownership to present it.
create policy resume_bookmark_select_own on public.user_book_resume_bookmarks
  for select to authenticated using (user_id=(select auth.uid()));
create policy resume_bookmark_delete_own on public.user_book_resume_bookmarks
  for delete to authenticated using (user_id=(select auth.uid()));
create policy resume_bookmark_insert_own on public.user_book_resume_bookmarks
  for insert to authenticated with check (
    user_id=(select auth.uid()) and exists (
      select 1 from public.user_books ub where ub.id=user_book_resume_bookmarks.user_book_id and ub.user_id=(select auth.uid())
    )
  );
create policy resume_bookmark_update_own on public.user_book_resume_bookmarks
  for update to authenticated using (user_id=(select auth.uid())) with check (
    user_id=(select auth.uid()) and exists (
      select 1 from public.user_books ub where ub.id=user_book_resume_bookmarks.user_book_id and ub.user_id=(select auth.uid())
    )
  );

comment on table public.user_book_resume_bookmarks is
  'Private reader-owned resume cues. Reader and Library deletion cascade; Library ownership transfers do not transfer private cue ownership.';
notify pgrst, 'reload schema';
commit;
