# Add Book by ISBN Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/books/add/page.tsx`

Current size: about 703 lines.

## Current Page Purpose

This page lets a signed-in user look up a Japanese book by ISBN-13 and add it to a library destination.

It supports:
* ISBN lookup through `/api/books/lookup-isbn`
* adding the book to the current user's library
* teacher add-to-linked-student behavior
* super-teacher add-to-any-user behavior
* super-teacher global-catalog-only review behavior
* request-for-review behavior when lookup fails or returns insufficient metadata

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks
* full-access or role checks
* Supabase queries
* ISBN lookup logic
* add-by-ISBN API calls
* request/book-review-needed logic
* save/add-to-library behavior
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `LookupBook`: normalized-but-flexible lookup result shape. It supports both camelCase and snake_case fields while the lookup feature is still settling.
* `DestinationUser`: profile row shape used for linked-student and any-user destination pickers.

### 2. Constants

There are no explicit file-level constants.

Implicit constants/copy currently embedded in JSX and handlers:
* page title and guidance copy
* Japanese-books-only notice
* lookup failure / request-review messages
* destination mode labels
* add button labels
* new-to-Mekuru warning copy

Do not extract these during the first visual pass.

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

File-level helpers:
* `getDisplayAuthor`
* `getCoverUrl`
* `getPublishedDate`
* `getPageCount`

These helpers normalize lookup result field naming and should stay near the page logic until the lookup shape is more stable.

### 4. State

Input and lookup result:
* `isbn`
* `book`

Current user / role:
* `currentUserId`
* `currentUsername`
* `isTeacher`
* `isSuperTeacher`

Destination controls:
* `destinationMode`
* `destinationUserId`
* `studentOptions`
* `userOptions`

Loading / messages:
* `lookupLoading`
* `addLoading`
* `requestLoading`
* `error`
* `canRequestBook`
* `libraryNotice`

### 5. Data Loading

Keep all data loading in `page.tsx`.

Initial load:
* `supabase.auth.getUser()` to find the current user
* `profiles` lookup for username, role, and `is_super_teacher`
* linked `teacher_students` rows for teacher destination options
* linked student `profiles` rows
* all `profiles` rows for super-teacher any-user destination options

Notes:
* The page does not currently redirect if no user is found; it simply stops loading destinations.
* Destination loading is role-dependent and intentionally page-local for now.

### 6. Access / Full-Access Checks

Access behavior is role-based, not feature-gated.

Current behavior:
* any signed-in user can use the basic ISBN lookup/add-to-own-library flow
* teachers can add to linked students
* super teachers can add to any user or global catalog only
* the page derives teacher access from `profiles.role` and `profiles.is_super_teacher`

No app/full-access feature gate is present in this file.

Do not add or move access logic during the visual extraction pass.

### 7. ISBN Lookup Behavior

Keep in `page.tsx`.

Handler:
* `handleLookup`

Flow:
* clear existing error, book result, request state, and library notice
* call `/api/books/lookup-isbn?isbn=...`
* parse response text manually before JSON handling
* show a route/JSON diagnostic if the route does not return JSON
* if lookup fails, set `canRequestBook` and show request-review messaging
* if lookup returns no usable book/title, set `canRequestBook`
* if lookup succeeds, store `book`

### 8. Add-To-Library Behavior

Keep in `page.tsx`.

Handler:
* `handleAddToLibrary`

Flow:
* require a looked-up book with `isbn13`
* derive `selectedTargetUserId` from destination mode
* require destination user for non-global modes
* ask for confirmation if the book is new to Mekuru
* get Supabase session token
* call `/api/books/add-by-isbn`
* send:
  * `isbn13`
  * `mode: "global_only"` or `"add_to_library"`
  * optional `targetUserId`
* for global mode, route to `/teacher/books/add?bookId=...`
* for existing library copies, show `libraryNotice`
* for self-add success, route to the user's library page
* for teacher/super-teacher add-to-other-user success, show `libraryNotice`

### 9. Book Request / Review-Needed Behavior

Keep in `page.tsx`.

Handler:
* `handleRequestBook`

Flow:
* normalize ISBN by removing spaces and hyphens
* require signed-in user
* check for an existing pending request by same user and ISBN
* insert a `book_requests` row with:
  * `user_id`
  * title formatted as `ISBN ${cleanIsbn}`
  * `isbn13`
  * `status: "pending"`
* show a success message in `error`
* hide the request button after sending

Related derived value:
* `isNewToMekuru` controls the add confirmation and review-needed copy after successful lookup.

### 10. Event Handlers

Keep handlers in `page.tsx`.

Main handlers:
* `handleLookup`
* `handleAddToLibrary`
* `handleRequestBook`

Inline UI handlers:
* ISBN input `onChange`
* destination radio `onChange`
* student select `onChange`
* any-user select `onChange`
* library notice open-book button
* cancel button to `/dashboard`

### 11. Derived Values

Keep derived values in `page.tsx` for the first pass.

* `coverUrl`
* `displayAuthor`
* `publishedDate`
* `pageCount`
* `selectedDestinationLabel`
* `isNewToMekuru`

### 12. Render Sections

Current render order:
* page shell
* ISBN lookup card
* title and instructions
* Japanese-books-only notice
* ISBN input and lookup button
* error/request-review message
* library notice success panel
* book preview card, conditional on lookup result
* cover/no-cover preview
* title/subtitle/author metadata
* publisher/date/page-count/ISBN metadata grid
* new-to-Mekuru warning, conditional
* destination picker
* linked student select, conditional
* any user select, conditional
* add/open global review button
* cancel button

