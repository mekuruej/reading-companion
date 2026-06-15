# Teacher Assign Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/teacher/assign/page.tsx`

Current observed size: 532 lines as of 2026-06-15.

## Current Page Purpose

This page is a teacher-facing "Add / Prep a Book" workflow.

It currently lets an authorized teacher:

- choose an existing learner and add a shared/global book to that learner's library
- choose a book and save it to the teacher's prep shelf for a future/prospective learner
- search/filter the global book list
- see whether the selected book is missing core metadata
- jump to the teacher book edit/add page for the selected book
- view the teacher's current prep shelf
- remove books from the teacher's prep shelf

This page handles:

- assigning books to students: yes, through `user_books.insert(...)`
- creating student `user_books`: yes, in `add_to_library` mode
- copying or linking teacher prep data: only lightly; future learner prep shelf rows are created in `teacher_book_prep_items`, but no prep data is copied into the student account here
- loading linked students: yes, for regular teachers through `teacher_students`
- loading teacher books: no dedicated `teacher_books` table load is visible; it loads global/shared `books`
- loading shared/global books: yes, from `books`
- checking teacher or super-teacher access: yes, through the current user's `profiles.role` and `profiles.is_super_teacher`
- showing assignment history: no, not in the student assignment sense; it only shows the teacher's prep shelf
- updating assignment status: no update handler is present
- writing to student-owned data: yes, it creates `user_books` rows for selected learners
- writing only to teacher-owned data: in prep mode, yes, it writes/deletes `teacher_book_prep_items` scoped to `teacher_id`

## Important Data Boundaries

This page crosses an important boundary because one mode creates learner-visible records.

Teacher/super-teacher access:

- The page requires the signed-in profile to be a teacher or super-teacher.
- Super-teachers can load all profiles and choose any learner profile.
- Regular teachers load only linked students through `teacher_students` rows where `teacher_id = authUser.id` and `archived_at is null`.

Student-owned data:

- In `add_to_library` mode, the page inserts into `user_books` with `user_id: studentId`.
- That creates a learner-visible book row in the selected student's library.
- The page does not appear to create student-owned vocabulary, reading sessions, study data, or learning tasks.

Teacher-owned data:

- In `prep_future` mode, the page inserts into `teacher_book_prep_items` with `teacher_id: meId`, `learner_id: null`, and `status: "prepping"`.
- Prep shelf delete is scoped with `.eq("teacher_id", meId)`.
- Prep shelf rows are not learner-visible yet according to the page copy.

Shared/global book data:

- The page loads from the shared/global `books` table.
- It does not create or update `books` directly.
- It links to `/teacher/books/add?bookId=...` for book metadata editing.

Learner-visible assignment boundary:

- `add_to_library` creates learner-visible records immediately.
- `prep_future` creates teacher-owned prep shelf records only.

This distinction should stay very clear during any visual pass.

## Current Risks / Do Not Touch Yet

Do not move or change these during a first visual pass:

- access checks
- Supabase queries
- linked student filtering
- teacher/student relationship logic
- super-teacher all-profile branch
- regular teacher linked-student branch
- assignment creation logic
- prep shelf creation logic
- prep shelf delete logic
- book ownership/access assumptions
- student-owned `user_books` creation
- teacher-owned `teacher_book_prep_items` creation/deletion
- duplicate handling behavior
- form validation
- success/error message behavior
- helper functions
- page-local types
- services, DAOs, controllers, hooks, or shared access helpers

## Current Structure Map

### Types / Interfaces

Keep all page-local types in `page.tsx` for the first visual pass.

- `ProfileRow`: profile fields used for teacher/learner selection and access checks.
- `TeacherStudentLink`: linked-student row shape used by regular teachers.
- `BookRow`: shared/global book metadata used for selection/search/missing-info helper.
- `UserBookRow`: inserted student-owned `user_books` row shape returned after assignment.
- `PrepItemRow`: teacher prep shelf row with joined book metadata.
- `ActionMode`: `"add_to_library" | "prep_future"` mode switch.

### Constants

