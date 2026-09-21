-- Shared book-level awards and reading selections.
-- Uses the existing books SELECT/UPDATE permissions; no new access grants.
begin;
alter table public.books
  add column if not exists awards jsonb not null default '[]'::jsonb;
comment on column public.books.awards is
  'Book awards and reading selections: [{id,name,kind,year,result,detail,source_url}]. Author lifetime awards belong on person profiles.';
notify pgrst, 'reload schema';
commit;
