# Teacher Add Book Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/teacher/books/add/page.tsx`

Current tracker row:

`- [x] ⭐️Visual pass checkpoint | app/(protected)/teacher/books/add/page.tsx | 1288 | 1198 | -90 |`

Current observed size: 1198 lines as of 2026-06-15.

## Current Page Purpose

This page is a teacher/super-teacher-facing global catalog book add/edit page.

Current responsibilities include:

* checking whether the signed-in user has teacher or super-teacher access
* redirecting signed-out users to `/login`
* creating a new shared/global `books` row manually
* loading an existing shared/global `books` row by `bookId`
* editing shared/global book details through the shared `BookInfoTab` editing surface
* loading a pending `book_requests` row by `requestId`
* pre-filling title, author, and ISBN fields from a pending book request when available
* rejecting a pending book request through `/api/book-requests/reject`
* marking a request as `reviewed` after a manual global book is created from it
* looking up ISBN metadata through `/api/books/lookup-isbn`
* previewing ISBN metadata before saving anything to Mekuru
* loading an existing global book when an ISBN already exists
* creating a new global book from ISBN metadata
* showing missing core shared-book fields after a global book is loaded/created
* navigating back to `/teacher/books`
* replacing the route with `?bookId=...` after a global book is created or loaded

The page does not currently:

* choose a learner/student
* create a `user_books` row
* add a book to a teacher library
* add a book to a selected student's library
* create teacher-prep or trial-prep rows
* assign a book to a student

The visible copy explicitly says this creates or updates a shared catalog book and does not add the book to a student library.

## Important Data Boundaries

This page crosses global/shared catalog and teacher/admin boundaries:

* The signed-in teacher or super-teacher is loaded from Supabase Auth and `profiles`.
* Teacher/super-teacher access determines whether the page can be used.
* Shared/global `books` rows are created and updated from this client page.
* Pending `book_requests` rows can be loaded and marked `reviewed`.
* Pending `book_requests` rows can be rejected through an API route that requires the current session token.
* ISBN metadata is fetched through `/api/books/lookup-isbn`; lookup preview data is not saved until the teacher creates/loads a global book.
* Imported/new book metadata is shared catalog data, not private learner data.
* No private student-owned `user_books` rows are created here.
* No linked-student data is loaded in this file.

Important current design direction:

Regular users should not directly create messy shared `books` rows through manual entry. This page is explicitly a teacher/admin-style global catalog tool. Future normal Add Book flow should prefer ISBN-13 import/request. Teacher-side book flows may still be changing, so do not deepen teacher assignment/prep architecture here until the product direction is confirmed.

## Current Risks / Do Not Touch Yet

Do not move or change these during a first visual pass:

* teacher route protection
* local teacher/super-teacher role checks
* signed-out redirect
* Supabase queries
* shared `books` insert behavior
* shared `books` update behavior
* existing-book lookup by `isbn13`
* existing-book load by `bookId`
* pending `book_requests` loading
* pending request `reviewed` update
* request rejection through `/api/book-requests/reject`
* ISBN lookup/import behavior through `/api/books/lookup-isbn`
* ISBN metadata preview behavior
* duplicate/existing global book behavior
* form validation
* missing core-field calculation
* route replacement after create/load
* shared `BookInfoTab` prop wiring
* helper functions
* page-local types
* save/update handlers
* services, DAOs, controllers, hooks, or shared access helpers

There is no linked-student relationship logic in this file to move.

## Current Structure Map

### Types / Interfaces

Keep all page-local types in `page.tsx` for the first visual pass.

Current types:

* `BookRow`
* `EditingPanel`
* `IsbnLookupPreview`
* `BookRequestRow`

These types represent shared catalog book rows, imported ISBN preview shape, and pending book request rows. They are tightly connected to current Supabase/API response shapes.

### Constants

Keep constants in `page.tsx` for the first visual pass.

Current constants/options:

* `BOOK_TYPE_OPTIONS`

Embedded copy/constants:

* header/back-link copy
* global book add/edit copy
* pending book request explanatory copy
* manual entry instructions
* ISBN lookup/create button labels
* ISBN preview labels
* missing field labels
* validation/error/success messages
* book request rejection confirm copy

### Helper Functions

Keep helpers in `page.tsx` for the first visual pass.

Current helpers:

