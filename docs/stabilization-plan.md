# Mekuru Stabilization Plan

## Goal

For the next few weeks, avoid major new features. Focus on organizing, documenting, auditing, and making the app safer before wider student access.

This phase is about making Mekuru easier to understand, safer to maintain, and less fragile.

## Current Focus

- Route/access cleanup
- Profile simplification
- Security/privacy review
- Documentation
- Gentle architecture cleanup
- Removing unused routes/pages
- Keeping current user-facing behavior stable

## Allowed Work

- Documentation
- Security review
- Route/access review
- RLS review
- Input validation review
- Component extraction
- Helper/service/DAO organization
- Bug fixes
- Small UI fixes that do not change the core flow
- Removing unused pages/routes after checking they are not linked

## Paused Work

- Major new features
- Major database redesigns
- Payment/access changes
- Full dictionary import
- Big stats redesigns
- Large page rewrites
- Large visual redesigns unless they are part of cleanup

## Refactor Rule

Refactor one page or feature at a time.

Do not change behavior unless the change is intentional and documented.

## Before/After Rule

For UI pages, take a screenshot before and after changes when possible.

## Safety Rule

After each cleanup task, run the app and confirm the original flow still works.

---

# Active / Remaining Tasks

## Route and Access Review

Goal: Make sure protected pages are actually protected, not just hidden from the UI.

Still need to:

- Audit protected learner/member routes.
- Confirm users cannot access another user’s private book/study data by typing URLs manually.
- Review API routes and database writes connected to private book/study data.
- Continue RLS review for private user/book/study tables.

Finished from this section:

- ✅ Confirmed AppAccessGate behavior after profile route cleanup.
- ✅ Confirmed dashboard/profile setup redirects still work for new/incomplete profiles.
- ✅ Audited teacher-only routes.
- ✅ Added centralized `/teacher/*` route protection.
- ✅ Confirmed `/teacher/*` routes require teacher or super_teacher access.
- ✅ Confirmed test student is blocked from teacher routes on `app.mekurureads.com`.

## RLS Review

Goal: Confirm Supabase RLS protects private user data.

Still need to review RLS for important tables such as:

- `profiles`
- `user_public_profile`
- `user_books`
- `user_book_words`
- `user_book_reading_sessions`
- teacher/student relationship tables
- teacher prep / club tables
- shared vocabulary tables, if user-editable

## Input Validation Review

Goal: Make sure user input is validated before saving.

Still need to review input handling for:

- profile username
- display name
- bio
- favorite genres
- saved words
- page numbers
- notes
- teacher prep forms
- book add/edit forms
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

- Use the architecture pattern when touching large pages.
- Extract repeated UI into components.
- Move shared app rules into service/helper files.
- Move repeated Supabase queries into DAO/repository-style files.
- Avoid large rewrites.

## Possible Future Profile Feature

Later idea:

- Let users view other readers’ public profiles, similar to the community rating/reflection direction.
- This should be optional and privacy-aware.
- Public profile data should never include email or private account details.

---

# Completed Work

## ✅ 2026-05-22 — Vocabulary List Ownership Guard

Goal:

Prevent regular users from opening another user’s private vocabulary list by manually typing a `/books/[userBookId]/words` URL.

Finished:

- ✅ Added ownership/access guard to `/books/[userBookId]/words`.
- ✅ Confirmed regular student cannot access another user’s vocabulary list.
- ✅ Confirmed blocked users see a friendly access message instead of a raw Supabase error.
- ✅ Confirmed private word/progress/settings queries are blocked before loading for unauthorized users.
- ⏳ Teacher linked-student access still needs testing later with a linked teacher/student pair.

Notes:

The vocabulary list now follows the same access pattern as the Book Hub: owner access, super_teacher access, and intended teacher-linked access. This protects the vocab list side route from manual URL access by unrelated users.

## ✅ 2026-05-22 — Book Hub Ownership Guard

Goal:

Prevent regular users from opening another user’s private Book Hub by manually typing a `/books/[userBookId]` URL.

Finished:

- ✅ Added ownership/access guard to `/books/[userBookId]`.
- ✅ Confirmed regular student cannot access another user’s Book Hub.
- ✅ Confirmed owner can still access their own Book Hub.
- ✅ Confirmed super_teacher access still works.
- ⏳ Teacher linked-student access still needs testing later with a linked teacher/student pair.

