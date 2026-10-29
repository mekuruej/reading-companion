-- Reader Add Book: allow NULL author on INSERT only; preserve existing UPDATE validation.
-- Language, format, title, owner/RLS/grants and all existing rows remain unchanged.
-- Captured baseline guard: fresh live preflight is still required. Exact reapplication is safe.
BEGIN;
DO $preflight$
DECLARE existing pg_catalog.pg_proc%ROWTYPE;
BEGIN
  SELECT p.* INTO existing FROM pg_catalog.pg_proc p
  WHERE p.oid = to_regprocedure('public.validate_book_core_metadata()');
  IF existing.oid IS NULL OR existing.prosecdef
     OR existing.prorettype <> 'trigger'::regtype
     OR existing.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[]
     OR md5(existing.prosrc) NOT IN ('ea207477d7dc76df5e025a2668e0a08d', '6dcb6ecd67b9ef8d034b3bbc4215a3de') THEN
    RAISE EXCEPTION 'Unexpected core metadata validation definition; stop and reconcile before applying.';
  END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION public.validate_book_core_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if (TG_OP = 'INSERT' or NEW.title is distinct from OLD.title)
     and nullif(btrim(NEW.title), '') is null then
    raise exception 'Title is required.' using errcode = '23514';
  end if;
  if ((TG_OP = 'INSERT' and NEW.author is not null)
      or (TG_OP = 'UPDATE' and NEW.author is distinct from OLD.author))
     and nullif(btrim(NEW.author), '') is null then
    raise exception 'Author is required.' using errcode = '23514';
  end if;
  -- Application entry points normalize language aliases to two-letter codes.
  if (TG_OP = 'INSERT' or NEW.language_code is distinct from OLD.language_code)
     and (NEW.language_code is null or NEW.language_code !~ '^[a-z]{2}$') then
    raise exception 'Language is required (two-letter language code).' using errcode = '23514';
  end if;
  if (TG_OP = 'INSERT' or NEW.edition_format is distinct from OLD.edition_format)
     and (NEW.edition_format is null or NEW.edition_format not in
       ('bunko', 'tankobon_hardcover', 'tankobon_softcover', 'paperback',
        'hardcover', 'ebook', 'audiobook', 'other')) then
    raise exception 'Format is required.' using errcode = '23514';
  end if;
  return NEW;
end $function$;

COMMIT;