* `cleanText`
* `metadataSourceLabel`
* `bookTypeLabel`
* `linksToText`
* `parseLinks`
* `displayLinkLabel`
* `displayLinkUrl`
* `requestTitleNeedsManualResearch`
* `rejectBookRequestWithSession`

Page-local visual/helper components:

* `Detail`
* `PersonRow`

`Detail` and `PersonRow` are passed into `BookInfoTab`. Moving them may require changing the `BookInfoTab` contract, so leave them page-local for now.

### State

Access/loading state:

* `loading`
* `canAccess`
* `message`
* `saving`

Route/mode state:

* `bookId` search param
* `requestId` search param
* `isEditMode`
* `currentBookId`
* `currentBook`
* `editingPanel`

Book request state:

* `bookRequest`

ISBN lookup/import state:

* `isbnLookupLoading`
* `isbnLookupError`
* `isbnLookupPreview`

Manual/global book form state:

* `title`
* `isbn`
* `isbn13`
* `coverUrl`
* `bookType`
* `author`
* `authorReading`
* `authorEnglishName`
* `authorImageUrl`
* `translator`
* `translatorReading`
* `translatorEnglishName`
* `translatorImageUrl`
* `illustrator`
* `illustratorReading`
* `illustratorEnglishName`
* `illustratorImageUrl`
* `publisher`
* `publisherReading`
* `publisherEnglishName`
* `publisherImageUrl`
* `publishedDate`
* `pageCount`
* `seriesNumber`
* `linksText`

Shared-person record state passed through `BookInfoTab`:

* `selectedAuthorId`
* `selectedTranslatorId`
* `selectedIllustratorId`
* `selectedPublisherId`
* `requireSharedAuthorRecord`
* `requireSharedTranslatorRecord`
* `requireSharedIllustratorRecord`
* `requireSharedPublisherRecord`

There is no selected student/learner state, no teacher-prep state, and no navigation/redirect state beyond `router.replace(...)` calls.

### Data Loading / Supabase Behavior

Keep all loading logic in `page.tsx`.

Current data loading:

* `supabase.auth.getUser()` checks the signed-in user.
* Signed-out users are redirected to `/login`.
* The current user's profile is loaded from `profiles` with `role` and `is_super_teacher`.
* Teacher access is determined from `role === "teacher"`, `role === "super_teacher"`, or `is_super_teacher`.
* Existing global book rows are loaded from `books` by `bookId`.
* Pending book request rows are loaded from `book_requests` by `requestId`.
* ISBN metadata is loaded from `/api/books/lookup-isbn`.
* Existing global book duplicate checks query `books` by `isbn13`.

The page does not load:

* linked students
* `teacher_students`
* `user_books`
* teacher-prep rows
* trial-prep rows
* student library data

### Save / Create / Update Behavior

Keep all mutation handlers in `page.tsx`.

Current mutation behavior:

* `createOrLoadByIsbn()`
  * requires title
  * accepts optional ISBN for book requests/manual entry
  * validates ISBN length when present
  * checks for existing `books` row by `isbn13`
  * loads existing book when found
  * inserts a minimal `books` row when missing
  * marks a loaded `bookRequest` as `reviewed` after manual global book creation
  * replaces route with `?bookId=...`

* `rejectBookRequest()`
  * confirms with `window.confirm`
  * calls `rejectBookRequestWithSession(bookRequest.id)`
  * redirects to `/teacher/books`

* `createOrLoadFromIsbnPreview()`
  * requires an ISBN lookup preview
  * validates preview ISBN-13
  * loads existing global book when preview says one exists
  * checks again for existing `books` row by `isbn13`
  * inserts a new `books` row from ISBN metadata when no duplicate exists
  * loads the created book
  * replaces route with `?bookId=...`

* `saveBookInfo()`
  * requires an existing `currentBookId`
  * requires title
  * validates ISBN-13
  * normalizes page count, series number, and related links
  * updates the current `books` row
  * reloads the current book
  * closes the active `BookInfoTab` editing panel

* `cancelBookInfoEdits()`
  * closes editing
  * reloads the current book when one exists

There are no `user_books` inserts/updates here, and no teacher-prep/trial-prep writes.

### Derived Values

Keep derived values in `page.tsx`.

Current derived values:

* `isEditMode`
* `missingFields`
  * missing ISBN-13
  * missing cover
  * missing book type
  * missing author
  * missing publisher
  * missing published date
  * missing page count
