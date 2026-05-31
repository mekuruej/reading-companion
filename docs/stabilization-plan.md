# Mekuru Stabilization Plan

## Goal

For now, avoid major new features. Focus on making Mekuru safer, easier to understand, and less fragile before wider student access.

Mekuru stabilization has two main tracks:

A. **Security / Privacy / Access Safety**
B. **Page Thinning / Maintainability / Refactor Work**

Detailed page-specific refactor plans live in:

- `docs/refactor-maps/**
---

# Current Focus

## A. Security / Privacy / Access Safety

Goal:

Make sure users can only see and change data they should have access to.

This includes:

- route guards
- private book access
- teacher/student access boundaries
- Supabase RLS policies
- API route authorization
- input validation
- public/private profile boundaries
- private saved-word data
- future shared flashcard/deck separation

Still Working On / Not Fully Finished

## 1. Remaining API Route Review

Mostly done, but not completely closed.

Finished/reviewed:

/api/vocabulary-kanji-map/generate
/api/word-sky/approve
/api/jisho

Paused:

/api/book-lookup — leave alone for now because the Add Book / ISBN import flow may change.

Still later:

Revisit API routes after Add Book / Global Book Entry redesign is clearer.

## 2. Non-Book Route Access Audit

Started with:

/users/[username]/books

Recent fix:

Regular users now use their own effective user ID for books, monthly stats, and Mekuru color totals.
Tested regular student manually opening another student’s route.
Result: both routes fall back to their own books. Good.

Still to audit later:

/library-study/book-flashcards
/library-study/practice
/library-study/check
/library-study/kanji
/community/stats/*
other non-book pages that show private user data

## 3. Teacher / Student Access Boundaries

Partly done, partly paused.

Finished enough for now:

/teacher/* has teacher route guard.
teacher_students RLS was tightened.
linked-teacher access is safer now.

Paused:

/teacher/assign
prep shelf
future learner prep
teacher tasks
book assignment/prep workflow

Reason: The teacher-side concepts are mixed together and need design clarification before more cleanup.

## 4. Public / Private Profile Boundary

Still needs a later pass.

Already done:

Removed email display.
Removed old profile routes.
Dropped broad profiles_select_authed.

Still later:

Check public profile pages/views.
Confirm public profile never exposes:
email
internal roles/access fields
teacher/student relationships
private books
private vocab
study history

Important future direction:

Prefer user_public_profile or limited public views instead of exposing full profiles rows.

5. Discovery / Ratings / Find Your Next Book Privacy

Later task, not now.

Concern:

Discovery / Find Your Next Book may be reading from private user_books.
RLS may block cross-user ratings, causing empty results.
Do not make user_books broadly readable.

Future direction:

Create a separate anonymous/shared signal source, like:
book_reader_signals
public_book_reviews
book_fit_signals

Goal:

Public discovery reads safe anonymous rating data, not private library rows.

6. Input Validation Review

Still not deeply done.

Areas to review:

username
display name
bio
saved words
page numbers
notes
book add/edit forms
teacher prep/task forms
search fields
long text fields
weird empty strings

7. RLS Cleanup / Duplicate Policy Cleanup

Big scary RLS pass mostly handled for the most important tables, but cleanup remains.

Reviewed/tightened:

teacher_students
profiles
user_books
user_book_words
user_book_reading_sessions
study_logs
user_study_events
user_alerts
user_learning_settings
user_settings
learning_tasks
teacher_book_prep_items

Still later:

clean duplicate super_teacher policies
revisit public profile read policy
revisit linked teacher delete/update permissions if teacher workflows change
revisit teacher_alert_completions to possibly verify linked student relationship

8. Future Shared Flashcards Boundary

Not building now, but rule is clear.

Private stays private:

user_book_words
private book flashcards
private study progress
reading sessions

Future shared flashcards should use separate tables, not expose private saved words.

Possible future structures:

shared_flashcard_decks
shared_flashcard_items
user_saved_flashcard_decks
user_flashcard_deck_progress

## B. Page Thinning / Maintainability

Goal:

Make large files easier to understand and safer to edit without changing behavior.

General order:

1. Extract low-risk presentational components.
2. Remove unused code.
3. Extract pure helper functions.
4. Move shared types/constants when useful.
5. Move services, DAOs, and controllers later.
6. Avoid behavior changes during refactor commits.

---

# Current / Remaining Tasks

### Discovery / Ratings Privacy Boundary

Review how reader-fit ratings, Discovery Hub, and Find Your Next Book expose community signals.

Main rule:

Private `user_books` should stay private. Public/global discovery should read from a deliberately limited anonymous signal table or view, not directly from private library rows.

Potential future shared source:

- `book_reader_signals`
- `public_book_reviews`
- `book_fit_signals`

## Security / Privacy / Access Safety

### Continue RLS Review

Remaining / revisit areas:

- `profiles`
- `user_public_profile`
- `user_books`
- `user_book_words`
- `user_book_reading_sessions`
- study log / study event tables
- user alerts
- teacher prep / club tables
- future shared flashcard/deck tables, when created

### Continue API Route Review

Routes to review or revisit:

- `app/api/book-lookup/route.ts`
- `app/api/jisho/route.ts`
- `app/api/vocabulary-kanji-map/generate/route.ts`
- `app/api/word-sky/approve/route.ts`

### Continue Input Validation Review

Areas to review:

- profile username
- display name
- bio
- favorite genres
- saved words
- page numbers
- notes
- book add/edit forms
- teacher prep forms
- search fields

### Future Cleanup: Centralize User Book Access

During the ownership audit, several routes received local ownership guards using the same rule:

- owner access
- linked teacher access
- super_teacher access

These guards are intentionally local/minimal for stabilization.

Later, centralize this logic into something like:

- `lib/access/userBookAccess.ts`
- `canAccessUserBook()`
- `loadAccessibleUserBook()`

This should eventually reduce duplicated access logic across:

- Book Hub
- Vocab List
- Add Word
- Curiosity Reading
- Study Flashcards
- reading timers
- Readalong
- Stats

### Future Feature Note: Shared Flashcards

Future shared flashcards should use separate shared deck structures.

Private `user_book_words` should stay private.

Possible future structures:

- `shared_flashcard_decks`
- `shared_flashcard_items`
- `user_saved_flashcard_decks`
- `user_flashcard_deck_progress`

Private book flashcards and future shared flashcards should remain separate concepts.

### Possible Future Profile Feature

Later idea:

- Let users view other readers’ public profiles.
- This should be optional and privacy-aware.
- Public profile data should never include email or private account details.

---

# Page Thinning / Refactor Work

## Reading Habits Stats Page

Detailed map:

- `docs/refactor-maps/reading-habits.md`

Finished:

- Completed first visual component thinning pass.
- Extracted:
  - `StatCard`
  - `SectionBand`
  - `BarStrip`
  - `ModeStrip`
  - `PieChart`
  - `TimeRangeSelector`
- Removed unused `DailyActivityChart`.
- Removed unused `isThisMonth`.
- Reduced `reading-habits/page.tsx` to under 1000 lines.
- Kept stats calculations, state, data loading, and page orchestration in `page.tsx`.

Next:

- Park for now.
- Remaining work is medium/higher-risk:
  - reading rhythm calendar section extraction
  - types/helpers
  - data loading
  - stats calculation/view-model cleanup

## Book Difficulty Stats Page

Detailed map:

- `docs/refactor-maps/book-difficulty.md`

Finished:

- Completed basic visual component thinning pass.
- Extracted:
  - `StatCard`
  - `SectionBand`
  - `BarStrip`
  - `PieChart`
  - `DifficultyTimeRangeSelector`
  - `BookDifficultyHeader`
  - `ReaderFitTable`
- Fixed visible header `description="..."` issue.
- Updated reader-fit table wording:
  - `Ease rating` → `Difficulty`
  - `Reader fit — [range]`
  - `Difficulty and enjoyment by book`
- Kept totals, calculations, data loading, state, and page orchestration in `page.tsx`.

Next:

- Park visual pass for now.
- Remaining work is architecture cleanup:
  - types
  - helpers
  - data loading
  - stats calculations
  - time range logic

## Stats Visual Consistency

Finished:

- Standardized stats card and section backgrounds.
- Card and section interiors now use white backgrounds more consistently.
- Theme colors remain mostly in borders, page accents, active controls, charts, badges, and legends.

Next:

- Keep future stats cards and major section panels consistent:
  - white interiors
  - themed borders
  - meaningful colors preserved for charts, buttons, badges, and legends

## Shared Stats Component Note

Finished:

- Noticed repeated stats component patterns across stats pages, especially:
  - `StatCard`
  - `SectionBand`
  - `BarStrip`
  - `PieChart`
  - time range selectors

Next:

- Keep components local for now while page thinning is still in progress.
- Later, consider a separate shared stats component pass.
- Possible future shared location:
  - `app/(protected)/community/stats/components/`
  - or `components/stats/`
- Do not combine shared components during small page-specific extraction commits unless that is the explicit task.

---

# Completed Security / Stabilization Work

## ✅ API Route Review — word-sky/approve

Goal:

Confirm the Word Sky approval route does not allow normal users to create or approve global vocabulary data.

Reviewed route:

- `app/api/word-sky/approve/route.ts`

Finished:

- ✅ Confirmed the route uses `SUPABASE_SERVICE_ROLE_KEY`, but protects writes with an explicit auth check.
- ✅ Confirmed the route requires a Bearer token from the logged-in Supabase session.
- ✅ Confirmed the route checks the caller’s profile and only allows:
  - `role = "super_teacher"`
  - or `is_super_teacher = true`
- ✅ Confirmed normal users should receive `403`.
- ✅ Confirmed logged-out requests should receive `401`.
- ✅ Confirmed the only current caller is:
  - `app/(protected)/books/[userBookId]/add-word/page.tsx`
- ✅ Confirmed the Add Word page sends the Supabase access token in the request header:
  - `Authorization: Bearer <session.access_token>`
- ✅ Confirmed required fields are checked:
  - `surface`
  - `reading`
  - `meaning`
- ✅ Confirmed JLPT input is normalized to expected values.
- ✅ Confirmed the route can create/update:
  - `vocabulary_cache`
  - `word_sky_starter_words`
  - `vocabulary_kanji_map` rows for newly created cache rows

Decision:

No urgent security change needed for `word-sky/approve` right now.

Cleanup-later notes:

- Return more generic client-facing errors instead of raw-ish `err.message`.
- Add length limits for `surface`, `reading`, `meaning`, and `meanings`.
- Consider generating missing kanji-map rows even when the `vocabulary_cache` row already exists.
- Optionally test as a regular user later to confirm the Word Sky super tool is hidden or blocked.

## Private Book Route Ownership Guard Pass

Finished:

- Added ownership/access guards to private book routes.
- Confirmed regular users are blocked from another regular user’s private book data.
- Confirmed `trialmekuru` can access their own book.
- Confirmed `trialmekuru` is blocked from `trialmekuru2`’s private book routes.
- Confirmed `trialmekuru2` can access their own book.
- Confirmed `trialmekuru2` is blocked from `trialmekuru`’s private book routes.
- Confirmed `/words/[wordId]` was included in testing.
- Confirmed `/add-word` was included in testing.
- Confirmed write routes are guarded before saving.
- Confirmed super_teacher access still works where intended.
- Standardized blocked/no-access messages enough for now.
- Removed raw technical no-access errors from blocked private book pages.

Guarded routes:

- `/books/[userBookId]`
- `/books/[userBookId]/words`
- `/books/[userBookId]/words/[wordId]`
- `/books/[userBookId]/add-word`
- `/books/[userBookId]/curiosity-reading`
- `/books/[userBookId]/study`
- `/books/[userBookId]/just-reading`
- `/books/[userBookId]/listening`
- `/books/[userBookId]/readalong`
- `/books/[userBookId]/stats`

## Teacher Route Guard

Finished:

- Added centralized teacher route protection with:
  - `components/TeacherAccessGate.tsx`
  - `app/(protected)/teacher/layout.tsx`
- Confirmed `/teacher/*` routes are blocked for regular student/member accounts.
- Confirmed teacher routes still work for teacher/super_teacher accounts.
- Updated `lib/appAccess.ts` so `super_teacher` is treated as staff access.

## Profile and Email Privacy Cleanup

Finished:

- Removed full email display from visible profile/account pages.
- Confirmed profile pages use username/display name instead of email.
- Confirmed `profiles.email` does not exist in Supabase.
- Confirmed no app-code usage of `profiles.email`.
- Clarified profile route structure:
  - `/community/profile`
  - `/community/profile/setup`
  - `/community/profile/settings`
  - `/community/profile/preview`
- Removed unused profile routes:
  - `/community/profile/account`
  - `/community/profile/reading`
  - `/community/profile/social`
  - `/community/profile/public`

Notes:

Mekuru should treat email as private login/account infrastructure handled by Supabase Auth, not as profile identity.

## Removed Legacy Weekly Readings Routes

Finished:

- Confirmed the active global kanji study page is `/library-study/kanji`.
- Confirmed `/books/[userBookId]/weekly-readings` is legacy.
- Confirmed `/books/[userBookId]/weekly-readings/prepare` is legacy.
- Removed the unused weekly-readings route folder.

## Removed Old Stats Page

Finished:

- Confirmed no links pointed to `/community/stats/old`.
- Removed old Stats page route: `/community/stats/old`.
- Deleted `app/(protected)/community/stats/old/page.tsx`.
- Removed the empty `old` folder.

## Mekuru Reading Level Guide Restored

Finished:

- Restored the detailed Mekuru Reading Level Guide.
- Connected the guide to `level` / `setLevel`.
- Confirmed setup page uses the detailed level guide.
- Confirmed settings page uses the detailed level guide.
- Removed broken `<MekuruReadingLevelGuide />` usage.

Notes:

The detailed reading level guide is important because book difficulty/reflection ratings depend on the user’s current reading level.

## RLS Review: `study_logs` and `user_study_events`

Finished:

- Confirmed there is no broad authenticated-user read-all policy.
- Confirmed `study_logs` lets users insert/select only their own rows.
- Confirmed linked teachers can select linked student `study_logs` through `teacher_students`.
- Confirmed `user_study_events` lets users select/insert/update/delete only their own rows.

Decision:

No RLS change needed for `study_logs` or `user_study_events` right now.

## RLS Review: `user_book_reading_sessions`

Finished:

- Confirmed there is no broad authenticated-user read-all policy.
- Confirmed owner access is scoped through the owning `user_books` row.
- Confirmed linked teacher access depends on `teacher_students`.
- Confirmed session columns are limited to reading date, pages, minutes, filler flag, and session mode.
- Left linked-teacher SELECT/INSERT/DELETE access in place for now.

Decision:

No RLS change needed for `user_book_reading_sessions` right now.

## Earlier RLS Tightening

Finished:

- Tightened `teacher_students` so normal teachers cannot self-create arbitrary teacher/student links.
- Removed broad authenticated profile read policy.
- Removed broad teacher insert policy on `user_books`.
- Reviewed `user_book_words`.
- Reviewed alert/settings tables.
- Added learner completion policy for `learning_tasks`.
- Tightened `teacher_book_prep_items`.
- Tightened `/api/vocabulary-kanji-map/generate` and fixed related save-flow issues.

---

# Working Rules

- Keep `docs/stabilization-plan.md` concise.
- Keep detailed page-specific cleanup notes in `docs/refactor-maps/*.md`.
- Refactor one page or feature at a time.
- Prefer visual component extraction before service/DAO/controller work.
- Do not change behavior unless the change is intentional and documented.
- For UI pages, take before/after screenshots when possible.
- After each cleanup task, run the app and confirm the original flow still works.
- Run `npm run build` after meaningful code changes.
- Treat recurring `next-env.d.ts` changes as generated noise unless intentionally investigating typed routes.