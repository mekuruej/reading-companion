# User Library Refactor Map

## Current Page Purpose

`app/(protected)/users/[username]/books/page.tsx` is the main Library page for a user's books.

It lets the signed-in user:
* view their own library by cover grid or list
* open a Book Hub from a cover, title, or row
* filter books by book type
* sort by status, title, recent engagement, ratings, difficulty, or reading pace
* see books grouped by reading status when using the default status sort
* see learning-task prompts assigned by a teacher
* see Ability Check reminders for their own library
* see a super-teacher kanji enrichment reminder
* add a book through the new `/books/add` flow

For teacher/super-teacher contexts, the page can also:
* view a student/member library when route and role logic allow it
* load limited teacher/student profile context
* show pending book request alerts for super teachers
* show teacher-facing learning tasks for a viewed student

The page displays private/user-book data:
* `user_books`
* joined shared `books` metadata
* reading-session derived stats from `user_book_reading_sessions`
* saved-word derived lookup counts from `user_book_words`
* `learning_tasks`
* teacher/student relationship and profile context
* pending `book_requests` for super-teacher alerting

It also reads Library Study / Ability Check data for reminder counts, but it does not directly edit saved words or reading sessions.

## Current Risks / Do Not Touch Yet

For the first pass, do not move or change:
* route username resolution
* signed-in user loading
* current-user vs viewed-user logic
* teacher, student, and super-teacher role logic
* teacher/student relationship queries
* public/private user profile boundaries
* `user_books` privacy assumptions
* book visibility rules, especially filtering out `is_teacher_prep`
* Supabase reads and writes
* RLS-dependent behavior
* pending book request loading, approval, rejection, and dismissal
* Ability Check reminder timing, localStorage keys, due-card calculation, or hide behavior
* Library Study color count loading
* monthly stats loading
* kanji enrichment alert loading
* learning-task loading, task action routing, and completion behavior
* search/filter/sort state and sorting logic
* reading pace and reading-progress calculations
* floating Add a Book navigation behavior
* old add-book/request-book/trial-prep code until it is manually verified as safe to remove

The first code changes should only move visual JSX into components. Keep state, handlers, calculations, data loading, access/security logic, privacy logic, and Supabase logic in `page.tsx`.

## Current Code Inventory

### Types

* `Book`
* `UserBookRow`
* `ProfileRole`
* `StudentOption`
* `AlertBoxState`
* `TeacherPrepItem`
* `KanjiEnrichmentAlertItem`
* `LearningTaskRow`
* `ReadingSessionStats`
* `MonthlyLibraryStats`
* `MonthOption`
* `UserBarVariant`
* `LibrarySnapshotView`
* `MekuruColor`
* `LibrarySortMode`
* `AbilityCheckReminderSettings`
* `AbilityCheckSummaryRow`
* `AbilityCheckProgressRow`

### Constants

* `MEKURU_ENCOUNTER_COLORS`
* `MEKURU_ABILITY_COLORS`
* Ability Check localStorage keys
* super-teacher kanji reminder localStorage key
* pending book request alert localStorage key
* Ability Check due-card and recheck timing constants

### Helper Functions

* listening-format detection
* date and time-zone helpers
* localStorage helper functions for reminders
* pending book request alert signature helpers
* Ability Check daily-pool helpers
* monthly range and month-option helpers
* formatting helpers for time and relative dates
* book key and ISBN normalization helpers
* Mekuru color label/dot/delta display helpers
* status label/order helpers
* nullable-number sorting helper
* library item sorting helper
* learning-task label/action helpers

### Data Loading

The page currently loads:
* current Supabase user
* current user's profile, role, username, super-teacher flag, and time zone
* viewed profile by route username
* teacher/student relationship data
* super-teacher profile lists
* user library rows from `user_books` joined to `books`
* reading-session stats for each loaded user book
* monthly library stats
* Mekuru color totals and month movement totals
* Ability Check reminder count
* learning tasks
* pending book requests
* kanji enrichment alert data
* lesson alert context

### State

