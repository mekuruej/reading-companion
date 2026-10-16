\set ON_ERROR_STOP on

-- Synthetic Word Sky security fixture.
-- Run only against the dedicated, disposable mekuru_word_sky_test database.
-- This setup deliberately fails if the database is not empty; it never drops
-- or replaces pre-existing objects.

BEGIN;

DO $guard$
DECLARE
  missing_roles text;
BEGIN
  IF current_database() <> 'mekuru_word_sky_test' THEN
    RAISE EXCEPTION 'Refusing setup in database %; expected mekuru_word_sky_test', current_database();
  END IF;

  IF NOT has_database_privilege(current_user, current_database(), 'CREATE') THEN
    RAISE EXCEPTION 'Setup prerequisite missing: role % needs CREATE on database % to create the isolated auth helper schema', current_user, current_database();
  END IF;

  IF NOT has_schema_privilege(current_user, 'public', 'USAGE')
     OR NOT has_schema_privilege(current_user, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Setup prerequisite missing: role % needs USAGE and CREATE on schema public for the isolated fixtures', current_user;
  END IF;

  IF NOT has_schema_privilege('authenticated', 'public', 'USAGE') THEN
    RAISE EXCEPTION 'Setup prerequisite missing: authenticated needs USAGE on schema public for direct-RLS and RPC assertions';
  END IF;

  IF NOT pg_catalog.pg_has_role(current_user, 'authenticated', 'SET') THEN
    RAISE EXCEPTION 'Setup prerequisite missing: role % needs SET membership on authenticated so the scripts can test authenticated RLS with SET ROLE; no fixture objects were created', current_user;
  END IF;

  SELECT string_agg(required.role_name, ', ')
    INTO missing_roles
  FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS required(role_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles AS r WHERE r.rolname = required.role_name
  );

  IF missing_roles IS NOT NULL THEN
    RAISE EXCEPTION 'Required Supabase roles are missing: %', missing_roles;
  END IF;

  IF pg_catalog.to_regclass('public.word_sky_starter_words') IS NOT NULL
     OR pg_catalog.to_regclass('public.user_library_word_summaries') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.get_word_sky_pool(integer)') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.library_study_identity_key(text,text)') IS NOT NULL
     OR pg_catalog.to_regnamespace('auth') IS NOT NULL THEN
    RAISE EXCEPTION 'Expected an empty synthetic test database; Word Sky/auth objects already exist. Refusing to overwrite them.';
  END IF;
END;
$guard$;

CREATE SCHEMA auth;

-- Minimal local stand-in for Supabase auth.uid(), using only synthetic claims.
CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $auth_uid$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$auth_uid$;

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

