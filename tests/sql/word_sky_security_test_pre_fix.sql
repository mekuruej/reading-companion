\set ON_ERROR_STOP on

-- Expected to PASS only when the fixture demonstrates the pre-fix exposure.
BEGIN;

DO $role_preflight$
BEGIN
  IF NOT pg_catalog.pg_has_role(current_user, 'authenticated', 'SET') THEN
    RAISE EXCEPTION 'PRE-FIX TEST FAILED: connected role % cannot SET ROLE authenticated; no assertion was run', current_user;
  END IF;
END;
$role_preflight$;

SET LOCAL request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;

DO $assertions$
DECLARE
  own_rows integer;
  other_rows integer;
  leaked_rows integer;
  leaked_a integer;
  leaked_b integer;
BEGIN
  SELECT count(*) FILTER (WHERE surface = '個人語甲'),
         count(*) FILTER (WHERE surface = '個人語乙')
    INTO own_rows, other_rows
  FROM public.user_library_word_summaries;

  IF own_rows <> 1 OR other_rows <> 0 THEN
    RAISE EXCEPTION 'PRE-FIX TEST FAILED: direct RLS should expose only User A''s own row (A=1, B=0); got A=%, B=%', own_rows, other_rows;
  END IF;

  -- Query only columns actually returned by get_word_sky_pool(integer).
  SELECT count(*) FILTER (WHERE surface IN ('個人語甲', '個人語乙')),
         count(*) FILTER (WHERE surface = '個人語甲'),
         count(*) FILTER (WHERE surface = '個人語乙')
    INTO leaked_rows, leaked_a, leaked_b
  FROM public.get_word_sky_pool(300);

  IF leaked_rows <> 2 OR leaked_a <> 1 OR leaked_b <> 1 THEN
    RAISE EXCEPTION 'PRE-FIX TEST FAILED: expected the vulnerable SECURITY DEFINER RPC to expose both synthetic personal rows (A=1, B=1); got total=%, A=%, B=%', leaked_rows, leaked_a, leaked_b;
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.get_word_sky_pool(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PRE-FIX TEST FAILED: authenticated execution should be enabled in the fixture';
  END IF;
END;
$assertions$;

ROLLBACK;
\echo 'PASS: direct RLS exposes only User A row, while the pre-fix SECURITY DEFINER RPC exposes both synthetic personal rows.'