Major state groups:
* library rows and reading stats
* current user, viewed user, teacher/student context
* alerts and reminders
* learning tasks and completion state
* messages
* old add-book modal state
* book request modal/list state
* filter, view, and sort state
* monthly stats state
* Mekuru color stats state
* Ability Check reminder state

### Derived / Calculated Values

* `isTeacher`
* `filteredRows`
* pending book request alert signature and visibility
* `allValidRows`
* `validRows`
* `viewingLabel`
* `isViewingStudentLibrary`
* `isViewingOwnLibrary`
* `libraryOwnerLabel`
* `libraryContextLabel`
* status groups: currently reading, want to read, finished, DNF
* `sortedValidRows`
* reminder/task visibility booleans
* per-book reading progress, pace, furthest page, lookup counts, and last engagement

### Event Handlers

* load monthly stats
* load Mekuru color counts
* load Ability Check reminder
* load learning tasks
* complete learning task
* fetch books
* old manual add book / trial prep add book
* load pending book requests
* old request book
* approve book request
* reject book request
* load kanji enrichment alerts
* load reading stats
* hide Ability Check reminder
* hide super-teacher kanji reminder
* dismiss pending book request alert
* navigate to library tools, book hubs, and `/books/add`

### Render Sections

* page shell
* library header
* logout/user bar
* Ability Check reminder banner
* super-teacher kanji reminder banner
* learning tasks panel
* learning-task error banner
* collapsible library guide
* disabled kanji enrichment alert section
* pending book requests alert
* view-mode controls
* book type and sort controls
* library intro note
* cover-grid status sections
* cover-grid sorted view
* list view
* empty state
* floating Add a Book button
* disabled old add-book modal

## First Pass: Visual / Page-Thinning Components

This first pass should be presentational only. Components should receive already-computed values and callbacks. Do not move calculations, Supabase logic, state, access/privacy rules, filtering/sorting logic, helper functions, or event handlers yet.

The suggested components below are ordered from easiest / lowest-risk to more complex: A, B, C, and onward.

## Old Or Suspicious Code

Do not remove these yet, but they should be manually verified before future cleanup:

* `showAddBook` modal JSX is guarded by `false && showAddBook`, so it is unreachable.
* `handleAddBook()` still exists and can create/load shared `books` rows and insert `user_books`.
* `handleAddBook({ asTrialPrep: true })` still exists inside the disabled modal and writes trial-prep fields.
* `newBookTitle`, `newBookAuthor`, `newBookIsbn`, `isSavingBook`, and `showAddBook` appear tied to the disabled old modal.
* `showRequestBook`, `requestBookTitle`, `requestBookAuthor`, `requestBookIsbn`, `isSavingRequest`, and `handleRequestBook()` appear not to be rendered in the current UI.
* `formatFilter` affects `filteredRows`, but no visible format filter control appears in the inspected render.
* `message` and `messageType` are set by loading/error flows but do not appear rendered in the current JSX.
* `alertBox` and `teacherPrepAlerts` are loaded/set but do not appear rendered in the current JSX.
* `librarySnapshotView`, monthly stats state, and Mekuru color stats state are loaded but do not appear rendered in the current JSX.
* `kanjiEnrichmentAlerts` are loaded for some teacher/super-teacher cases, but the alert UI is guarded by `false && ...`.
* The inline `UserBar` component has its own auth/profile loading and logout behavior. It may be reusable, but it is not purely presentational.

Manual verification before removal:
* Confirm the new `/books/add` flow has fully replaced the old manual add modal for all user roles.
* Confirm trial prep is truly retired or replaced by Teacher Library.
* Confirm book request creation/approval/rejection now lives in the intended Teacher Hub / Add Book flows.
* Confirm monthly stats and Mekuru color stats are no longer intended to display on the Library page.
* Confirm teacher lesson alerts are intentionally hidden from this page.
* Confirm `formatFilter` is not part of a planned UI return.

## Later Architecture Refactor

Do not implement these during the first visual pass. Keep them separate so architecture ideas are not mixed with safe page-thinning work.

### Shared Types

* Possible file/layer: `types.ts`.
* What logic might move later:
  * book/user-book row types
  * profile role and student option types
  * learning task row types
  * monthly stat and reading stat types
  * Ability Check reminder row/settings types