* `showFindOrCreatePanel`
* request title manual-research state through `requestTitleNeedsManualResearch(bookRequest)`
* `metadataSourceLabel(...)` display
* `bookTypeLabel(...)` passed into `BookInfoTab`
* related-link display/parse helpers
* save/create button labels from `saving`, `bookRequest`, and ISBN preview state

There is no selected student display label, duplicate-in-student-library state, or add-to-library disabled state because this page does not add books to user libraries.

### Render Sections

Current render sections:

* loading state
* no-access state
* page shell
* back link to `/teacher/books`
* page header and description
* pending book request information panel
* reject request action
* find/create/manual entry panel
  * manual entry help copy for book requests
  * title field
  * ISBN-13 field
  * ISBN lookup button
  * create/load button
  * clear button
  * ISBN lookup error banner
  * ISBN lookup preview card
  * existing-book warning
  * create/load from metadata action
* shared book info section
  * missing-fields badge
  * `BookInfoTab` editing surface
* bottom message banner
* local `Detail` component
* local `PersonRow` component

## Recommended First-Pass Visual Extractions

Only extract presentational UI. Keep all data loading, save/create/update behavior, API calls, route replacement, helper functions, and page-local types in `page.tsx`.

### 1. `TeacherBookAddLoadingState`

What JSX it owns:

* loading `<main>` shell
* `Loading...` copy

What stays in `page.tsx`:

* `loading` state
* auth/profile loading

Expected props:

* none, or `message?: string`

Risk level:

* Low

Suggested extraction order:

* 1

### 2. `TeacherBookAddAccessState`

What JSX it owns:

* no-access `<main>` shell
* message copy

What stays in `page.tsx`:

* `canAccess`
* teacher/super-teacher role checks
* signed-out redirect

Expected props:

* `message: string`

Risk level:

* Low

Suggested extraction order:

* 2

### 3. `TeacherBookAddHeader`

What JSX it owns:

* back link to `/teacher/books`
* page title
* description copy

What stays in `page.tsx`:

* `isEditMode`
* `currentBookId`
* route choice if the Teacher Hub model changes

Expected props:

* `isEditing: boolean`
* `backHref?: string`

Risk level:

* Low

Suggested extraction order:

* 3

### 4. `TeacherBookAddMessageBanner`

What JSX it owns:

* bottom message banner
* optionally ISBN lookup error banner if kept separate with a tone prop

What stays in `page.tsx`:

* `message`
* `isbnLookupError`
* all code that sets messages

Expected props:

* `message: string`
* `tone?: "neutral" | "error"`

Risk level:

* Low

Suggested extraction order:

* 4

### 5. `TeacherBookRequestPanel`

What JSX it owns:

* pending book request panel
* request metadata definition list
* reject button and helper copy

What stays in `page.tsx`:

* `bookRequest`
* `rejectBookRequest`
* `saving`
* request load/update/reject behavior

Expected props:

* `request: BookRequestRow`
* `saving: boolean`
* `onReject: () => void`

Risk level:

* Low-medium. It is presentational, but it includes a mutation button.

Suggested extraction order:

* 5

### 6. `TeacherBookFindOrCreatePanel`

What JSX it owns:

* full find/create/manual entry panel
* title and ISBN fields
* lookup/create/clear buttons
* manual-entry instruction copy
* ISBN lookup error
* ISBN lookup preview card wrapper

What stays in `page.tsx`:

* all field state
* all setters
* `lookupIsbnPreview`
* `createOrLoadByIsbn`
* `clearForm`
* `createOrLoadFromIsbnPreview`
* request title manual-research helper
* ISBN lookup preview behavior

Expected props:

* many controlled field values and handlers

Risk level:

* Medium-high. This panel is behavior-heavy and would create a large prop basket if extracted too early.

Suggested extraction order:

* Defer during the smallest first pass.

### 7. `TeacherBookIsbnPreviewCard`

What JSX it owns:

* ISBN lookup preview card
* cover/placeholder
* metadata fields
* existing-book warning
* metadata-source display
* create/load action

What stays in `page.tsx`:

* `isbnLookupPreview`
* metadata source helper
* create/load handler
* duplicate-check behavior

Expected props:

* `preview: IsbnLookupPreview`
* `saving: boolean`
* `metadataSourceLabel: (value: IsbnLookupPreview["metadata_source"]) => string`
* `onCreateOrLoad: () => void`

