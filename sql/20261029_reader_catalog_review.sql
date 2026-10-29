BEGIN;
SET LOCAL lock_timeout = '5s';
-- Deliberately fail on an existing/partial installation; reconcile before rerunning.
ALTER TABLE public.books
  ADD COLUMN reader_created boolean NOT NULL DEFAULT false,
  ADD COLUMN catalog_reviewed_at timestamptz,
  ADD COLUMN catalog_reviewed_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT books_catalog_review_state CHECK (
    (catalog_reviewed_at IS NULL AND catalog_reviewed_by IS NULL) OR
    (reader_created AND catalog_reviewed_at IS NOT NULL AND catalog_reviewed_by IS NOT NULL)
  );
CREATE INDEX books_pending_reader_review ON public.books(created_at, id)
  WHERE reader_created AND catalog_reviewed_at IS NULL;
CREATE FUNCTION public.guard_reader_catalog_review() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.catalog_reviewed_at IS NOT NULL OR NEW.catalog_reviewed_by IS NOT NULL THEN
      RAISE EXCEPTION 'New catalog books cannot be inserted as reviewed.' USING ERRCODE='42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.reader_created IS DISTINCT FROM OLD.reader_created THEN
    -- Only an explicitly approved database-owner reconciliation may tag history.
    IF current_user <> 'postgres' OR auth.uid() IS NOT NULL OR OLD.reader_created OR NOT NEW.reader_created THEN
      RAISE EXCEPTION 'Catalog provenance cannot be changed.' USING ERRCODE='42501';
    END IF;
  END IF;
  IF NEW.catalog_reviewed_at IS DISTINCT FROM OLD.catalog_reviewed_at
     OR NEW.catalog_reviewed_by IS DISTINCT FROM OLD.catalog_reviewed_by THEN
    IF NOT OLD.reader_created OR OLD.catalog_reviewed_at IS NOT NULL
       OR NEW.catalog_reviewed_at IS NULL OR NEW.catalog_reviewed_by IS DISTINCT FROM auth.uid()
       OR auth.uid() IS NULL OR NOT EXISTS (
         SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
           AND (p.role IN ('admin','super_teacher') OR p.is_super_teacher IS TRUE)
       ) THEN
      RAISE EXCEPTION 'Admin or super teacher review is required.' USING ERRCODE='42501';
    END IF;
    NEW.catalog_reviewed_at := statement_timestamp();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_reader_catalog_review() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER guard_reader_catalog_review BEFORE INSERT OR UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION public.guard_reader_catalog_review();
COMMIT;