* Why it should wait:
  * component props can initially use local types from `page.tsx`.
* Risks to check before moving:
  * whether these types match other pages' versions
  * Supabase join shape differences
  * optional fields that are only selected on this page

### Access And Viewed-User Controller

* Possible file/layer: `controller.ts` or `service.ts`.
* What logic might move later:
  * route username resolution
  * current profile loading
  * teacher/student/super-teacher context
  * viewed-user selection
* Why it should wait:
  * this is privacy-sensitive and RLS-dependent.
* Risks to check before moving:
  * current user vs viewed user
  * teacher-owned student relationships
  * super-teacher broader access
  * route fallback behavior when username is missing or invalid

### Supabase Query Organization

* Possible file/layer: `dao.ts` or `repository.ts`.
* What logic might move later:
  * profile queries
  * `teacher_students` queries
  * `user_books` library query
  * reading-session stats query
  * saved-word lookup count query
  * book request query
  * learning-task query
* Why it should wait:
  * first pass should not change data loading or RLS behavior.
* Risks to check before moving:
  * teacher/student scoping
  * private user-book reads
  * Supabase joined `books` shape
  * error and empty-state behavior

### Library Stats Service

* Possible file/layer: `service.ts` and `dao.ts`.
* What logic might move later:
  * monthly library stats
  * reading pace/progress stats
  * words-looked-up counts
  * Mekuru color totals
* Why it should wait:
  * these calculations are user-visible and easy to subtly change.
* Risks to check before moving:
  * time-zone handling
  * listening vs reading session rules
  * unique word counting
  * month boundaries
  * pages-read calculations

### Ability Check Reminder Service

* Possible file/layer: `service.ts`.
* What logic might move later:
  * due-card eligibility
  * localStorage day-key handling
  * recheck timing rules
  * Library Study color status integration
* Why it should wait:
  * this is app-rule logic, not visual thinning.
* Risks to check before moving:
  * same-day hidden/completed behavior
  * spaced recheck windows
  * katakana skip setting
  * grey/limbo recovery logic

### Book Request Controller

* Possible file/layer: `controller.ts`, `service.ts`, and `dao.ts`.
* What logic might move later:
  * load pending requests
  * approve request
  * reject request
  * dismiss alert state
* Why it should wait:
  * super-teacher permissions and request history behavior are still evolving.
* Risks to check before moving:
  * pending vs rejected status
  * old RPC behavior
  * book request vs imported-needs-review distinction

### Learning Task Controller

* Possible file/layer: `controller.ts` and `service.ts`.
* What logic might move later:
  * task loading
  * task action routing
  * completion mutation
  * task detail view-model shaping
* Why it should wait:
  * task behavior mixes teacher-visible and learner-owned flows.
* Risks to check before moving:
  * learner-only completion
  * teacher viewing student tasks
  * task payload route generation
  * cancelled/assigned status assumptions

### Sort And Filter Helpers

* Possible file/layer: `helpers.ts`.
* What logic might move later:
  * status labels
  * status ordering
  * nullable number comparisons
  * library item sorting
  * book type and format filtering
* Why it should wait:
  * controlled state and display should be stable after visual extraction.
* Risks to check before moving:
  * rating null placement
  * pace null placement
  * status grouping order
  * `is_teacher_prep` exclusion

### Old Flow Cleanup

* Possible file/layer: cleanup task after verification.
* What logic might move or be removed later:
  * disabled old add-book modal
  * trial-prep add logic
  * unused request-book modal state/handler
  * hidden kanji enrichment alert UI
  * hidden or unused monthly/color snapshot state
* Why it should wait:
  * removal changes behavior if any hidden flow is still intentionally paused.
* Risks to check before moving:
  * teacher Add Book replacement
  * Teacher Library replacement for Trial Prep
  * pending request alerts and Teacher Hub behavior
  * future plans for Library stats display

## Suggested Status Labels

Use these labels for this page:
* Not started
* Visual pass in progress
* Visual pass mostly done
* Visual pass done / architecture deferred
* Architecture pass later
* Architecture pass in progress
* Architecture pass done

Recommended current status: `Not started`.

