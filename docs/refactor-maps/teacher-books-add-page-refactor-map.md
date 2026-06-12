# Teacher Books Add Page Refactor Map

No-code refactor map for:

`app/(protected)/teacher/books/add/page.tsx`

Current observed size: about 1288 lines.

This is a planning document only. Do not refactor the page from this map without a separate implementation pass.

## 1. Page Purpose

This page is a teacher/super-teacher-facing global catalog book add/edit page.

From the teacher point of view, it lets an authorized teacher create, load, review, or update a shared/global Mekuru book record. It can support pending book requests, ISBN lookup/import, duplicate global-book prevention, and shared book metadata cleanup. It does not add a book to a student library.

## 2. Current Responsibilities

Current responsibilities include:

* checking whether the signed-in user has teacher or super-teacher access
* redirecting signed-out users to `/login`
* loading an existing shared/global `books` row by `bookId`
* loading a pending `book_requests` row by `requestId`
* pre-filling manual entry fields from a pending book request
* rejecting a pending book request through `/api/book-requests/reject`
* looking up ISBN metadata through `/api/books/lookup-isbn`
* previewing ISBN metadata before anything is saved
* detecting and loading an existing global book for a duplicate ISBN-13
* creating a new shared/global `books` row manually
* creating a new shared/global `books` row from ISBN metadata
* marking a pending request as `reviewed` after manual global book creation
* replacing the route with `?bookId=...` after create/load
* calculating missing core shared-book fields
* wiring the shared `BookInfoTab` editing surface
* saving shared book details back to `books`
* parsing and displaying related links
* handling loading, access, success, error, and ISBN lookup states

The page does not currently:

* choose a learner/student
* create a `user_books` row
* add a book to a teacher library
* add a book to a selected student's library
* create teacher-prep or trial-prep rows
* assign a book to a student

## 3. Risk Boundaries

Do not touch these during a first safe thinning pass:

* teacher-only and super-teacher access checks
* signed-out redirect behavior
* Supabase Auth and `profiles` queries
* global/shared `books` load, insert, and update queries
* book lookup and book creation behavior
* duplicate prevention by `isbn13`
* ISBN lookup/import behavior through `/api/books/lookup-isbn`
* pending `book_requests` load behavior
* pending request `reviewed` update behavior
* pending request rejection through `/api/book-requests/reject`
* review/needs-review assumptions around imported or manually created books
* route replacement after create/load
* validation for title, ISBN-13, page count, series number, and related links
* `createOrLoadByIsbn`
* `createOrLoadFromIsbnPreview`
* `rejectBookRequest`
* `saveBookInfo`
* `cancelBookInfoEdits`
* shared `BookInfoTab` prop wiring
* page-local response/data types
* global book data ownership assumptions
* anything that would create, update, or imply private user library behavior

These areas should stay in `page.tsx` during the first pass unless there is an obviously safe display-only extraction around them.

## 4. Suggested Extraction Candidates

### Low-Risk Visual Components

Good first-pass candidates:

* `TeacherBookAddLoadingState`
  * loading `<main>` shell and `Loading...` copy
* `TeacherBookAddAccessState`
  * no-access `<main>` shell and access message
* `TeacherBookAddHeader`
  * back link to `/teacher/books`, page title, and intro copy
* `TeacherBookAddMessageBanner`
  * neutral bottom message banner
  * optionally a separate error-style banner component for ISBN lookup errors
* `TeacherBookAddManualEntryHelpCard`
  * manual-entry instruction card shown for book requests
* `TeacherBookInfoSectionHeader`
  * `Shared Book Info` heading, helper copy, missing-fields badge, and core-info-complete badge
* small presentational definition-list rows inside the pending request panel or ISBN preview card

These should receive props and render JSX only. They should not load data, save data, normalize data, or decide route behavior.

### Medium-Risk Helper/Component Candidates

Useful, but not ideal as the very first move:

* `TeacherBookRequestPanel`
  * renders pending request details and reject button
  * medium risk because it includes a mutation trigger, even if the handler stays in the page
* `TeacherBookFindOrCreateFields`
  * renders title and ISBN-13 inputs
  * medium risk because it is controlled form UI tied to creation behavior
* `TeacherBookFindOrCreateActions`
  * renders lookup/create/clear buttons
  * medium risk because button enabled states and labels reflect save/lookup behavior
* `TeacherBookIsbnPreviewCard`
  * renders preview cover, metadata, existing-book warning, and create/load action
  * keep duplicate detection, creation, and metadata-source logic in the page
* small display helpers for metadata source labels, book type labels, and related-link display
  * only move later, after display output is covered by manual checks

### High-Risk / Leave For Later

Leave these in `page.tsx` for now:

* all Supabase queries and mutations
* all access checks
* all API calls
* book request rejection logic
* request review/resolve logic
* global book create/load behavior
* duplicate prevention
* ISBN lookup/import behavior
* save/submit handlers
* route replacement/navigation side effects
* form validation
* missing core-field calculation if it affects save flow
* `BookInfoTab` wrapper or prop-basket extraction
* `Detail` and `PersonRow` if moving them changes the `BookInfoTab` contract
* shared helpers, services, DAOs, hooks, or route-level controllers

## 5. Recommended Refactor Order

Safe first pass:

1. Extract `TeacherBookAddLoadingState`.
2. Extract `TeacherBookAddAccessState`.
3. Extract `TeacherBookAddHeader`.
4. Extract `TeacherBookAddMessageBanner`.
5. Extract `TeacherBookInfoSectionHeader`.

Safe stopping point:

Stop after those visual shell/header/message extractions. At that point the page should compile and behave exactly the same, and all data fetching, mutations, route changes, and save handlers should still live in `page.tsx`.

Optional second visual pass:

6. Extract the manual-entry help card.
7. Extract display-only sub-pieces of the pending request panel.
8. Extract `TeacherBookIsbnPreviewCard` only if all create/load handlers and duplicate behavior remain page-owned.

Pause before:

* extracting the full find/create panel
* extracting the full pending request panel with behavior hidden inside
* extracting the `BookInfoTab` wrapper
* moving helpers or query code

## 6. Proposed File Structure

Suggested future component folder:

```txt
app/(protected)/teacher/books/add/components/
  TeacherBookAddLoadingState.tsx
  TeacherBookAddAccessState.tsx
  TeacherBookAddHeader.tsx
  TeacherBookAddMessageBanner.tsx
  TeacherBookInfoSectionHeader.tsx
  TeacherBookAddManualEntryHelpCard.tsx
  TeacherBookRequestPanel.tsx
  TeacherBookIsbnPreviewCard.tsx
```

Do not create these files during this planning task. A future implementation pass should add only the smallest useful subset.

## 7. Notes For Future Codex/Refactor Pass

First pass should be visual thinning only.

Keep all data fetching and mutation logic in the page. Keep teacher access checks in the page. Keep submit, save, create, reject, and route replacement handlers in the page. Do not change Supabase queries, API calls, duplicate-prevention behavior, book request behavior, global book creation behavior, or shared `BookInfoTab` behavior.

Do not "clean up" behavior while extracting components. If a component receives an awkward prop set, prefer stopping early over hiding behavior-sensitive state behind a large abstraction.

After each extraction, the page should compile and behave exactly the same. Manual smoke checks should include signed-out access, non-teacher access, teacher/super-teacher access, loading by `bookId`, loading by `requestId`, ISBN lookup, existing ISBN load, manual book creation, ISBN metadata creation, request rejection, Book Info save/cancel, missing-fields badge, and confirmation that no `user_books` rows are created by this page.
