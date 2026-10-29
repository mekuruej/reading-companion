-- Prefer application rollback while retaining this additive schema once reviews exist.
-- This destructive schema rollback is allowed only before any provenance is recorded.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.books IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.books WHERE reader_created OR catalog_reviewed_at IS NOT NULL OR catalog_reviewed_by IS NOT NULL) THEN
    RAISE EXCEPTION 'Review/provenance data exists. Retain schema or prepare a separately approved preservation plan.';
  END IF;
END $$;
DROP TRIGGER guard_reader_catalog_review ON public.books;
DROP FUNCTION public.guard_reader_catalog_review();
DROP INDEX public.books_pending_reader_review;
ALTER TABLE public.books DROP CONSTRAINT books_catalog_review_state,
  DROP COLUMN catalog_reviewed_by, DROP COLUMN catalog_reviewed_at, DROP COLUMN reader_created;
COMMIT;