When all safe presentational extractions are complete, use `Visual pass done / architecture deferred`. That should mean the page-thinning layer is complete and the deeper controller/service/DAO/helper cleanup is intentionally saved for later, not that the visual work is unfinished.

- [✔️] Extracted `LibraryHeader`
- [✔️] Extracted `LibraryGuidePanel`
- [✔️] Extracted `LibraryViewControls`
- [✔️] Extracted `LibraryBookCard`
- [✔️] Extracted `LibraryBookRow`
- [✔️] Extracted `LibrarySection`
- [✔️] Extracted `LibraryEmptyState`
- [✔️] Extracted `LibraryReminderBanner`
- [✔️] Extracted `LearningTasksPanel` with LearningTaskCard
- [✔️] Extracted `PendingBookRequestsAlert`
- [✔️] Extracted `FloatingAddBookButton`

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status label:

`Visual pass done / good stopping point`

This status fits because the main repeated visual structures are already page-local components: header, guide panel, controls, book card, book row, section wrapper, empty state, reminder banner, learning task cards, pending request alert, and floating add button. The remaining page is still large, but its size now comes mostly from privacy-sensitive user/profile lookup, teacher/student context, Supabase loading, reminders, stats, alerts, sorting, and legacy paused flows.

The current tracker label can change from `Visual pass done / architecture deferred` to `Visual pass done / good stopping point`.

Updated tracker row based on the current line count:

`- [x] Visual pass done / good stopping point | app/(protected)/users/[username]/books/page.tsx | 3089 | 2872 | -217 |`

The line count differs from the older tracker row's 2837-line count. Treat 2872 as the current observed count for this audit.

### 2. Readability Check

The page is easier to scan than before. The extracted components make the bottom render branch much clearer: the page now reads as high-level library composition rather than a long wall of repeated card and row markup.

The extracted components are helping readability. `LibraryHeader`, `LibraryViewControls`, `LibraryBookCard`, `LibraryBookRow`, `LibrarySection`, `LearningTaskCard`, and `PendingBookRequestsAlert` are all good visual boundaries.

The remaining page sections are understandable, but the file is still conceptually busy because it handles the user's own library, teacher viewing contexts, super-teacher alerts, learning tasks, Ability Check reminders, monthly stats, color stats, pending book requests, old add-book code, and route fallback behavior in one page.

The most visually overwhelming remaining area is not the active book list. It is the disabled old add-book modal plus surrounding legacy add/request state and handlers. That should be reviewed as feature cleanup rather than extracted for visual thinning.

### 3. Remaining Code Classification

Username route / profile lookup behavior:
* `routeUsername` comes from params.
* the current user is loaded from Supabase auth.
* the current user's profile loads role, super-teacher flag, username, and time zone.
* the viewed profile is resolved by route username.
* when the route username is missing or unresolved, the page falls back to the current user's own library.

Public/private profile boundary:
* profile display context is limited to display labels, usernames, roles, levels, and lesson-day alert context.
* private library rows are loaded through the effective target user logic and RLS.
* this page should continue avoiding broad public/private profile expansion during visual cleanup.

Effective viewer/current-user fallback behavior:
* regular users load their own data even when a different route username is supplied.
* teachers can load viewed student/member data when role/RLS allow it.
* super-teacher behavior has broader profile/student context.
* monthly stats and color counts align to the same effective target user logic.

Supabase loading:
* current auth user.
* current profile.
* viewed profile by username.
* teacher/student relationships.
* profile lists for super teachers or linked students.
* `user_books` joined to `books`.
* reading sessions and saved-word counts.
* monthly stats data.
* Library Study color breakdown.
* Ability Check reminder summaries/progress.
* learning tasks.
* pending book requests.
* kanji enrichment alert data.
* lesson alert profile/completion data.

Public book list loading:
* despite the route shape, this page is currently a protected library page with private `user_books` loading.
* regular users are safely scoped back to their own `user.id`.
* teacher/super-teacher viewing remains role/RLS-dependent.

Stats/color count loading:
* monthly stats use an effective target user.
* color counts use the same effective target user as the library query.
* reading stats and lookup counts are loaded through the loaded user book IDs.

