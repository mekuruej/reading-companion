# Synthetic Word Sky database security test

These scripts use only synthetic records and are guarded to run in the empty
`mekuru_word_sky_test` database. They do not connect to production or staging.
The setup refuses to run if the database name, required Supabase roles, or
expected-empty object state is wrong. Do not remove that guard or reuse this
fixture in a database containing application data.

The connecting role does not need to be a superuser. It must be able to create
objects in the test database and `public` schema, and it must have PostgreSQL
`SET` membership on `authenticated` so the direct-RLS assertions can run as
that role. The setup checks these prerequisites inside its transaction before
creating fixtures and aborts without leaving objects if one is absent. The
`SECURITY DEFINER` function and its synthetic table are owned by the connecting
role; as table owner (with RLS not forced), it has the owner-level access needed
to reproduce the pre-fix exposure.

Run from `/private/tmp/mekuru-word-sky-hotfix` with `psql` installed:

1. Run `tests/sql/word_sky_security_test_setup.sql`. It creates a minimal auth
   claim helper, the two relevant tables, owner-only RLS for personal summaries,
   one synthetic reference entry, two synthetic personal entries owned by
   distinct UUIDs, and the vulnerable pre-fix RPC.
2. Run `tests/sql/word_sky_security_test_pre_fix.sql`. It must pass by proving
   that direct authenticated RLS sees only User A's row while the old
   `SECURITY DEFINER` RPC leaks both synthetic rows. The RPC is queried only
   through its actual return columns; `user_id` is not part of its result.
3. Apply `sql/20261015_word_sky_reference_pool_only.sql` to this test database
   only.
4. Run `tests/sql/word_sky_security_test_post_fix.sql`. It asserts the reference
   row remains, both personal rows are absent from the pool, direct RLS remains
   owner-scoped, `PUBLIC` and `anon` lack execution, `authenticated` and
   `service_role` retain execution, and the synthetic reference keeps its
   established identity key.

Every script sets psql `ON_ERROR_STOP`; any SQL error exits immediately with a
nonzero status. The verification scripts wrap their checks in transactions
and roll back at the end. The setup is intentionally one-shot and fails rather
than replacing existing fixture objects. To repeat from scratch, request a
separate empty disposable test database instead of dropping objects here.

The helper definition is copied from
`sql/20260501_library_word_summaries_01_table.sql`; this preserves the current
hiragana-normalized `surface||reading` identity behavior used by the migration.
