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