Filter/sort behavior:
* book type filter.
* format filter state exists, though visible controls do not appear to expose it.
* view mode cover/list.
* sort modes for status, title, last engagement, rating, difficulty, and pace.
* status sections for currently reading, want to read, finished, and DNF.

Derived values:
* `isTeacher`.
* `filteredRows`.
* pending request alert signature/visibility.
* `validRows` and teacher-prep exclusion.
* viewed-library labels.
* status buckets.
* sorted rows.
* reminder/task visibility booleans.

Helper functions:
* date/time-zone helpers.
* localStorage reminder helpers.
* pending request signature helpers.
* Ability Check reminder eligibility helpers.
* monthly stats helpers.
* formatting helpers.
* book key / ISBN helpers.
* Mekuru color helpers.
* sorting/status helpers.
* learning-task label/action helpers.

Visual JSX still in `page.tsx`:
* Ability Check reminder banner body/actions.
* super-teacher kanji reminder banner body/actions.
* learning-task mapping and view-model shaping.
* learning task error banner.
* disabled kanji enrichment alert block.
* book-list composition around extracted components.
* disabled old add-book modal.
* regular-user floating add button.

Component composition:
* active book list composition is much clearer.
* extracted components are page-local and appropriately narrow.
* `UserBar` remains inline and includes auth/profile behavior, so it is not a simple visual component.

Legacy or suspicious code:
* old add-book modal is guarded by `false && showAddBook`.
* request-book state/handler appears unrendered.
* `formatFilter` affects filtering but is not visibly controlled.
* `message` and `messageType` appear set but not rendered.
* `alertBox` and `teacherPrepAlerts` are loaded/set but not rendered.
* monthly and Mekuru color snapshot state is loaded but not visibly rendered.
* kanji enrichment alert UI is guarded by `false &&`.

Overall, the remaining 2872 lines are mostly behavior, privacy, and architecture rather than easy visual JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `LibraryReminderActions`

What JSX it owns:
* small action-button groups inside Ability Check and Kanji reminder banners.

Why it is safe or not safe:
* The JSX is presentational, but each action directly calls localStorage hide helpers, state setters, and navigation. Extracting would create callback props for a small gain.

Expected risk level:
* Low-medium.

Do now or defer:
* Defer. `LibraryReminderBanner` already captured the important visual shell.

#### `LearningTaskList`

What JSX it owns:
* mapping `learningTasks` into `LearningTaskCard`.
* task details display.

Why it is safe or not safe:
* Not purely visual. The map builds task labels, route actions, page/chapter/detail text, completion ability, and navigation handlers inline.

Expected risk level:
* Medium.

Do now or defer:
* Defer until task view-model shaping is separated from render.

#### `LibraryBookSections`

What JSX it owns:
* Currently Reading, Want to Read, Finished, and DNF section composition.

Why it is safe or not safe:
* Visually safe, but it would need section arrays, render callbacks, grid class, and row groups. It would not reduce the underlying complexity much.

Expected risk level:
* Low-medium.

Do now or defer:
* Defer. Current `LibrarySection` extraction is enough.

#### `LegacyAddBookModal`

What JSX it owns:
* disabled add-book modal guarded by `false && showAddBook`.

Why it is safe or not safe:
* It is visually extractable but probably legacy/paused. Extracting it would preserve and legitimize dead UI instead of clarifying whether it should be removed later.

Expected risk level:
* Medium.

Do now or defer:
* Defer to feature cleanup. Do not extract just for line count.

#### `UserBar`

What JSX it owns:
* current user label/logout UI.

Why it is safe or not safe:
* Not presentational. It performs its own auth/profile loading and logout behavior.

Expected risk level:
* Medium-high.

Do now or defer:
* Defer until auth/profile header behavior is redesigned or shared intentionally.

### 5. Prop Basket / Over-Extraction Check

No extracted component appears too prop-heavy. `LibraryBookCard` and `LibraryBookRow` naturally receive several display props, but they are good page-specific visual boundaries.

No extraction appears to make the page harder to understand. The active render path is easier to follow because book cards, rows, sections, controls, guide panels, and reminders have names.