## Recommended First-Pass Visual Extractions

Only extract presentational JSX. Keep all access, data loading, API calls, request behavior, helpers, and handlers in `page.tsx`.

### 1. `AddBookLookupCard`

What JSX it owns:
* outer lookup card
* eyebrow/title/description
* Japanese-books-only notice
* ISBN input and lookup button layout
* slots/children for error and library notice panels

What stays in `page.tsx`:
* `isbn` state
* `setIsbn`
* `handleLookup`
* `lookupLoading`
* request state and notice state

Expected props:
* `isbn: string`
* `lookupLoading: boolean`
* `onIsbnChange: (value: string) => void`
* `onLookup: () => void`
* `children?: React.ReactNode`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `AddBookMessagePanel`

What JSX it owns:
* red lookup/error panel
* request-for-review button

What stays in `page.tsx`:
* `error`
* `canRequestBook`
* `requestLoading`
* `handleRequestBook`

Expected props:
* `message: string`
* `canRequestBook: boolean`
* `requestLoading: boolean`
* `onRequestBook: () => void`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 2

### 3. `AddBookLibraryNotice`

What JSX it owns:
* green library notice panel
* open-book button

What stays in `page.tsx`:
* `libraryNotice` state
* navigation handler

Expected props:
* `message: string`
* `detail?: string`
* `userBookId?: string`
* `onOpenBook?: () => void`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 3

### 4. `LookupBookPreviewCard`

What JSX it owns:
* preview section shell
* cover/no-cover block
* preview eyebrow
* title/subtitle
* author display
* metadata grid
* new-to-Mekuru warning
* child slot for destination controls/actions

What stays in `page.tsx`:
* `book`
* normalized display values
* `isNewToMekuru`
* destination logic
* add/cancel handlers

Expected props:
* `title: string`
* `subtitle?: string | null`
* `coverUrl?: string | null`
* `displayAuthor: string`
* `publisher?: string | null`
* `publishedDate?: string | null`
* `pageCount?: number | null`
* `isbn13: string`
* `isNewToMekuru: boolean`
* `children?: React.ReactNode`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 4

### 5. `AddBookDestinationPanel`

What JSX it owns:
* destination box
* radio controls for My library / Linked student / Any user / Global catalog only
* linked student select
* any-user select

What stays in `page.tsx`:
* destination state
* role booleans
* student/user option data
* all `onChange` handlers

Expected props:
* `destinationMode: "me" | "student" | "user" | "global"`
* `destinationUserId: string`
* `isTeacher: boolean`
* `isSuperTeacher: boolean`
* `studentOptions: DestinationUser[]`
* `userOptions: DestinationUser[]`
* `onDestinationModeChange: (mode: "me" | "student" | "user" | "global") => void`
* `onDestinationUserChange: (userId: string) => void`

Category:
* presentational UI

Risk level:
* Low-Medium

Suggested order:
* 5

Why slightly higher than the others:
* It has several role-dependent branches and repeated clearing of `libraryNotice`.
* Keep all state mutations in `page.tsx` through callbacks.

### 6. `AddBookActionRow`

What JSX it owns:
* add/open global review button
* cancel button

What stays in `page.tsx`:
* `handleAddToLibrary`
* cancel navigation
* `selectedDestinationLabel`
* `destinationMode`
* `addLoading`

Expected props:
* `addLoading: boolean`
* `destinationMode: "me" | "student" | "user" | "global"`
* `selectedDestinationLabel: string`
* `onAdd: () => void`
* `onCancel: () => void`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 6

## Suggested Component Location

Keep components local for the first pass:

`app/(protected)/books/add/components/`

Suggested files:
* `AddBookLookupCard.tsx`
* `AddBookMessagePanel.tsx`
* `AddBookLibraryNotice.tsx`
* `LookupBookPreviewCard.tsx`
* `AddBookDestinationPanel.tsx`
* `AddBookActionRow.tsx`

Do not promote shared components yet.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `LookupBook` supports both camelCase and snake_case response fields. This duplication is intentional while the lookup response shape is settling, but it is worth revisiting once the API contract is stable.
* `libraryNotice.bookId` exists in state shape but does not appear to be used in render. It may be leftover or planned for global-catalog notices.
* `currentUserId` starts as an empty string. If destination mode is `me` before auth loads, add-to-library will fail with "Choose who should receive this book." This is probably acceptable but could feel odd if clicked early.
* `handleLookup` does not normalize ISBN before calling the lookup route; request behavior does normalize by removing spaces/hyphens. The lookup API may already normalize, but this is worth confirming later.
* `error` is used for both errors and successful request-sent messaging. This works visually but semantically mixes success and error state.
* `isNewToMekuru` checks both `source` and `metadata_source` fields. This matches the flexible lookup shape, but should simplify after response shape stabilization.
* Teacher destination defaults use the first option when switching modes. If there are no linked students/users, `destinationUserId` becomes empty and the add handler blocks safely.

## Recommended First Pass

1. Extract `AddBookLookupCard`.
2. Extract `AddBookMessagePanel`.
3. Extract `AddBookLibraryNotice`.
4. Extract `LookupBookPreviewCard`.
5. Extract `AddBookActionRow`.
6. Extract `AddBookDestinationPanel` last.

Stop there for the first pass.

Leave access, Supabase queries, ISBN lookup, add-by-ISBN calls, request behavior, helpers, and derived values in `page.tsx`.