No major file-level constants are present.

Inline copy/options that should stay in `page.tsx` for the first pass:

- page title: `Add / Prep a Book`
- action mode labels: `Add to Learner Library`, `Prep for Future Learner`
- form helper copy
- success/error copy
- prep shelf headings/copy
- route strings for `/teacher/students` and `/teacher/books/add`
- status values such as `prepping`, `ready`, and `reading`

### Helper Functions

Keep all helper functions in `page.tsx` for the first visual pass.

- `labelProfile(p)`: builds a display label from display name, level, or ID.
- `getPrepBook(bookRow)`: normalizes a joined `books` value that may be object or array.
- `missingBookInfo(book)`: returns missing metadata labels for a selected book.
- `bookSearchText(book)`: builds lowercased searchable text for book filtering.
- `prospectiveLearnerLabel(notes)`: parses prep shelf notes for a future learner display label.

### State

Access/loading state:

- `loading`
- `needsSignIn`
- `meId`
- `canAccess`
- `isSuperTeacher`

Message/error state:

- `errorMsg`
- `successMsg`

Teacher/student/book data state:

- `profiles`
- `books`
- `prepItems`

Form state:

- `studentId`
- `bookId`
- `bookSearch`
- `actionMode`
- `prospectiveLearnerName`
- `prospectiveLearnerContact`

Assignment state:

- no separate assignment-history state
- assignment result is currently represented through `successMsg`

Filter/search state:

- `bookSearch`
- derived `filteredBooks`

### Data Loading / Supabase Behavior

The main load effect:

1. Calls `supabase.auth.getUser()`.
2. Sets `needsSignIn` if no user exists.
3. Loads the current user's `profiles` row with `id`, `role`, and `is_super_teacher`.
4. Allows access when the user is a teacher or super-teacher.
5. For super-teachers:
   - loads all `profiles`
   - this gives super-teachers broad learner selection.
6. For regular teachers:
   - loads `teacher_students` rows for the current teacher
   - filters to non-archived links
   - loads only linked student profiles by ID.
7. Loads shared/global `books`.
8. Sets default student and book selections.
9. Loads the current teacher's prep shelf from `teacher_book_prep_items`, joined to `books`, filtered to `status in ("prepping", "ready")`.

Teacher vs super-teacher query branches:

- Super-teacher: all profiles.
- Regular teacher: only linked student profiles from `teacher_students`.

Do not change these branches during visual cleanup.

### Save / Update / Delete Behavior

`handlePrimaryAction()` handles both modes.

In `prep_future` mode:

- validates that future learner name or contact/note exists
- writes to `teacher_book_prep_items`
- sets `teacher_id: meId`
- sets `learner_id: null`
- sets `book_id: bookId`
- sets `status: "prepping"`
- stores prospective learner info in `notes`
- updates local `prepItems`
- displays a success message
- duplicate/unique errors are converted into a friendly success-like message

In `add_to_library` mode:

- validates `studentId`
- writes to `user_books`
- sets `user_id: studentId`
- sets `book_id: bookId`
- sets `status: "reading"`
- sets `started_at` to the current timestamp
- displays a success message including the new `user_books.id`
- duplicate/unique errors are converted into a friendly message

This page does create student-owned `user_books`.

`removePrepItem(itemId)`:

- confirms with `window.confirm`
- deletes from `teacher_book_prep_items`
- scopes delete by both `id` and `teacher_id: meId`
- removes the item from local `prepItems`
- displays a success message

No update handler is present. No student-owned vocabulary, reading sessions, study data, or learning task writes are visible.

### Derived Values

Derived values:

- `selectableProfiles`: filters out the current teacher profile.
- `selectedBook`: finds the current selected shared/global book.
- `selectedBookMissingInfo`: checks missing metadata for the selected book.
- `profileNameById`: maps profile IDs to display labels.
- `filteredBooks`: filters shared/global books by title, author, ISBN, publisher, or book type.

Effects also derive/set defaults:

- default `studentId` when selectable profiles load or change
- default `bookId` when filtered books load or change

