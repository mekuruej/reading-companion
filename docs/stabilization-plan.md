# Mekuru Stabilization Plan

## Goal

Avoid major new features for now. Focus on making Mekuru safer, easier to understand, and less fragile before wider student access.

Stabilization has two tracks:

1. **Security / Privacy / Access Safety**
2. **Page Thinning / Maintainability**

Detailed page-specific refactor maps live in:

* `docs/refactor-maps/`

## Current Focus

### 1. Security / Privacy / Access Safety

Make sure users can only see and change data they should have access to.

Primary areas:

* route guards
* private book access
* teacher/student access boundaries
* Supabase RLS policies
* API route authorization
* input validation
* public/private profile boundaries
* private saved-word data
* future shared flashcard/deck separation

### 2. Page Thinning / Maintainability

Make large files easier to understand and safer to edit without changing behavior.

Preferred order:

1. Extract low-risk presentational components.
2. Remove unused code.
3. Extract pure helper functions.
4. Move shared types/constants when useful.
5. Move services, DAOs, and controllers later.

## Recently Finished / Stable Enough

### API Routes

Reviewed or tightened:

* `/api/vocabulary-kanji-map/generate`
* `/api/word-sky/approve`
* `/api/jisho`

Paused:

* `/api/book-lookup`

Reason: Add Book / ISBN import flow may change.

### Private Book Routes

Ownership/access guards were added or confirmed for:

* `/books/[userBookId]`
* `/books/[userBookId]/words`
* `/books/[userBookId]/words/[wordId]`
* `/books/[userBookId]/add-word`
* `/books/[userBookId]/curiosity-reading`
* `/books/[userBookId]/study`
* `/books/[userBookId]/just-reading`
* `/books/[userBookId]/listening`
* `/books/[userBookId]/readalong`
* `/books/[userBookId]/stats`

Confirmed:

* owners can access their own books
* regular users are blocked from other users' private book data
* relevant write flows are guarded before saving
* super-teacher access still works where intended

### Non-Book Access Audits

Audited and passed without code changes:

* `/library-study/check`
* `/library-study/practice`
* `/library-study/book-flashcards`
* `/library-study/word-sky`
* `/community/stats`
* `/community/stats/monthly`
* `/community/stats/colors`
* `/community/stats/reading-habits`
* `/community/stats/vocabulary`
* `/community/stats/reading-ability`
* `/community/stats/book-difficulty`
* `/discovery`
* `/discovery/dictionary`
* `/discovery/find-books`
* `/discovery/word-history`

Fixed:

* `/users/[username]/books`
  * regular users now fall back to their own library when manually opening another user's route
  * stats/color counts now use the same safe effective user target
* `/vocab/explore`
  * added `authorizedUserBookId`
  * private queries and links now use the verified owned book ID
* `/vocab/bulk`
  * added `authorizedUserBookId`
  * private queries and writes now use the verified owned book ID

Notes:

* `/discovery` now uses the same anonymous shared-signal boundary as `/discovery/find-books`. It reads public/community rating previews from `public_book_recommendation_signals` instead of private `user_books`, no longer queries `profiles` for reader levels, and relies on the public signal view for anonymous reader level data. The public view does not expose `user_id` or source `user_book_id`; build and browser smoke test passed.
* `/discovery/dictionary` only accepts `word` from search params; Jisho/global lookup is intentional, and personal settings/summaries are scoped to the logged-in user. No code change needed right now.
* `/discovery/find-books` now uses a safer anonymous shared-signal boundary. The internal `book_recommendation_signals` table still keeps `user_id` and `user_book_id` so each user's own Book Hub can sync/update their recommendation signal, but the discovery page reads from `public_book_recommendation_signals`, which does not expose `user_id` or source `user_book_id`. The page separately checks the logged-in viewer's own `user_books` so books already in the viewer's library can link to the viewer's own Book Hub; recommender private book IDs are not used for links.
* `/discovery/word-history` only accepts `word` from search params; logged-in-user learning settings, summaries, fallback history, and search results are scoped to the current user. No code change needed right now.

### Kanji Study / Teacher Kanji Queue

