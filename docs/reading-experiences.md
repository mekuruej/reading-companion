# Reading Experiences

The book's teaching actions open /teacher/reading-experiences/[bookId], keyed by the normal catalog book ID. Student Study Tools adds ?person=[profileId] to the same page; no separate student reflection store exists.

## Data and compatibility

- Overall Assessment reads/writes the existing teacher_books fields: teacher_jlpt_difficulty, teaching_suitability, teacher_use_status, teacher_use_note. The API uses the existing unique teacher_id/book_id key and changes only assessment fields. Existing user_book_id, teaching_status and prep content are preserved. This is a compatibility adapter, not a new Teaching Book identity exposed to the feature.
- book_reading_experiences holds repeatable, private records with teacher_id, book_id, person_id, experienced_on, optional context and notes. There is no teacher_book_id and no teacher_students requirement or uniqueness per person/book. Deleting a person's profile leaves the teacher's notes intact with a null person reference.
- Each experience can record an optional reader_level snapshot (MEKURU Level 1–10) and level_fit. These are entered and edited with the person, date, context and notes. Changing a profile level never changes historical experiences. Any future level aggregates should come from these experience records.
- The separate book_teaching_reflections system is removed. The owner confirmed there is no former feedback to preserve or migrate; the reader-details migration drops its table.
- Teacher Journal remains a secondary book action, with all journal data unchanged.
- Find Your Next Teaching Book uses structured assessments from all teachers, keyed to canonical books, without requiring personal-library membership. Teacher notes, teacher IDs and Reading Experiences are excluded from the shared response. The original badge colors and all distinct contributed values are retained; no averaging is used.
- Needs My Assessment is a separate queue of the signed-in teacher’s personal Japanese library, deduplicated by catalog book. Teaching-only copies are excluded. Assess links to the canonical Overall Teaching Assessment. Saving records assessed_at and refreshes the queue on return/focus or immediately in another open tab. Not for Teaching is a completed assessment.
- Legacy meaningful assessments count as complete; automatically created workflow-only rows do not. New explicit saves count even if optional fields are blank. No duplicate assessment editor is retained on the discovery page.

## People selection and access

Teachers, admins and super-teachers can resolve an exact MEKURU username. The response includes only profile ID, display name and username. It does not expose emails or a user directory. UUID shortcuts resolve an existing teacher/student connection or a person already in that teacher's experiences.

The existing /api/teacher/users/search endpoint is intentionally unchanged: it is an elevated directory/email search. Reading Experiences needs a narrower identity lookup available to ordinary teachers.

Every history query and edit is scoped to the authenticated teacher; client-supplied teacher IDs are ignored. RLS independently restricts direct database access. Selecting a person never creates a student link or grants access to their library, vocabulary or lesson workspace.

## Rollout

Before deploying, apply sql/20260928_book_reading_experiences.sql, then sql/20260928_reading_experience_reader_details.sql, then sql/20260928_teaching_assessment_completion.sql. All are rerunnable. The second adds nullable reader_level and level_fit fields and drops the unused book_teaching_reflections table. Existing experiences and overall assessments are preserved. The completion migration adds assessed_at to existing teacher_books assessment storage and backfills meaningful assessments.

The page keeps the assessment available and reports an unavailable history if the new table cannot be read. It disables experience saving in that state.

No live migration or deployment is included in this change.