### Render Sections

Top-to-bottom render order:

1. Loading state.
2. Needs-sign-in state.
3. No-access state.
4. Page shell.
5. Header row with title and Back to My Students link.
6. Intro copy explaining Add vs Prep and teacher/super-teacher selection scope.
7. Error message banner.
8. Success message banner.
9. Main assignment/prep form card.
10. Action mode toggle buttons.
11. Existing learner select or future learner fields.
12. Learner-mode helper text.
13. Book search input.
14. Book select.
15. Book result count helper.
16. Selected book info helper and edit-book-info link.
17. Mode explanation panel.
18. Primary action button.
19. Learning-tasks reminder copy.
20. My Prep Shelf section.
21. Prep shelf empty state.
22. Prep shelf item cards with edit book info and remove actions.

## Recommended First-Pass Visual Extractions

Only extract presentational UI. Keep access, queries, relationship logic, assignment creation, prep shelf writes/deletes, validation, helper functions, and state in `page.tsx`.

### 1. `TeacherAssignLoadingState`

What JSX it owns:

- loading `main` and message.

What stays in `page.tsx`:

- `loading` branch decision.

Expected props:

- optional `message?: string`

Risk level:

- Low.

Suggested order:

- 1

### 2. `TeacherAssignSimpleState`

What JSX it owns:

- sign-in required state
- no-access state

What stays in `page.tsx`:

- `needsSignIn` and `canAccess` decisions
- message text decision

Expected props:

- `message: string`

Risk level:

- Low.

Suggested order:

- 2

### 3. `TeacherAssignHeader`

What JSX it owns:

- title row
- Back to My Students link
- intro paragraph

What stays in `page.tsx`:

- `isSuperTeacher` boolean
- route choice for the link if it ever changes

Expected props:

- `isSuperTeacher: boolean`

Risk level:

- Low.

Suggested order:

- 3

### 4. `TeacherAssignMessageBanner`

What JSX it owns:

- error banner
- success banner

What stays in `page.tsx`:

- `errorMsg`
- `successMsg`
- message-setting behavior

Expected props:

- `errorMsg?: string | null`
- `successMsg?: string | null`

Risk level:

- Low.

Suggested order:

- 4

### 5. `TeacherAssignModeToggle`

What JSX it owns:

- Add to Learner Library button
- Prep for Future Learner button

What stays in `page.tsx`:

- `actionMode` state
- `setActionMode`

Expected props:

- `actionMode: ActionMode`
- `onChangeMode: (mode: ActionMode) => void`

Risk level:

- Low-medium.

Suggested order:

- 5

### 6. `TeacherAssignLearnerFields`

What JSX it owns:

- Existing learner select
- Future learner name/contact fields
- learner-mode helper text

What stays in `page.tsx`:

- `actionMode`
- `studentId`
- `setStudentId`
- `selectableProfiles`
- `prospectiveLearnerName`
- `setProspectiveLearnerName`
- `prospectiveLearnerContact`
- `setProspectiveLearnerContact`
- `labelProfile`

Expected props:

- `actionMode: ActionMode`
- `studentId: string`
- `profiles: ProfileRow[]`
- `prospectiveLearnerName: string`
- `prospectiveLearnerContact: string`
- `onStudentChange: (id: string) => void`
- `onProspectiveLearnerNameChange: (value: string) => void`
- `onProspectiveLearnerContactChange: (value: string) => void`
- `labelProfile: (profile: ProfileRow) => string`

Risk level:

- Medium because it is controlled form UI and uses page-local types/helpers.

Suggested order:

- 6

### 7. `TeacherAssignBookPicker`

What JSX it owns:

- book search input
- book select
- result count helper
- selected book info helper
- Edit book info link

What stays in `page.tsx`:

- `bookSearch`
- `setBookSearch`
- `bookId`
- `setBookId`
- `filteredBooks`
- `books`
- `selectedBook`
- `selectedBookMissingInfo`
- book route construction

Expected props:

