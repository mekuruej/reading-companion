-- Word Sky hotfix: expose only the shared starter/reference pool.
--
-- This deliberately preserves the existing function signature, output columns,
-- and study_identity_key format. It does not modify user vocabulary or progress.
-- The service_role grant is retained for compatibility with existing backend
-- integrations; this function now returns only shared reference rows.

BEGIN;

DO $guard$
DECLARE
  pool_function_count integer;
BEGIN
  SELECT pg_catalog.count(*)
    INTO pool_function_count
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_word_sky_pool';

  IF pool_function_count <> 1
     OR pg_catalog.to_regprocedure('public.get_word_sky_pool(integer)') IS NULL THEN
    RAISE EXCEPTION
      'Expected exactly public.get_word_sky_pool(integer); found % overload(s). Inspect before applying this hotfix.',
      pool_function_count;
  END IF;
END;
$guard$;

CREATE OR REPLACE FUNCTION public.get_word_sky_pool(p_limit integer DEFAULT 140)
RETURNS TABLE (
  study_identity_key text,
  surface text,
  reading text,
  meaning text,
  jlpt text,
  total_encounter_count integer,
  book_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $word_sky_pool$
  WITH requested AS (
    SELECT greatest(
      1,
      least(coalesce(p_limit, 140), 300)
    ) AS row_limit
  ),
  eligible AS (
    SELECT
      public.library_study_identity_key(w.surface, w.reading) AS study_identity_key,
      w.surface,
      w.reading,
      w.meaning,
      w.jlpt_level AS jlpt,
      0::integer AS total_encounter_count,
      0::integer AS book_count,
      pg_catalog.random() AS selection_order
    FROM public.word_sky_starter_words AS w
    WHERE w.active IS TRUE
      AND w.jlpt_level IN ('N5', 'N4', 'N3')
      AND nullif(pg_catalog.btrim(coalesce(w.surface, '')), '') IS NOT NULL
      AND nullif(pg_catalog.btrim(coalesce(w.reading, '')), '') IS NOT NULL
      AND nullif(pg_catalog.btrim(coalesce(w.meaning, '')), '') IS NOT NULL
  ),
  one_entry_per_identity AS (
    SELECT DISTINCT ON (e.study_identity_key)
      e.study_identity_key,
      e.surface,
      e.reading,
      e.meaning,
      e.jlpt,
      e.total_encounter_count,
      e.book_count
    FROM eligible AS e
    ORDER BY e.study_identity_key, e.selection_order
  )
  SELECT
    e.study_identity_key,
    e.surface,
    e.reading,
    e.meaning,
    e.jlpt,
    e.total_encounter_count,
    e.book_count
  FROM one_entry_per_identity AS e
  ORDER BY pg_catalog.random()
  LIMIT (SELECT r.row_limit FROM requested AS r);
$word_sky_pool$;

REVOKE EXECUTE ON FUNCTION public.get_word_sky_pool(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_word_sky_pool(integer) TO authenticated, service_role;

COMMIT;
