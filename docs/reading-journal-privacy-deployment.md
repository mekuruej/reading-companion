# Reading Journal privacy deployment

This release makes the six Reading Journal tables and the private notes/quotes attached to a book owner-only. Reading Reflections remain community-facing. Teacher access to student books, reading progress, checkpoints, and lesson vocabulary remains separate from journal access.

## Known historical note limitation

`user_books.notes` was a mixed field and did not identify whether each value was written as a reader's personal journal note or as a teacher assessment note. The migration preserves each existing value by moving it into that book owner's private journal. By the confirmed product decision, a historical linked-student note in this mixed field may therefore become private journal content instead of a historical Teaching Assessment note. There is no reliable attribution data to split the old values. The migration does not delete the original content before copying it, and new teacher assessment notes use `teacher_user_book_assessment_notes`, which is teacher-owned storage.

## Migration behavior and rerun safety

Apply `sql/20261014_private_reading_journal_ownership.sql` exactly once. It uses a transaction and records the migration name in `public.mekuru_migration_state`. A rerun detects the recorded name and raises an error before any data or policy changes; the transaction rolls back. Do not remove the marker to force a rerun. If the SQL client reports an error, first inspect the database state and migration marker, then use a reviewed repair procedure rather than replaying the file blindly.

The backfill preserves pre-existing private values. Where a private journal row already exists, its non-null values win; a missing private value is filled from the corresponding legacy field. After the copy, the migration drops only the duplicate `user_books.notes` and `user_books.favorite_quotes` columns. It leaves reflections and unrelated book data in place.

## Compatibility and deployment order

The old application reads/writes `user_books.notes` and `user_books.favorite_quotes`; the new application reads/writes `user_book_private_journals` and stores teacher assessment notes in `teacher_user_book_assessment_notes`. Keeping the old columns publicly readable to support an older app would violate the privacy requirement. Therefore, serving old and new application versions concurrently across the schema change is unsafe. Use a short maintenance window unless the hosting platform can atomically switch all production traffic to the new, already-built version at the exact schema cutover.

Recommended order:

1. Build and test the new Vercel deployment without promoting it to the production domain. Verify that its commit includes this migration-compatible application code and the privacy regression tests.
2. Prepare and verify a restorable database backup using the approved Supabase operational process. Schedule the short maintenance window and prevent new production requests from reaching the old app. A maintenance page or route should return a clear temporary-unavailability response for the app domain; ensure APIs/server actions that could write are also unavailable. Do not rely only on hiding the UI.
3. While maintenance is active, apply the SQL file once to the intended Supabase database using the approved release process. This SQL lives under `sql/`; confirm the chosen migration mechanism explicitly includes it rather than assuming `supabase db push` will discover it.
4. Verify the migration marker exists, the two legacy columns are absent, the private journal and teacher assessment note tables exist, the owner-only RLS policies are installed, and the migrated values are present. Run the reviewed database smoke checks with owner and non-owner identities before restoring traffic.
5. Promote the already-built Vercel deployment to the production domain while maintenance remains active. Run smoke checks for an owner's journal read/write, linked teacher/admin/super-teacher denial, the teacher's own journal, new teacher assessment notes, Reading Reflections, Find Your Next Book, and teacher lesson vocabulary/progress.
6. Restore normal traffic only after those checks pass.

If a genuine zero-downtime rollout is required, first implement and review an explicitly staged application/schema compatibility design. Do not leave legacy journal columns readable as a shortcut. Without that design, maintenance is the safe rollout.

## Rollback

Do not roll back by redeploying the old application after the migration: it depends on columns that the migration removes and could reintroduce exposure if those columns are recreated carelessly. If the new deployment fails, keep maintenance enabled and fix forward. A database rollback requires a separately reviewed recovery migration that restores data from the private journal and teacher-owned note table, and must account for the ambiguous historical mixed notes. Preserve the backup and the migration marker until recovery is complete.