- `bookSearch: string`
- `bookId: string`
- `books: BookRow[]`
- `filteredBooks: BookRow[]`
- `selectedBook?: BookRow`
- `selectedBookMissingInfo: string[]`
- `onBookSearchChange: (value: string) => void`
- `onBookChange: (id: string) => void`

Risk level:

- Medium because it combines controlled UI, selected-book display, and edit route.

Suggested order:

- 7

### 8. `TeacherAssignActionPanel`

What JSX it owns:

- mode explanation panel
- primary action button
- learning-tasks reminder copy

What stays in `page.tsx`:

- `handlePrimaryAction`
- action mode decision
- all validation/save behavior

Expected props:

- `actionMode: ActionMode`
- `onPrimaryAction: () => void`

Risk level:

- Low-medium.

Suggested order:

- 8

### 9. `TeacherPrepShelfSection`

What JSX it owns:

- My Prep Shelf section
- section heading/copy
- empty state
- prep item cards
- edit book info links
- remove buttons

What stays in `page.tsx`:

- `prepItems`
- `profileNameById`
- `getPrepBook`
- `prospectiveLearnerLabel`
- `removePrepItem`
- route construction if desired

Expected props:

- `items: PrepItemRow[]`
- `profileNameById: Map<string, string>`
- `onRemovePrepItem: (id: string) => void`

Risk level:

- Medium because it includes delete buttons and joined-book normalization helpers.

Suggested order:

- 9

## Suspicious / Possibly Unused Code

Do not remove anything yet.

- Current tracker row says 811 lines, but observed line count is 812.
- The page title/comment says `Add / Prep a Book`, while newer Teacher Hub organization may place this under Lesson Prep; copy may need later alignment.
- Super-teachers load all profiles, including non-student profiles. `selectableProfiles` only filters out the current user, not by learner/member/student role.
- Regular teachers are filtered to linked students, which is good, but the actual `user_books.insert` relies on the selected `studentId` from that loaded list and database/RLS as backup.
- Creating a learner-visible `user_books` row from the client is a sensitive flow and should not be moved casually.
- Success message exposes `user_books.id`; useful for debugging but maybe not ideal long-term UI copy.
- Prep shelf prospective learner data is stored in free-text `notes` and parsed with regex. This is understandable for a scaffold but fragile.
- `PrepItemRow.learner_id` can exist, but this page's `prep_future` insert always sets it to `null`.
- There is no visible flow here to connect a prep shelf item to a real learner later.
- `UserBookRow.current_location` is selected after insert but does not appear rendered.
- There is no explicit submit-saving/disabled state, so repeated clicks could potentially duplicate requests, depending on database constraints.
- The page loads global `books` directly and assumes they are assignable.
- Book metadata helper links to `/teacher/books/add?bookId=...`, which may overlap with newer General Upkeep / Teaching Books organization.

## Recommended First Pass

Recommended first visual pass:

1. Extract `TeacherAssignLoadingState`.
2. Extract `TeacherAssignSimpleState`.
3. Extract `TeacherAssignHeader`.
4. Extract `TeacherAssignMessageBanner`.
5. Extract `TeacherAssignModeToggle`.
6. Extract `TeacherAssignActionPanel`.
7. Stop and reassess before moving the controlled learner/book form sections.

Optional after reassessment:

8. Extract `TeacherAssignLearnerFields`.
9. Extract `TeacherAssignBookPicker`.
10. Extract `TeacherPrepShelfSection`.

Stop after visual wrappers and controlled form UI. Do not move assignment creation, prep shelf writes/deletes, linked-student filtering, access checks, or Supabase queries in the first pass.

## Architecture Deferred

Defer these to a later architecture pass:

- teacher access helper: access logic should be shared across teacher pages, but not during visual thinning.
- teacher/student assignment service: `user_books` creation for students is behavior-sensitive.
- assignment DAO/repository: query/write boundaries need careful tests.
- linked student query helper: regular teacher visibility is privacy-sensitive.
- student book creation helper: should centralize duplicate handling and learner-visible row creation later.
- teacher prep shelf service: future learner prep rows and note parsing need a clearer model.
- shared book lookup helper: global `books` loading/search may be shared later.
- validation helper: future learner validation and student/book validation can wait.
- hooks/controllers/services: should wait until product boundaries between Lesson Prep, Teaching Books, and student assignment are clearer.