-- Exact identity-key implementation used by MEKURU's library summaries.
CREATE FUNCTION public.library_study_identity_key(
  p_surface text,
  p_reading text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $identity_key$
  SELECT CASE
    WHEN btrim(coalesce(p_surface, '')) = '' THEN ''
    ELSE
      lower(regexp_replace(btrim(coalesce(p_surface, '')), '\s+', ' ', 'g'))
      || '||' ||
      lower(
        translate(
          regexp_replace(btrim(coalesce(p_reading, '')), '\s+', '', 'g'),
          'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヶ',
          'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゖ'
        )
      )
  END;
$identity_key$;

CREATE TABLE public.word_sky_starter_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface text NOT NULL,
  reading text NOT NULL,
  meaning text NOT NULL,
  jlpt_level text NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1', 'NON-JLPT')),
  source text NOT NULL DEFAULT 'manual',
  source_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_library_word_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  study_identity_key text NOT NULL,
  surface text,
  reading text,
  meaning text,
  jlpt text,
  total_encounter_count integer NOT NULL DEFAULT 0,
  book_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.word_sky_starter_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library_word_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY word_sky_starter_words_select_authenticated
  ON public.word_sky_starter_words
  FOR SELECT TO authenticated
  USING (active IS TRUE);

CREATE POLICY user_library_word_summaries_select_own
  ON public.user_library_word_summaries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.word_sky_starter_words, public.user_library_word_summaries TO authenticated;

-- Synthetic identities only. User A can directly read one row; User B owns
-- the other row. Neither value is real user data.
INSERT INTO public.word_sky_starter_words (surface, reading, meaning, jlpt_level, source, active)
VALUES ('参照語', 'さんしょうご', 'synthetic approved reference word', 'N5', 'synthetic-test', true);

INSERT INTO public.user_library_word_summaries (
  user_id, study_identity_key, surface, reading, meaning, jlpt, total_encounter_count, book_count
)
VALUES
  ('10000000-0000-4000-8000-000000000001', public.library_study_identity_key('個人語甲', 'こじんごこう'), '個人語甲', 'こじんごこう', 'synthetic private word A', 'N5', 1, 1),
  ('20000000-0000-4000-8000-000000000002', public.library_study_identity_key('個人語乙', 'こじんごおつ'), '個人語乙', 'こじんごおつ', 'synthetic private word B', 'N5', 1, 1);

-- Reproduce the vulnerable pre-fix pool shape: shared reference rows plus
-- unscoped user summaries, while retaining the real RPC's seven output
-- columns. In particular, user_id is not a returned column.
CREATE FUNCTION public.get_word_sky_pool(p_limit integer DEFAULT 140)
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
SET search_path = public
AS $old_pool$
  WITH requested AS (
    SELECT greatest(1, least(coalesce(p_limit, 140), 300)) AS row_limit
  ),
  starter_pool AS (
    SELECT
      public.library_study_identity_key(w.surface, w.reading) AS study_identity_key,
      w.surface,
      w.reading,
      w.meaning,
      w.jlpt_level AS jlpt,
      0::integer AS total_encounter_count,
      0::integer AS book_count
    FROM public.word_sky_starter_words AS w
    WHERE w.active IS TRUE
      AND w.jlpt_level IN ('N5', 'N4', 'N3')
      AND nullif(btrim(coalesce(w.surface, '')), '') IS NOT NULL
      AND nullif(btrim(coalesce(w.reading, '')), '') IS NOT NULL
      AND nullif(btrim(coalesce(w.meaning, '')), '') IS NOT NULL
    ORDER BY random()
    LIMIT (SELECT row_limit FROM requested)
  ),
  personal_pool AS (
    SELECT
      s.study_identity_key,
      s.surface,
      s.reading,
      s.meaning,
      coalesce(nullif(s.jlpt, ''), 'NON-JLPT') AS jlpt,
      s.total_encounter_count,
      s.book_count
    FROM public.user_library_word_summaries AS s
    WHERE s.jlpt IN ('N5', 'N4', 'N3')
      AND nullif(btrim(coalesce(s.surface, '')), '') IS NOT NULL
      AND nullif(btrim(coalesce(s.reading, '')), '') IS NOT NULL
      AND nullif(btrim(coalesce(s.meaning, '')), '') IS NOT NULL
    ORDER BY random()
    LIMIT (SELECT row_limit FROM requested)
  ),
  mixed_pool AS (
    SELECT * FROM starter_pool
    UNION ALL
    SELECT * FROM personal_pool
  ),
  deduped_pool AS (
    SELECT DISTINCT ON (m.study_identity_key)
      m.study_identity_key,
      m.surface,
      m.reading,
      m.meaning,
      m.jlpt,
      m.total_encounter_count,
      m.book_count
    FROM mixed_pool AS m
    ORDER BY m.study_identity_key, random()
  )
  SELECT
    d.study_identity_key,
    d.surface,
    d.reading,
    d.meaning,
    d.jlpt,
    d.total_encounter_count,
    d.book_count
  FROM deduped_pool AS d
  ORDER BY random()
  LIMIT (SELECT row_limit FROM requested);
$old_pool$;

REVOKE ALL ON FUNCTION public.get_word_sky_pool(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_word_sky_pool(integer) TO authenticated, service_role;

COMMIT;

\echo 'Synthetic Word Sky setup complete. Run the pre-fix assertions, apply the hotfix migration to this database only, then run the post-fix assertions.'