Finished:

* Confirmed `/library-study/kanji` is intentionally global.
* Learner-owned context remains scoped through the logged-in user's own books/words.
* Learner flags now go through `kanji_map_reports`.
* Learners do not directly update global `vocabulary_kanji_map`.
* Teacher Hub and `/teacher/kanji` now show learner-reported kanji queue items.
* Teacher queue clear/save/resolve behavior works for reported flags.

### Teacher Access

Finished enough for now:

* centralized teacher route protection:
  * `components/TeacherAccessGate.tsx`
  * `app/(protected)/teacher/layout.tsx`
* `/teacher/*` blocks regular student/member accounts
* teacher and super-teacher accounts retain access
* `teacher_students` RLS was tightened

Paused:

* `/teacher/assign`
* prep shelf workflow
* future learner prep/tasks
* book assignment/prep workflow

Reason: teacher-side concepts need design clarification before deeper cleanup.

### Profile / Email Privacy

Finished:

* Removed visible email display from profile/account UI.
* Confirmed app profile identity uses username/display name.
* Removed unused profile routes:
  * `/community/profile/account`
  * `/community/profile/reading`
  * `/community/profile/social`
  * `/community/profile/public`
* Removed broad authenticated profile read policy.

Later:

* Audit public profile pages/views.
* Prefer `user_public_profile` or limited public views over exposing full `profiles` rows.

### RLS Review

Reviewed or tightened:

* `teacher_students`
* `profiles`
* `user_books`
* `user_book_words`
* `user_book_reading_sessions`
* `study_logs`
* `user_study_events`
* `user_alerts`
* `user_learning_settings`
* `user_settings`
* `learning_tasks`
* `teacher_book_prep_items`

Removed legacy data:

* old `zzz_old_*` archive tables
  * confirmed app code did not reference them
  * confirmed legacy functions `log_lookup`, `confirm_reading`, and `confirm_meaning` depended on `zzz_old_user_card_progress` but were not used by app code
  * dropped those legacy functions
  * dropped unused `zzz_old_*` archive tables without `cascade`
  * verified no `zzz_old_%` tables remain

Later:

* clean duplicate super-teacher policies
* revisit public profile read policy
* revisit linked-teacher delete/update permissions as workflows mature
* revisit `teacher_alert_completions`

### Removed Legacy Routes

Removed:

* `/books/[userBookId]/weekly-readings`
* `/books/[userBookId]/weekly-readings/prepare`
* `/community/stats/old`

### Reading Level Guide

Finished:

* Restored detailed Mekuru Reading Level Guide.
* Connected it to `level` / `setLevel`.
* Confirmed setup and settings pages use it.

## Still To Do

### API Route Review

Revisit:

* `app/api/book-lookup/route.ts`
* `app/api/jisho/route.ts`
* `app/api/vocabulary-kanji-map/generate/route.ts`
* `app/api/word-sky/approve/route.ts`

### Public / Private Profile Boundary

Confirm public profile surfaces never expose:

* email
* internal roles/access fields
* teacher/student relationships
* private books
* private vocabulary
* study history

### Discovery / Ratings Privacy Boundary

Concern:

* Discovery / Find Your Next Book may need community signals without reading private `user_books`.

Rule:

* Do not make `user_books` broadly readable.

Potential future shared sources:

* `book_reader_signals`
* `public_book_reviews`
* `book_fit_signals`

### Input Validation

Review:

* username
* display name
* bio
* favorite genres
* saved words
* page numbers
* notes
* book add/edit forms
* teacher prep/task forms
* search fields
* long text fields
* empty strings

### Centralize User Book Access

Several routes now have local guards with the same rules:

* owner access
* linked teacher access
* super-teacher access

Later, centralize in something like:

* `lib/access/userBookAccess.ts`
* `canAccessUserBook()`
* `loadAccessibleUserBook()`

Routes likely to benefit:

* Book Hub
* Vocab List
* Add Word
* Curiosity Reading
* Study Flashcards
* reading timers
* Readalong
* Stats

### Future Shared Flashcards

Private data stays private:

* `user_book_words`
* private book flashcards
* private study progress
* reading sessions

Future shared flashcards should use separate structures, for example:

* `shared_flashcard_decks`
* `shared_flashcard_items`
* `user_saved_flashcard_decks`
* `user_flashcard_deck_progress`

## Page Thinning Status

Detailed maps live in:

* `docs/refactor-maps/`

Current status:

* non-teacher first-pass visual component extraction is mostly complete
* teacher pages are intentionally deferred until Teacher Hub / teacher navigation cleanup settles
* tiny static/index pages probably do not need thinning right now
* remaining work is mostly architecture cleanup, not first-pass visual extraction

### Finished: First Visual Pass

Completed or mostly completed first visual passes:

* Reading Habits Stats
* Book Difficulty Stats
* Monthly Stats
* Reading Ability Stats
* Vocabulary Stats
* Colors Stats
* Community Stats Home
* Dashboard
* Discovery Home
* Discovery Dictionary
* Find Books
* Book Add / ISBN Add
* Vocab Explore
* Book Vocab List
* Saved Word Detail
* Word Sky
* Readalong
* Bulk Vocab
* Book Hub
* Book Stats
* Add Word
* Curiosity Reading
* Book Study Flashcards
* Library Kanji Study
* Library Practice
* Library Check
* User Public Books
* Profile Preview
* Profile Settings

Recent first-pass results:

* `app/(protected)/community/profile/preview/page.tsx`

  * 418 → 280
  * -138
* `app/(protected)/community/profile/settings/page.tsx`

  * 541 → 369
  * -172
* `app/(protected)/discovery/dictionary/page.tsx`

  * 468 → 352
  * -116
* `app/(protected)/books/[userBookId]/words/[wordId]/page.tsx`

  * 884 → 711
  * -173
* `app/(protected)/library-study/word-sky/page.tsx`

  * 787 → 702
  * -85

### Finished: Recent Refactor Maps

Recent refactor maps added:

* `docs/refactor-maps/library-practice.md`
* `docs/refactor-maps/library-check.md`
* profile preview refactor/status map
* profile settings refactor/status map
* discovery dictionary refactor/status map

### Deferred: Teacher Area

Teacher pages are intentionally paused until Teacher Hub organization and teacher navigation are cleaned up.

Deferred pages include:

* `/teacher`
* `/teacher/lesson-prep`
* `/teacher/needs-attention`
* `/teacher/general-upkeep`
* `/teacher/global-words`
* `/teacher/words`
* `/teacher/books`
* `/teacher/books/add`
* `/teacher/books/[userBookId]`
* `/teacher/assign`
* `/teacher/reading-fit`
* `/teacher/library/[teacherBookId]`
* `/teacher/library/[teacherBookId]/follow`
* `/teacher/clubs`
* `/teacher/trials`
* `/teacher/students`
* `/teacher/kanji`
* `/teacher/testing/*`

Teacher pages should be mapped again after the Teacher Hub cleanup, because some pages may be renamed, merged, simplified, or moved into clearer teacher sections.

### Current Rule

* Keep components local while page thinning is still in progress.
* Consider shared stats components later.
* Do not combine shared components during small page-specific extraction commits unless that is the explicit task.
* Do not move access checks, Supabase queries, save/update/delete logic, helper functions, services, DAOs, controllers, or page-local types during first-pass visual extraction.
* Prefer low-risk JSX/presentational components first.
* Stop when the remaining page code is mostly behavior, data loading, validation, or access logic.

### `/vocab/bulk` teacher access update

Finished:

* Found that the recent `authorizedUserBookId` security fix made Bulk Add owner-only.
* Updated the authorization flow so Bulk Add now allows:
  * the book owner
  * `super_teacher`
  * a linked teacher through `teacher_students`
* Kept the safe pattern:
  * raw URL `userBookId`
  * verify access
  * set `authorizedUserBookId`
  * use `authorizedUserBookId` for private reads/writes
* Confirmed teacher Bulk Add to a student account works.

Decision:

`/vocab/bulk` remains protected, but now supports the intended teacher-managed student vocabulary workflow.