Risk level:

* Low-medium. Useful extraction if doing more than tiny states/header.

Suggested extraction order:

* 6, before extracting the whole find/create panel.

### 8. `TeacherBookInfoSectionHeader`

What JSX it owns:

* shared book info section heading/copy
* missing-fields badge or core-complete badge

What stays in `page.tsx`:

* `missingFields`
* decision to render `BookInfoTab`
* all `BookInfoTab` props

Expected props:

* `missingFields: string[]`

Risk level:

* Low

Suggested extraction order:

* 7

### 9. `TeacherBookAddHelpCard`

What JSX it owns:

* manual entry instruction card inside the find/create panel

What stays in `page.tsx`:

* `bookRequest` condition

Expected props:

* none, or `children`

Risk level:

* Low

Suggested extraction order:

* 8 if the instruction copy feels noisy.

### 10. `TeacherBookInfoTabWrapper`

What JSX it owns:

* `BookInfoTab` prop wiring

What stays in `page.tsx`:

* all book info state and setters
* `saveBookInfo`
* `cancelBookInfoEdits`
* editing panel state

Expected props:

* very large prop set

Risk level:

* High. This would hide a huge amount of behavior-sensitive controlled state behind a large prop basket.

Suggested extraction order:

* Defer. Do not extract this during the first pass.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* The old tracker row is stale. The page was previously tracked as 933 lines, then 1288 -> 1171, but the current observed count is 1198 lines.
* This page is named under `/teacher/books/add`, but it is really a global shared catalog add/edit page, not a teacher-library or student-library add page.
* There is no linked-student selection even though teacher add-book workflows may eventually need student/library assignment.
* There is no `user_books` insert here, which matches the current copy but may surprise someone expecting "add book" to mean "add to a library."
* `BOOK_TYPE_OPTIONS` may not include newer short story / anthology / compilation-specific types if those become part of teacher prep.
* `createOrLoadByIsbn` permits manual global book creation with no ISBN for book requests. This is intentional for failed lookup/manual research, but it is a powerful shared-catalog path.
* New global books created manually appear to insert only title, author, and ISBN-13 before details are filled later.
* New global books created from ISBN metadata do not appear to set an explicit review-needed flag in this client code, even though the preview includes `needs_review`.
* `saveBookInfo` requires a valid ISBN-13 even after manual book-request creation allows ISBN to be omitted. This may make no-ISBN manual entries difficult to finish.
* `BookInfoTab` is imported from the Book Hub component folder and receives a very large prop set. This is practical reuse, but it tightly couples this page to Book Hub editing conventions.
* `canCreateSharedRecords={false}` is passed to `BookInfoTab`, while several selected/require shared person record states are still passed. This may be necessary for the component contract, but some of that state may be inert here.
* Older audit notes said English-name fields were edited but not saved. The current page now includes English-name fields in the shared book row shape and save payload, so that note appears resolved. Keep watching publisher/person upsert behavior separately because it touches shared catalog records.
* The back link copy says `Books Needing My Attention`; under the newer Teacher Hub structure this may belong under Needs Attention or General Upkeep depending on the final taxonomy.
* The page does not mention Global Book Entry in the route/copy, although that may be the clearer conceptual home.

## Recommended First Pass

Start with tiny, safe presentational components:

1. `TeacherBookAddLoadingState`
2. `TeacherBookAddAccessState`
3. `TeacherBookAddHeader`
4. `TeacherBookAddMessageBanner`
5. `TeacherBookInfoSectionHeader`

Then consider:

6. `TeacherBookRequestPanel`
7. `TeacherBookIsbnPreviewCard`

Pause before extracting the full find/create panel or the `BookInfoTab` wrapper. Those areas have too many controlled fields, mutation handlers, route transitions, and shared-catalog behavior to be a safe first visual pass.

## Architecture Deferred

