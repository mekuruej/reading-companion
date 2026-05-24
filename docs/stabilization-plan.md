# Mekuru Stabilization Plan

## Goal

For the next few weeks, avoid major new features. Focus on making Mekuru safer, easier to understand, and less fragile before wider student access.

## Current Focus

- Finish blocked/no-access message cleanup
- RLS review
- API route review
- Non-book route access audit
- Input validation review
- Public/private profile boundary check
- Documentation updates
- Keeping current user-facing behavior stable

## Allowed Work

- Documentation updates
- Security/privacy review
- RLS review
- API route review
- Route/access review for remaining non-book user-data routes
- Input validation review
- Bug fixes
- Small UI fixes that do not change the core flow
- Small component extraction when it reduces duplication
- Small helper/service/DAO organization when it makes code safer or clearer
- Removing unused pages/routes after confirming they are not linked or active
- Build fixes and TypeScript fixes

## Paused Work

- Major new features
- Major database redesigns
- Payment/access changes
- Full dictionary import
- Big stats redesigns
- Large page rewrites
- Large visual redesigns unless they are part of cleanup

## Stabilization Rules

- Refactor one page or feature at a time.
- Do not change behavior unless the change is intentional and documented.
- For UI pages, take before/after screenshots when possible.
- After each cleanup task, run the app and confirm the original flow still works.
- Prefer small safety patches before larger architecture cleanup.

---

# Active / Remaining Tasks

## Blocked / No-Access Message Cleanup

Goal: Make blocked private-book pages look consistent and avoid exposing technical database/API errors.

Current status:

- Regular-user private book access tests passed both ways.
- `trialmekuru` can access their own book and is blocked from `trialmekuru2`’s private book routes.
- `trialmekuru2` can access their own book and is blocked from `trialmekuru`’s private book routes.
- `/words/[wordId]` and `/add-word` were included in testing.
- Codex is currently standardizing the blocked/no-access UI.

Still need to confirm:

- Blocked messages are centered and visually consistent.
- The message style matches the Add Word blocked message style.
- No blocked page reveals private book data.
- No blocked page shows raw technical errors.

Known issue being fixed:

- The main Book Hub route showed a raw technical message:
  - `Cannot coerce the result to a single JSON object`

This should be replaced with a friendly message such as:

- `You do not have access to this book.`
- `This book could not be found.`

## RLS Review

Goal: Confirm Supabase RLS protects private user data even if a UI guard fails.

Priority tables:

- `profiles`
- `user_public_profile`
- `user_books`
- `user_book_words`
- `user_book_reading_sessions`
- `teacher_students`
- study log / study event tables
- user alerts
- teacher prep / club tables
- future shared flashcard/deck tables, when created

## API Route Review

Goal: Make sure API routes do not expose or modify private data incorrectly.

Routes to review:

- `app/api/book-lookup/route.ts`
- `app/api/jisho/route.ts`
- `app/api/vocabulary-kanji-map/generate/route.ts`
- `app/api/word-sky/approve/route.ts`

## Input Validation Review

Goal: Make sure user input is validated before saving.

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

## Architecture Cleanup

Goal: Gradually move toward clearer top-down architecture.

Reminder pattern:

```txt
Website Pages / Views
    ↓
Controllers
    ↓
Services
    ↓
DAOs / Repositories
    ↓
Database
```

Still need to:

- Extract repeated UI into components.
- Move shared app rules into service/helper files.
- Move repeated Supabase queries into DAO/repository-style files.
- Keep pages visually and behaviorally the same while moving logic.
- Avoid large rewrites.

## Future Cleanup: Centralize User Book Access

During the ownership audit, several routes received local ownership guards using the same rule:

- owner access
- linked teacher access
- super_teacher access

These guards were intentionally local/minimal for stabilization.

Later, centralize this logic into something like:

- `lib/access/userBookAccess.ts`
- `canAccessUserBook()`
- `loadAccessibleUserBook()`

This will reduce duplicated access logic across Book Hub, Vocab List, Add Word, Curiosity Reading, Study Flashcards, reading timers, Readalong, and Stats.

## Future Feature Note: Shared Flashcards

Future shared flashcards should use separate shared deck structures.

Private `user_book_words` should stay private.

Possible future structures:

- `shared_flashcard_decks`
- `shared_flashcard_items`
- `user_saved_flashcard_decks`
- `user_flashcard_deck_progress`

Private book flashcards and future shared flashcards should remain separate concepts.

## Possible Future Profile Feature

Later idea:

- Let users view other readers’ public profiles.
- This should be optional and privacy-aware.
- Public profile data should never include email or private account details.

---

# Completed Work

## ✅ 2026-05-23 / 2026-05-24 — Private Book Route Ownership Guard Pass

Goal:

Prevent regular users from manually opening another user’s private book, vocabulary, study, reading, timer, or stats routes.

Finished:

- ✅ Added ownership/access guards to private book routes.
- ✅ Confirmed regular users are blocked from another regular user’s private book data.
- ✅ Confirmed `trialmekuru` can access their own book.
- ✅ Confirmed `trialmekuru` is blocked from `trialmekuru2`’s private book routes.
- ✅ Confirmed `trialmekuru2` can access their own book.
- ✅ Confirmed `trialmekuru2` is blocked from `trialmekuru`’s private book routes.
- ✅ Confirmed `/words/[wordId]` was included in testing.
- ✅ Confirmed `/add-word` was included in testing.
- ✅ Confirmed write routes are guarded before saving.
- ✅ Confirmed super_teacher access still works where intended.

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

Still being cleaned up:

- Blocked/no-access message formatting should be standardized.
- Blocked messages should be centered and visually consistent.
- Raw technical errors should never appear to users.
- The main Book Hub route needs cleanup because it showed:
  - `Cannot coerce the result to a single JSON object`

Notes:

The repeated local access rule is temporary. Later, it should be centralized into a shared access helper/service.

## ✅ 2026-05-23 — Removed Legacy Weekly Readings Routes

Goal:

Remove old book-specific weekly kanji/weekly-reading routes that are no longer part of the active study flow.

Finished:

- ✅ Confirmed the active global kanji study page is `/library-study/kanji`.
- ✅ Confirmed `/books/[userBookId]/weekly-readings` is legacy.
- ✅ Confirmed `/books/[userBookId]/weekly-readings/prepare` is legacy.
- ✅ Removed the unused weekly-readings route folder.

Notes:

Removing these old routes was cleaner than adding ownership guards to unused pages.

## ✅ 2026-05-22 — Profile Route Safety Check and Teacher Route Guard

Goal:

Confirm the profile cleanup did not break core flows, then lock down teacher-only routes.

Finished:

- ✅ Browser-tested remaining profile routes:
  - `/community/profile`
  - `/community/profile/setup`
  - `/community/profile/settings`
  - `/community/profile/preview`
- ✅ Confirmed intended profile route meanings:
  - `/community/profile` = profile hub
  - `/community/profile/setup` = mini first-time setup
  - `/community/profile/settings` = full editable profile
  - `/community/profile/preview` = visual public profile preview
- ✅ Confirmed `/dashboard` and `/books` work after incomplete-profile redirect changes.
- ✅ Confirmed deleted profile route leftovers are gone.
- ✅ Added centralized teacher route protection with:
  - `components/TeacherAccessGate.tsx`
  - `app/(protected)/teacher/layout.tsx`
- ✅ Confirmed `/teacher/*` routes are blocked for regular student/member accounts.
- ✅ Confirmed teacher routes still work for teacher/super_teacher accounts.
- ✅ Updated `lib/appAccess.ts` so `super_teacher` is treated as staff access.

Notes:

The app now has a clearer two-layer route protection model:

```txt
app/(protected)/layout.tsx
    = general logged-in/app-access protection

app/(protected)/teacher/layout.tsx
    = teacher/super_teacher-only protection
```

## ✅ 2026-05-21 — Profile and Email Privacy Cleanup

Goal:

Simplify profile routes and keep email private.

Finished:

- ✅ Removed full email display from visible profile/account pages.
- ✅ Confirmed profile pages use username/display name instead of email.
- ✅ Confirmed `profiles.email` does not exist in Supabase.
- ✅ Confirmed no app-code usage of `profiles.email`.
- ✅ Clarified profile route structure:
  - `/community/profile`
  - `/community/profile/setup`
  - `/community/profile/settings`
  - `/community/profile/preview`
- ✅ Removed unused profile routes:
  - `/community/profile/account`
  - `/community/profile/reading`
  - `/community/profile/social`
  - `/community/profile/public`
- ✅ Confirmed remaining profile files are only the intended four profile routes.

Notes:

Mekuru should treat email as private login/account infrastructure handled by Supabase Auth, not as profile identity.

## ✅ 2026-05-21 — Mekuru Reading Level Guide Restored

Finished:

- ✅ Restored the detailed Mekuru Reading Level Guide.
- ✅ Connected the guide to `level` / `setLevel`.
- ✅ Confirmed setup page uses the detailed level guide.
- ✅ Confirmed settings page uses the detailed level guide.
- ✅ Removed broken `<MekuruReadingLevelGuide />` usage.
- ✅ Confirmed detailed reading level selection works again.

Notes:

The detailed reading level guide is important because book difficulty/reflection ratings depend on the user’s current reading level.

## ✅ 2026-05-21 — Removed Old Stats Page

Finished:

- ✅ Confirmed no links pointed to `/community/stats/old`.
- ✅ Removed old Stats page route: `/community/stats/old`.
- ✅ Deleted `app/(protected)/community/stats/old/page.tsx`.
- ✅ Removed the empty `old` folder.
- ✅ Confirmed the route no longer appears in the page list.