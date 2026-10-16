\set ON_ERROR_STOP on

-- Run after applying sql/20261015_word_sky_reference_pool_only.sql to the
-- disposable synthetic database. Expected to fail with a specific exception
-- if privacy, grants, identity compatibility, or the RPC shape is wrong.
BEGIN;

DO $role_preflight$
BEGIN
  IF NOT pg_catalog.pg_has_role(current_user, 'authenticated', 'SET') THEN
    RAISE EXCEPTION 'POST-FIX TEST FAILED: connected role % cannot SET ROLE authenticated; no assertion was run', current_user;
  END IF;
END;
$role_preflight$;

DO $privilege_assertions$
DECLARE
  public_can_execute boolean;
BEGIN
  IF has_function_privilege('anon', 'public.get_word_sky_pool(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POST-FIX TEST FAILED: anon still has effective EXECUTE permission';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.get_word_sky_pool(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POST-FIX TEST FAILED: authenticated lost EXECUTE permission';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.get_word_sky_pool(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POST-FIX TEST FAILED: service_role compatibility grant is missing';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) AS acl
    WHERE p.oid = 'public.get_word_sky_pool(integer)'::regprocedure
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ) INTO public_can_execute;

  IF public_can_execute THEN
    RAISE EXCEPTION 'POST-FIX TEST FAILED: PUBLIC still has EXECUTE permission';
  END IF;
END;
$privilege_assertions$;

SET LOCAL request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;

DO $pool_assertions$
DECLARE
  own_rows integer;
  other_rows integer;
  reference_rows integer;
  personal_rows integer;
  wrong_key_rows integer;
BEGIN
  SELECT count(*) FILTER (WHERE surface = '個人語甲'),
         count(*) FILTER (WHERE surface = '個人語乙')
    INTO own_rows, other_rows
  FROM public.user_library_word_summaries;

  IF own_rows <> 1 OR other_rows <> 0 THEN
    RAISE EXCEPTION 'POST-FIX TEST FAILED: direct RLS should still expose only User A''s own row (A=1, B=0); got A=%, B=%', own_rows, other_rows;
  END IF;

  -- Keep the RPC selection restricted to its real returned columns.
  SELECT count(*) FILTER (WHERE surface = '参照語'),
         count(*) FILTER (WHERE surface IN ('個人語甲', '個人語乙')),
         count(*) FILTER (
           WHERE surface = '参照語'
             AND study_identity_key <> '参照語||さんしょうご'
         )
    INTO reference_rows, personal_rows, wrong_key_rows
  FROM public.get_word_sky_pool(300);

  IF reference_rows <> 1 THEN
    RAISE EXCEPTION 'POST-FIX TEST FAILED: expected the one eligible synthetic reference word; got %', reference_rows;
  END IF;
  IF personal_rows <> 0 THEN
    RAISE EXCEPTION 'POST-FIX TEST FAILED: expected zero synthetic personal words in the shared pool; got %', personal_rows;
  END IF;
  IF wrong_key_rows <> 0 THEN
    RAISE EXCEPTION 'POST-FIX TEST FAILED: reference word study_identity_key changed from the established format';
  END IF;
END;
$pool_assertions$;

ROLLBACK;
\echo 'PASS: authenticated callers retain the RPC, anon/PUBLIC are denied, direct RLS remains owner-scoped, only the reference fixture is returned, and its identity key is preserved.'
