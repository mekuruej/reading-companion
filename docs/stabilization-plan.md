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
- Audit teacher-only routes.
- Confirm `/teacher/*` routes require teacher or super_teacher access.
- Confirm users cannot access another user’s private book/study data by typing URLs manually.
- Confirm AppAccessGate behavior is correct after profile route cleanup.
- Confirm dashboard/profile setup redirects still work for new users.

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

## Profile Cleanup Follow-up

Current intended profile structure:

```txt
/community/profile          = profile hub
/community/profile/setup    = mini first-time setup
/community/profile/settings = full editable profile
/community/profile/preview  = visual public profile preview
```

Still need to:

- Test all four remaining profile routes in the browser.
- Confirm new users are sent to `/community/profile/setup`.
- Confirm normal profile editing links go to `/community/profile/settings`.
- Confirm `/community/profile/preview` still works after deleted route cleanup.
- Confirm no deleted profile routes are linked anywhere.

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

## ✅ 2026-05-21 — Email Privacy Cleanup

Goal: Email should be treated as private account infrastructure, not profile identity.

Completed:

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

Completed:

- ✅ Restored the detailed Mekuru Reading Level Guide.
- ✅ Connected the guide to `level` / `setLevel`.
- ✅ Confirmed setup page uses the detailed level guide.
- ✅ Confirmed settings page uses the detailed level guide.
- ✅ Removed broken `<MekuruReadingLevelGuide />` usage.
- ✅ Confirmed detailed reading level selection works again.

Notes:

The detailed reading level guide is important because book difficulty/reflection ratings depend on the user’s current reading level.

## ✅ 2026-05-21 — Removed Old Stats Page

Completed:

- ✅ Confirmed no links pointed to `/community/stats/old`.
- ✅ Removed old Stats page route: `/community/stats/old`.
- ✅ Deleted `app/(protected)/community/stats/old/page.tsx`.
- ✅ Removed the empty `old` folder.
- ✅ Confirmed the route no longer appears in the page list.

## ✅ 2026-05-21 — Clarified Profile Route Structure

Completed:

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

## ✅ 2026-05-21 — Removed Unused Profile Routes

Completed:

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