* Teacher access helper: defer until all teacher routes share one access model.
* Linked-student helper: defer because this file currently does not load linked students, and adding that concept should be product-driven.
* Book lookup/import service: defer because ISBN lookup, duplicate handling, metadata source, and review-needed behavior are still evolving.
* Book request service: defer because request review/reject/resolve behavior is connected to Teacher Hub alert behavior.
* Shared book DAO: defer because global `books` insert/update needs careful review and RLS/API boundaries.
* User book creation service: defer because this page intentionally does not create `user_books` rows right now.
* Teacher-prep/trial-prep cleanup: defer because this page is not currently a prep assignment page.
* Add-book form validation helper: defer until no-ISBN manual request behavior and ISBN-first behavior are clarified.
* Duplicate/already-in-library helper: defer because this page only checks duplicate global `books`, not teacher/student library duplicates.
* Shared `BookInfoTab` contract cleanup: defer because it is large and used by Book Hub as well.

## Browser Smoke Test Suggestions

Manual checklist for later implementation work:

* Teacher can open `/teacher/books/add`.
* Super-teacher can open `/teacher/books/add`.
* Regular student/member is blocked by teacher route protection or local access state.
* Signed-out user redirects to `/login`.
* Loading an existing global book with `?bookId=...` works.
* Loading a pending book request with `?requestId=...` works.
* Request title/author/ISBN prefill correctly.
* Reject request works and removes the request from the pending queue.
* ISBN lookup works for a valid ISBN-13.
* ISBN lookup error displays for invalid ISBN.
* Existing ISBN loads the existing global book instead of creating a duplicate.
* Creating a global book from ISBN metadata works.
* Manual book creation from a request works.
* Manual book creation without a request behaves as intended.
* Existing/manual created book routes replace to `?bookId=...`.
* Shared Book Info section loads after create/load.
* Missing-fields badge updates after saving details.
* Book info details save correctly.
* People fields save correctly if intended.
* Related links parse/display/save correctly.
* Canceling book info edits reloads the current book.
* Imported/new shared books are marked for review if intended by current product rules.
* No student `user_books` rows are created by this page.
* Private student data is not exposed.
* Mobile-ish visual check for request panel, find/create panel, ISBN preview, and BookInfoTab.

## Final Recommendation

This page is ready for a small first-pass visual extraction, but only for tiny states/header/message/header-card pieces.

Start with loading/access/header/message and the shared book info section header. Then optionally extract the request panel and ISBN preview card. Do not extract the full find/create panel or `BookInfoTab` wrapper until the global-book/manual-request/ISBN-first behavior is clarified.

No teacher/student behavior cleanup is required before tiny visual extraction, because this page currently does not handle linked students or `user_books`. The bigger cleanup should be product/architecture clarification: whether this route remains the global catalog entry tool, whether manual no-ISBN shared book creation stays here, and how imported/requested books should be marked for review.

## Current Refactor Audit, 2026-06-15

Current observed line count:

* `app/(protected)/teacher/books/add/page.tsx`: 1198 lines

This differs from the latest tracker row supplied by the user, which listed 1171 lines.

Extracted visual components:

* `TeacherBookAddLoadingState`
* `TeacherBookAddAccessState`
* `TeacherBookAddHeader`
* `TeacherBookAddMessageBanner`
* `TeacherBookInfoSectionHeader`
* `TeacherBookRequestPanel`
* `TeacherBookIsbnPreviewCard`
* `TeacherBookAddHelpCard`
* `TeacherBookFindCreateActions`
* `TeacherBookFindCreateFields`
* `TeacherBookFindCreatePanel`
* `TeacherBookInfoSection`
* `TeacherBookAddPageShell`

Suggested components intentionally left in the page:

* `TeacherBookInfoTabWrapper` remains deferred. The page still wires `BookInfoTab` directly because the prop set carries shared-catalog edit state, person/publisher state, save/cancel handlers, and editing-panel behavior.
* `Detail` and `PersonRow` remain page-local helper components for the shared `BookInfoTab` contract.

Risk-boundary check:

The page still owns teacher/super-teacher access checks, signed-out redirects, Supabase `books` load/create/update behavior, pending `book_requests` loading/review/reject behavior, ISBN lookup through `/api/books/lookup-isbn`, duplicate global-book checks, publisher/person field state, missing-field calculation, route replacement, and `BookInfoTab` save/cancel wiring. No extraction appears to have moved shared-catalog mutation behavior, teacher access behavior, or request resolution behavior into a visual component.

Current status:

Visual pass checkpoint. Good stopping point for now. Architecture deferred.

Updated tracker row:

```md
- [x] | Visual pass checkpoint / good stopping point / architecture deferred | `app/(protected)/teacher/books/add/page.tsx` | 1288 | 1198 | -90 |
```