## Browser Smoke Test Suggestions

After a visual extraction, manually test:

- teacher can open `/teacher/assign`.
- super-teacher can open `/teacher/assign`.
- regular student/member is blocked by teacher route protection/page access.
- regular teacher sees only linked students.
- super-teacher sees the intended broader profile list.
- page handles no linked students gracefully.
- page handles no books gracefully.
- book search filters by title/author/ISBN/publisher/book type.
- changing filtered books keeps a valid selected book.
- Add to Learner Library creates a `user_books` row for the selected learner.
- duplicate add shows the current friendly message.
- added book becomes visible to the learner where expected.
- Prep for Future Learner requires name or contact/note.
- Prep for Future Learner creates only a teacher-owned `teacher_book_prep_items` row.
- prep shelf item appears after creation.
- Remove from Prep Shelf deletes only the current teacher's prep item.
- Edit book info link goes to the expected teacher book add/edit route.
- error and success banners still appear correctly.
- mobile-ish layout check for mode buttons, learner fields, book selector, and prep shelf cards.

## Final Recommendation

This page is worth thinning, but carefully.

Safe first-pass targets:

- loading/sign-in/no-access states
- header
- message banners
- mode toggle
- static explanation/action panels

Defer anything that moves:

- teacher/super-teacher access logic
- linked-student loading
- student-owned `user_books` creation
- prep shelf insert/delete logic
- global book loading/search behavior
- teacher/student assignment architecture

Suggested updated tracker row:

`- [x] Visual pass complete / good stopping point / architecture deferred | app/(protected)/teacher/assign/page.tsx | 812 | 532 | -280 |`

## Current Refactor Audit, 2026-06-15

Current observed line count:

* `app/(protected)/teacher/assign/page.tsx`: 532 lines

Extracted visual components:

* `TeacherAssignPageShell`
* `TeacherAssignLoadingState`
* `TeacherAssignSimpleState`
* `TeacherAssignHeader`
* `TeacherAssignMessageBanner`
* `TeacherAssignModeToggle`
* `TeacherAssignModeExplanation`
* `TeacherAssignLearningTasksNote`
* `TeacherAssignFormCard`
* `TeacherAssignFieldBlock`
* `TeacherAssignLearnerFields`
* `TeacherAssignBookPicker`
* `TeacherAssignSelectedBookHelper`
* `TeacherAssignPrimaryActionButton`
* `TeacherAssignActionPanel`
* `TeacherPrepShelfHeader`
* `TeacherPrepShelfSection`
* `TeacherPrepShelfList`
* `TeacherPrepShelfItemCard`
* `TeacherPrepShelfEmptyState`

This covers the first visual pass and much of the safe repeated UI around the prep shelf.

Suggested components intentionally left in the page:

* No major visual shell/list components remain page-local.
* Page-local helpers remain in the page, including profile labels, prep-book normalization, missing-book metadata checks, book search text, and prospective learner label parsing.

Risk-boundary check:

The page still owns:

* Supabase Auth and profile access checks
* teacher/super-teacher branching
* linked-student loading
* broad super-teacher profile loading
* shared/global book loading
* `teacher_book_prep_items` loading
* `handlePrimaryAction`
* student-owned `user_books` creation
* teacher-owned `teacher_book_prep_items` creation
* prep shelf delete behavior
* duplicate handling and success/error message state

No extraction appears to have moved assignment/prep mutations, access checks, or teacher/student relationship logic into visual components.

Current status:

Visual pass complete. Good stopping point. Needs architecture pass later if assignment, teacher prep shelf, and future learner prep become separate workflows.

Updated tracker row:

```md
- [x] | Visual pass complete / good stopping point / architecture deferred | `app/(protected)/teacher/assign/page.tsx` | 812 | 532 | -280 |
```