Components that should stay local and page-specific:
* `LibraryBookCard`.
* `LibraryBookRow`.
* `LibraryViewControls`.
* `LearningTaskCard`.
* `PendingBookRequestsAlert`.
* `LibraryGuidePanel`.

Components that might eventually become shared, but should stay local for now:
* `LibraryReminderBanner`.
* `LibraryEmptyState`.
* `FloatingAddBookButton`.
* section/card layout patterns.

Do not move shared components yet. This page's UI is tied to private library behavior and teacher/super-teacher contexts.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred:
* current user lookup.
* viewed username/profile lookup.
* fallback to current user's own library when needed.
* public/private library behavior.
* public profile display behavior.
* private book data boundaries.
* private saved-word data boundaries.
* stats/color count privacy.
* Supabase queries.
* route/navigation behavior.

The extracted components are visual shells or display components. They do not appear to own Supabase loading, profile lookup, access decisions, private data targeting, or RLS-sensitive behavior.

Suspicious, but not fixed here:
* This is still a protected/private library page despite the `/users/[username]/books` shape. The route name can suggest a public profile/library page, but current behavior falls regular users back to their own library.
* Some old public/private profile assumptions may need a later dedicated profile-boundary pass.
* Hidden and legacy feature blocks make the file look more active than the rendered UI really is.

### 7. Architecture Deferred List

Shared types:
* Defer because page row shapes include specific Supabase joins and teacher/task fields that may not match other pages.

Helper functions:
* Defer because helpers mix date/time-zone, Ability Check rules, color logic, sorting, and display labels. Extract one concern at a time later.

Access/profile lookup helpers:
* Defer because current-user vs viewed-user fallback behavior is privacy-sensitive and should be centralized only after the route model is stable.

Services / DAOs / controllers:
* Defer because the page still coordinates many flows. Moving queries without tests could accidentally change RLS-dependent behavior.

Repeated Supabase loading:
* Defer until public/private library behavior and Teacher Hub alert movement are settled.

Public profile boundary helpers:
* Defer because public profile behavior should be designed as an intentional boundary, not inferred from this protected library page.

Book list filtering/sorting helpers:
* Defer because they are lower risk, but the current page is not blocked on them. Extract later with focused tests or before a second architecture pass.

Stats/color count helpers:
* Defer because they involve private user book IDs, time zones, sessions, saved words, and color progress. These are user-visible and privacy-sensitive.

Learning task helpers:
* Defer because task payload routing and completion rules mix teacher and learner behavior.

Book request / alert helpers:
* Defer because pending book requests have recently changed and are moving toward Teacher Hub / admin upkeep patterns.

### 8. Browser Smoke Test Suggestions

Manual smoke checklist:
* Log in as a regular user and open their own `/users/[username]/books` page.
* Manually open another user's `/users/[username]/books` route and confirm the fallback behavior still safely shows the current user's own library.
* Log in as a teacher and confirm intended student-library viewing still works when linked and allowed.
* Confirm public/profile display labels appear correctly.
* Confirm private-only information is not shown for an unauthorized route target.
* Confirm book cards render in cover mode.
* Confirm book rows render in list mode.
* Confirm book type filter works.
* Confirm sort controls work for status, title, recent engagement, ratings, difficulty, and pace where data exists.
* Confirm monthly stats and Mekuru color counts use the same safe effective user target as the loaded library.
* Confirm book links point only to accessible Book Hubs.
* Confirm learning tasks render and learner completion still works when applicable.
* Confirm pending book request alert only appears for super teachers and dismiss/reject/open actions still work.
* Confirm Ability Check reminder appears only for the current user's own library and hide-today behavior works.
* Confirm empty state works for a user with no books.
* Check mobile-ish layout for header, reminders, guide, controls, book cards, list rows, and floating add button.

Do not run this smoke test during this doc-only audit unless specifically requested.

### 9. Final Recommendation

Recommendation:

Stop visual thinning here.

This page has reached a good stopping point for the first visual component pass. The useful next work is not another presentational extraction; it is feature cleanup and second-pass architecture planning around route semantics, private/public library boundaries, Teacher Hub alert movement, old add/request-book code, stats/color loading, and learning-task behavior.
