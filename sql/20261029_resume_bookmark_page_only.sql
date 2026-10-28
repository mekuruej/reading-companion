-- PREPARED ONLY: requires separate review and approval before any Production execution.
-- Extends only the private bookmark CHECK; no data, RLS, grants, or teaching changes.
begin;

do $guard$
declare existing text;
begin
  if to_regclass('public.user_book_resume_bookmarks') is null then
    raise exception 'Install the reviewed private bookmark table before this extension';
  end if;
  if not exists (select 1 from pg_class where oid='public.user_book_resume_bookmarks'::regclass and relrowsecurity and relforcerowsecurity) then
    raise exception 'Private bookmark ENABLE/FORCE RLS contract is required';
  end if;
  select pg_get_constraintdef(oid) into existing from pg_constraint
    where conrelid='public.user_book_resume_bookmarks'::regclass
      and conname='user_book_resume_bookmarks_valid' and contype='c' and convalidated;
  if existing is null or regexp_replace(existing, '\s+', '', 'g') not in (
    regexp_replace($old$CHECK (((kind = ANY (ARRAY['top'::text, 'end'::text, 'phrase'::text])) AND (page >= 0) AND (((kind = 'phrase'::text) AND (NULLIF(btrim(phrase), ''::text) IS NOT NULL) AND (char_length(phrase) <= 500)) OR ((kind = ANY (ARRAY['top'::text, 'end'::text])) AND (phrase IS NULL)))))$old$, '\s+', '', 'g'),
    regexp_replace($new$CHECK (((kind = ANY (ARRAY['page'::text, 'top'::text, 'end'::text, 'phrase'::text])) AND (page >= 0) AND (((kind = 'phrase'::text) AND (NULLIF(btrim(phrase), ''::text) IS NOT NULL) AND (char_length(phrase) <= 500)) OR ((kind = ANY (ARRAY['page'::text, 'top'::text, 'end'::text])) AND (phrase IS NULL)))))$new$, '\s+', '', 'g')
  ) then
    raise exception 'Unexpected private bookmark CHECK contract; stop and inspect drift';
  end if;
end $guard$;

alter table public.user_book_resume_bookmarks drop constraint user_book_resume_bookmarks_valid;
alter table public.user_book_resume_bookmarks add constraint user_book_resume_bookmarks_valid check (
  kind in ('page','top','end','phrase') and page>=0 and
  ((kind='phrase' and nullif(btrim(phrase),'') is not null and char_length(phrase)<=500)
   or (kind in ('page','top','end') and phrase is null))
);
notify pgrst, 'reload schema';
commit;