Notes:

The Book Hub now checks ownership before loading private related data. Access is allowed for the book owner, super_teacher, and intended teacher-linked student access. The linked-teacher case still needs a real linked account test, but the student-blocking and super_teacher cases are working.

## ✅ 2026-05-22 — Profile Route Safety Check and Teacher Route Guard

Goal: Confirm the profile cleanup did not break core flows, then lock down teacher-only routes before continuing wider access work.

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
- ✅ Ran build/deploy path successfully.
- ✅ Confirmed deleted profile route leftovers are gone.
- ✅ Confirmed no remaining links to:
  - `/community/profile/account`
  - `/community/profile/reading`
  - `/community/profile/social`
  - `/community/profile/public`
- ✅ Audited route/access structure.
- ✅ Confirmed `(protected)` routes are wrapped by `AppAccessGate`.
- ✅ Confirmed `AppAccessGate` is a general app-access gate, not a teacher-role or ownership gate.
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

- ✅ Clarified intended route meanings:

```txt
/community/profile          = profile hub
/community/profile/setup    = mini first-time setup
/community/profile/settings = full editable profile
/community/profile/preview  = visual public profile preview
```

- ✅ Swapped setup/settings content so the route meanings now match:
  - `/setup` is the mini required onboarding page.
  - `/settings` is the full editable profile page.
- ✅ Added mini setup copy telling users they can complete their full profile later from the Community tab.
- ✅ Updated incomplete-profile redirects to `/community/profile/setup`.
- ✅ Updated normal profile editing links to `/community/profile/settings`.
- ✅ Updated preview page edit link to `/community/profile/settings`.

## ✅ 2026-05-21 — Email Privacy Cleanup

Goal: Email should be treated as private account infrastructure, not profile identity.

Finished:

- ✅ Removed full email display from the main profile/manage page.
- ✅ Removed the misleading Account Settings card from the profile hub.
- ✅ Removed visible Profile Email / “No email found” style account display.
- ✅ Removed leftover `accountEmail` / `setAccountEmail` state.
- ✅ Kept public profile email-free.
- ✅ Confirmed profile pages use username/display name instead of email.
- ✅ Confirmed visible profile/account pages no longer show login email.
- ✅ Audited whether `profiles.email` is needed.
- ✅ Confirmed `profiles.email` does not exist in Supabase.
- ✅ Confirmed no app-code usage of `profiles.email`.
- ✅ Confirmed no obvious email-based teacher/student relationship code.

Notes:

Mekuru should treat email as private login/account infrastructure handled by Supabase Auth, not as profile identity.

Profile pages should use:

- username
- display name
- user_id/profile id for relationships

Relationships should use:

- `user_id`
- `teacher_id`
- `student_id`

not email.

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

## ✅ 2026-05-21 — Clarified Profile Route Structure

Finished:

## ✅ 2026-05-21 — Removed Unused Profile Routes

Finished:

- ✅ Checked for links to unused profile routes.
- ✅ Confirmed no links existed for:
  - `/community/profile/account`
  - `/community/profile/reading`
  - `/community/profile/social`
- ✅ Removed unused profile routes:
  - `/community/profile/account`
  - `/community/profile/reading`
  - `/community/profile/social`
  - `/community/profile/public`
- ✅ Confirmed remaining profile files are only:

```txt
app/(protected)/community/profile/page.tsx
app/(protected)/community/profile/preview/page.tsx
app/(protected)/community/profile/settings/page.tsx
app/(protected)/community/profile/setup/page.tsx
```

Notes:

The profile area is now much simpler and easier to understand.

## ✅ Profile Cleanup Follow-up Finished

Current profile structure:

```txt
/community/profile          = profile hub
/community/profile/setup    = mini first-time setup
/community/profile/settings = full editable profile
/community/profile/preview  = visual public profile preview
```
- ✅ Test all four remaining profile routes in the browser.
- ✅ Confirm new users are sent to `/community/profile/setup`.
- ✅ Confirm normal profile editing links go to `/community/profile/settings`.
- ✅ Confirm `/community/profile/preview` still works after deleted route cleanup.
- ✅ Confirm no deleted profile routes are linked anywhere.