# Teacher Hub Page Refactor Map

No-code refactor map for:

`app/(protected)/teacher/page.tsx`

Current observed size: 443 lines as of 2026-06-15.

This is a planning document only. Do not refactor the page from this map without a separate implementation pass.

## 1. Page Purpose

This page is the main Teacher Hub dashboard.

From the teacher point of view, it provides a calm starting place for teacher-side work:

* Lesson Prep
* Needs Attention
* General Upkeep
* learner / lesson alerts
* app / upkeep alerts

The page also calculates alert counts for teacher review queues, including reading reflection reviews, pending book requests, missing book info, kanji queue items, and flagged vocabulary.

## 2. Current Responsibilities

Current responsibilities include:

* rendering the Teacher Hub header
* rendering the three main Teacher Hub navigation cards
* rendering learner / lesson alerts
* rendering app / upkeep alerts
* checking the current signed-in user
* loading the current user’s profile role and `is_super_teacher` flag
* detecting super-teacher access
* loading linked students through `teacher_students`
* including the teacher’s own user ID in alert scopes
* calculating reading-fit review count from finished `user_books`
* loading profile levels for reading-fit fallback behavior
* counting pending book requests
* counting manual book flags
* loading global books to count missing metadata
* counting flagged vocabulary rows
* calculating active kanji queue count from saved words and `vocabulary_kanji_map`
* formatting alert count display
* rendering placeholder future alerts
* hiding app/upkeep alerts from non-super-teachers
* tracking alert loading state
* cancelling async state updates when the component unmounts

## 3. Important Data Boundaries

This page mixes dashboard UI with alert-count data loading.

Teacher access / role boundary:

* The page loads the signed-in user with Supabase Auth.
* It loads the current user’s `profiles` row for `role` and `is_super_teacher`.
* Super-teacher access controls whether app/upkeep alerts are shown.
* Regular teachers still see learner/lesson alerts.

Linked-student boundary:

* The page loads linked students from `teacher_students`.
* The teacher’s own user ID is included in the alert scope.
* Reading-fit and kanji queue counts depend on this scoped list.

Global upkeep boundary:

* Super-teachers can see global upkeep alerts.
* These include book requests, book flags / missing info, kanji queue count, and vocabulary flags.
* Do not broaden or change this visibility during visual thinning.

Kanji queue boundary:

* The active kanji queue count is derived from user book words, kanji presence, vocabulary cache IDs, and `vocabulary_kanji_map`.
* This is behavior-heavy and should stay in the page during a visual pass.

## 4. Risk Boundaries

Do not touch these during a first safe visual pass:

* Supabase Auth lookup
* profile role / `is_super_teacher` lookup
* `isSuperTeacherFlag`
* linked-student loading through `teacher_students`
* inclusion of the teacher’s own user ID in alert scopes
* reading-fit count logic
* profile-level fallback behavior for reading-fit count
* global book missing-info criteria
* pending book request count query
* manual book flag count query
* vocabulary flag count query
* kanji queue count logic
* `KANJI_ENRICHMENT_TEST_START`
* `hasKanji`
* `kanjiChars`
* `effectiveKanjiReadingType`
* `isActiveKanjiQueueStatus`
* chunked `vocabulary_kanji_map` loading
* `cancelled` guard inside `useEffect`
* super-teacher visibility rules for app/upkeep alerts

These should remain in `page.tsx` during the first pass.

## 5. Suggested Extraction Candidates

### Low-Risk Visual Components

Good first-pass candidates:

* `TeacherHubHeader`

  * Teacher Portal label
  * Teacher Hub title
  * intro copy

* `TeacherHubCardGrid`

  * the three main navigation cards
  * currently page-local and already component-shaped
  * can be moved into `/components`

* `TeacherAlertList`

  * reusable alert list renderer
  * currently page-local and already component-shaped
  * receives alerts and empty text

* `TeacherAlertPanel`

  * card wrapper for one alert section
  * title, eyebrow, description copy, loading text, alert list / fallback body
  * useful for Learner / Lesson Alerts and App / Upkeep Alerts

* `TeacherHubTodaySection`

  * Today heading/copy and two alert panels
  * receives already-derived props:

    * `alertsLoading`
    * `isSuperTeacher`
    * `learnerAlerts`
    * `upkeepAlerts`

These are visual thinning candidates because they can receive already-derived props and do not need to know how alert counts are calculated.

### Medium-Risk Candidates

Possible after the first visual pass:

* `TeacherHubMainNavSection`

  * wrapper around the main navigation card grid
  * very low behavior risk, but small value unless the page needs more thinning

* `TeacherAlertCountBadge`

  * extracted from `TeacherAlertList`
  * tiny component, but probably not necessary unless styling will be reused

* `TeacherHubAccessState`

  * not currently a visible access-state page
  * only add if the product wants a displayed signed-out / no-access state later

### Helper Candidates For Later

Possible future helper/service extraction:

* `missingGlobalBookFields`
* `formatAlertCount`
* `hasKanji`
* `kanjiChars`
* `effectiveKanjiReadingType`
* `isActiveKanjiQueueStatus`
* reading-fit count helper
* kanji queue count helper
* teacher alert loading service

Do not move these during the visual pass. Some are pure helpers, but they encode product-sensitive queue rules and should move only during a dedicated architecture pass.

## 6. High-Risk / Leave For Later

Leave these in `page.tsx` for now:

* all Supabase queries
* all teacher/super-teacher role checks
* linked-student query
* reading-fit count derivation
* missing book info count derivation
* kanji queue derivation
* alert array construction
* `setLearnerAlerts`
* `setUpkeepAlerts`
* `alertsLoading`
* `cancelled` guard
* global upkeep visibility rules
* any route changes for alert links

## 7. Recommended Refactor Order

Safe first visual pass:

1. Extract `TeacherHubHeader`.
2. Move existing `TeacherHubCardGrid` into `components/TeacherHubCardGrid.tsx`.
3. Move existing `TeacherAlertList` into `components/TeacherAlertList.tsx`.
4. Extract `TeacherAlertPanel`.
5. Extract `TeacherHubTodaySection`.

Safe stopping point:

Stop after visual/dashboard components. The page should still own all alert-count logic, all Supabase behavior, all role checks, and all derived alert arrays.

Optional second pass:

6. Extract `TeacherHubMainNavSection` if the page still feels visually cluttered.
7. Extract `TeacherAlertCountBadge` only if alert badge styling will be reused.
8. Consider helper/service extraction only after queue-count behavior is stable and easier to test.

Pause before:

* moving reading-fit count logic
* moving kanji queue count logic
* changing super-teacher alert visibility
* changing alert routes
* changing linked-student scope
* changing missing-book-info criteria

## 8. Proposed File Structure

Suggested component folder:

```txt
app/(protected)/teacher/components/
  TeacherHubHeader.tsx
  TeacherHubCardGrid.tsx
  TeacherAlertList.tsx
  TeacherAlertPanel.tsx
  TeacherHubTodaySection.tsx
```

Possible later helper/service files, only after behavior is stable:

```txt
app/(protected)/teacher/teacherHubAlertHelpers.ts
app/(protected)/teacher/teacherHubAlertService.ts
```

Do not create the helper/service files during the first visual pass.

## 9. Suggested Component Boundaries

### `TeacherHubHeader`

Owns:

* top white header card
* Teacher Portal label
* Teacher Hub title
* intro copy

Stays in page:

* no state needed

Risk level:

* Low

Suggested order:

* 1

### `TeacherHubCardGrid`

Owns:

* rendering the three main Teacher Hub cards
* card link layout
* title/eyebrow/description/open text

Stays in page:

* `teacherHubCards` constant

Expected props:

* `cards: TeacherHubCard[]`

Risk level:

* Low

Suggested order:

* 2

### `TeacherAlertList`

Owns:

* empty alert text
* alert cards
* alert count badge
* optional alert link

Stays in page:

* alert array creation
* count calculation
* route choices
* `formatAlertCount` may stay page-local and be passed in, or move only if still simple

Expected props:

* `alerts: TeacherAlertSummary[]`
* `emptyText: string`
* optionally `formatAlertCount: (count: number) => string`

Risk level:

* Low-medium

Suggested order:

* 3

### `TeacherAlertPanel`

Owns:

* outer rounded alert card
* eyebrow
* title
* intro copy
* loading copy
* alert list or fallback body

Stays in page:

* `alertsLoading`
* `isSuperTeacher`
* alert arrays
* role decision

Expected props:

* `eyebrow: string`
* `title: string`
* `children` or `description`
* `isLoading?: boolean`
* `loadingText?: string`

Risk level:

* Low

Suggested order:

* 4

### `TeacherHubTodaySection`

Owns:

* Today heading
* Today intro copy
* two-column layout
* Learner / Lesson Alerts panel
* App / Upkeep Alerts panel

Stays in page:

* `alertsLoading`
* `isSuperTeacher`
* `learnerAlerts`
* `upkeepAlerts`

Expected props:

* `alertsLoading: boolean`
* `isSuperTeacher: boolean`
* `learnerAlerts: TeacherAlertSummary[]`
* `upkeepAlerts: TeacherAlertSummary[]`

Risk level:

* Low-medium

Suggested order:

* 5

## 10. Suspicious / Possibly Worth Reviewing Later

Do not change these during visual thinning.

* The page grew from an earlier observed 407 lines to 577 lines, likely because real alert-count logic was added.
* There is no visible signed-out or non-teacher access message; signed-out users simply stop alert loading.
* The page queries teacher-student links even for super-teachers. Confirm whether super-teachers should see alerts for all students or only their linked/current scope.
* The kanji queue count uses a 5000 row limit. This may be fine for now but could need a server-side or paginated approach later.
* The `vocabulary_kanji_map` query chunks cache IDs by 100, which is sensible but behavior-heavy.
* `manualBookFlagCount` counts `user_alerts` for only the current user. Confirm whether super-teacher upkeep should show all book flags or only flags assigned to that teacher/admin.
* Missing book info count loads all global books and filters client-side. This may eventually belong in an admin/upkeep query or RPC.
* `Vocabulary Flags` links to `/teacher/words`; confirm this is still the intended route.
* `Pending Book Requests` and `Book Flags / Missing Info` both link to `/teacher/books`; confirm whether this should eventually split into Needs Attention / General Upkeep routes.
* Placeholder alerts are mixed with real alerts. That is fine visually, but future logic should keep placeholders clearly marked.

## 11. Manual Checks After Refactor

After visual extraction, manually test:

* Teacher Hub loads for teacher.
* Teacher Hub loads for super-teacher.
* Main cards link to:

  * `/teacher/lesson-prep`
  * `/teacher/needs-attention`
  * `/teacher/general-upkeep`
* Learner alerts show while loading.
* Learner alerts show empty state when no alerts.
* Learner alerts show Reading Reflection Reviews count.
* Reading Reflection Reviews links to `/teacher/reading-fit`.
* Placeholder learner alerts show `Soon`.
* Super-teacher sees app/upkeep alerts.
* Non-super-teacher sees the non-super-teacher fallback copy instead of global upkeep alerts.
* Pending Book Requests count still appears for super-teacher.
* Book Flags / Missing Info count still appears for super-teacher.
* Kanji Queue count still appears for super-teacher.
* Vocabulary Flags count still appears for super-teacher.
* Alert count formatting still shows `None`, numeric counts, and `99+`.
* Mobile-ish layout works for the header, three cards, and two alert panels.
* No alert counts, query scopes, or routes change.

## 12. Current Tracker Row

```md
- [x] | Visual pass complete / good stopping point / architecture deferred | `app/(protected)/teacher/page.tsx` | 577 | 443 | -134 |
```

## 13. Current Refactor Audit, 2026-06-15

Current observed line count:

* `app/(protected)/teacher/page.tsx`: 443 lines

Extracted visual components:

* `TeacherHubHeader`
* `TeacherHubCardGrid`
* `TeacherAlertList`
* `TeacherAlertPanel`
* `TeacherHubTodaySection`

The extracted pieces match the suggested first visual pass. `TeacherAlertList` and `TeacherAlertPanel` live under `app/(protected)/teacher/components/` and are used by `TeacherHubTodaySection`.

Intentionally left in the page:

* Supabase Auth lookup
* profile role and `is_super_teacher` lookup
* linked-student loading
* teacher/self alert scope construction
* reading-fit review count logic
* pending book request count logic
* missing book info criteria
* flagged vocabulary count logic
* kanji queue count logic
* helper functions that encode queue/business rules
* derived learner/upkeep alert arrays

Risk-boundary check:

The page still owns the permission-sensitive and behavior-heavy alert-count logic from this map. No extraction appears to have moved Supabase queries, teacher/student relationship logic, global upkeep visibility rules, or kanji queue derivation into a visual component.

Current status:

Visual pass complete. This is a good stopping point. Any next pass should be an architecture/data-loading pass, not more visual thinning.

```md
- [x] | Visual pass complete / good stopping point / architecture deferred | `app/(protected)/teacher/page.tsx` | 577 | 443 | -134 |
```
