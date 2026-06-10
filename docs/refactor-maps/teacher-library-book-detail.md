# Teacher Library Book Detail Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/teacher/library/[teacherBookId]/page.tsx`

Current tracker row:

`- [ ] Not started | app/(protected)/teacher/library/[teacherBookId]/page.tsx | 904 | 904 | 0 |`

Current observed size: about 1320 lines.

## Current Page Purpose

This page is a teacher-owned book prep workspace for one teaching book.

Current responsibilities include:

* loading one `teacher_books` record by `teacherBookId`
* showing shared/global book metadata joined through `books`
* showing the current teaching book cover, title, and author
* linking back to `/teacher/library`
* linking to `/teacher/library/[teacherBookId]/follow`
* entering teacher prep items in a bulk/paste flow
* using Jisho lookup as optional support for word/phrase drafts
* editing draft readings, definitions, teacher notes, explanations, and translations before saving
* adding page, chapter number, and chapter/story name metadata to drafts
* applying bulk page/chapter fields to blank rows or all rows
* saving drafts into `teacher_book_items`
* showing saved teacher prep items in a searchable/filterable table
* filtering saved prep items by page
* expanding saved rows to show teacher note, explanation, and translation
* editing saved teacher prep items
* deleting saved teacher prep items
* using `Story Name` instead of `Chapter Name` when the joined book type is `short_story`

The file header explicitly notes the final save writes only to `teacher_book_items`; it does not create `user_books`, `user_book_words`, sessions, stats, or study progress.

There is no student assignment panel in this file. There is no direct learner vocabulary save flow in this file.

## Important Data Boundaries

This page has a clear teacher-prep boundary:

* The signed-in teacher/super-teacher is checked through Supabase Auth and `profiles`.
* `teacher_books` is the teacher-owned teaching book record.
* Joined `books` data is shared/global catalog metadata used for display context.
* `teacher_book_items` are teacher prep/support items tied to the teaching book.
* Jisho lookup is used only to help prefill draft reading/meaning choices.
* `vocabulary_cache_id` exists on prep item drafts/items, but this page does not appear to create or update `vocabulary_cache`.
* No linked students are loaded.
* No student-owned `user_books` rows are loaded.
* No private learner `user_book_words` rows are created.
* No learner sessions, stats, or study progress are written.
* Future student-facing support is hinted through Follow-Along and prep item data, but this page itself remains teacher prep space.

Important current design direction:

Teacher Library / Teaching Books is teacher-owned prep space. It is different from adding words directly into a student's private book vocabulary. Do not blur those flows during visual cleanup.

## Current Risks / Do Not Touch Yet

Do not move or change these during a first visual pass:

* teacher route protection
* local teacher/super-teacher role checks
* teacher-owned book loading
* teacher book access assumptions
* Supabase queries
* `teacher_books` loading
* `teacher_book_items` loading
* Jisho lookup behavior for draft support
* draft creation and meaning choice behavior
* prep item insert behavior
* prep item update behavior
* prep item delete behavior
* page/chapter/story name behavior
* short-story `Story Name` label behavior
* saved item search/filter behavior
* expand/collapse details behavior
* edit panel scroll behavior
* form validation and message behavior
* helper functions
* page-local types
* services, DAOs, controllers, hooks, or shared teacher prep helpers

There are no linked-student checks, student assignments, or student-private data queries in this file to move.

## Current Structure Map

### Types / Interfaces

Keep all page-local types in `page.tsx` for the first visual pass.

Current types:

* `ItemType`
* `PrepStep`
* `BookMeta`
* `TeacherBookRow`
* `TeacherBookItem`
* `PrepItemDraft`
* `SavedItemEditDraft`

These types encode the current teacher-prep workflow, saved item schema, and draft/edit form state. They should remain close to the behavior until the teacher prep model is stable.

### Constants

Keep constants in `page.tsx` for the first visual pass.

Current constants/options:

* `itemTypes: ItemType[] = ["word", "phrase", "grammar", "sentence", "note"]`

Embedded labels/copy:

* `Prep Add`
* `Teacher Library`
* `Follow-Along`
* step labels for paste/definitions/details/done
* default item type label
* draft field labels
* `Teacher note`
* `Explanation`
* `Translation`
* page/chapter field labels
* `Story Name` vs `Chapter Name`
* saved prep item table headers
* edit/delete/details button labels
* success/error messages

There are no separate status options beyond the `PrepStep` flow. There are no assignment status/filter options.

### Helper Functions

Keep helpers in `page.tsx` for the first visual pass.

Current helpers:

* `isTeacherRole`
* `firstBook`
* `itemTypeLabel`
* `parseItems`
* `normalizeJlpt`
* `extractMeaningChoices`
* `toNullableInt`
* `cleanNullable`
* `compactText`
* `chapterDisplay`
* `savedItemSearchText`
* `editDraftFromItem`
* `blankDraft`

Some helpers are pure, but they sit near behavior-sensitive teacher-prep rules. Move them later only after the save/edit/filter behavior is covered.

### State

Access/loading state:

* `loading`
* `canAccess`
* `message`

Teacher book/book metadata state:

* `teacherBook`

Prep item rows:

* `savedItems`

Bulk add step/draft state:

* `step`
* `defaultItemType`
* `rawInput`
* `drafts`
* `isPreviewing`
* `isSaving`

Bulk page/chapter field state:

* `bulkPageNumber`
* `bulkChapterNumber`
* `bulkChapterName`

Saved item edit/delete/detail state:

* `editingItemId`
* `editDraft`
* `editSaving`
* `deletingItemId`
* `expandedItemIds`
* `editPanelRef`

Saved item search/filter state:

* `savedSearch`
* `savedPageFilter`

There is no linked-student state and no assignment state.

### Data Loading / Supabase Behavior

Keep all data loading in `page.tsx`.

Current loading behavior:

* `loadTeacherBook()` calls `supabase.auth.getUser()`.
* Signed-out users get `canAccess = false` and `Please sign in.`
* The current user's `profiles` row is loaded for `role` and `is_super_teacher`.
* `isTeacherRole(profile)` determines local access.
* `teacher_books` is loaded by `teacherBookId`, including joined `books` metadata.
* `teacher_book_items` are loaded by `teacher_book_id`.
* Saved items are ordered by `page_number` and `created_at`.
* Jisho lookup is called during `handlePreview()` for draft support when the default item type is `word` or `phrase`.

The page does not load:

* linked students
* assignments
* `teacher_students`
* student `user_books`
* student `user_book_words`
* `vocabulary_cache` rows directly

### Save / Update / Delete Behavior

Keep all mutation handlers in `page.tsx`.

Current mutation behavior:

* `handlePreview()`
  * parses pasted raw items
  * creates draft rows
  * optionally calls `/api/jisho` for word/phrase support
  * stores draft reading, meaning choices, and default meaning
  * advances to the definitions step

* `handleSaveDefinitions()`
  * advances to the details step

* `applyBulkField()`
  * applies page, chapter number, or chapter/story name to blank drafts or all drafts
  * sets a message with affected count

* `handleSaveAll()`
  * builds `teacher_book_items` insert payload from drafts
  * saves item type, surface text, reading, meaning, optional `vocabulary_cache_id`, page, chapter, chapter name, teacher note, explanation, and translation
  * inserts rows into `teacher_book_items`
  * advances to done state
  * reloads teacher book and saved items

* `resetForMore()`
  * returns the flow to paste mode
  * clears draft input state

* `startEditItem()`
  * opens edit state from a saved item
  * scrolls to the edit panel

* `saveEditedItem()`
  * builds update payload from `editDraft`
  * updates one `teacher_book_items` row by item ID and `teacher_book_id`
  * reloads saved items

* `deleteSavedItem()`
  * confirms with the user
  * deletes one `teacher_book_items` row by item ID and `teacher_book_id`
  * removes it from local state
  * clears edit state if the deleted item was being edited

No student assignment behavior is present.

### Derived Values

Keep derived values in `page.tsx`.

Current derived values:

* `itemCount`
* `savedPageOptions`
* `visibleSavedItems`
* `book`
* `isShortStoryBook`
* `chapterNameLabel`
* selected saved item edit draft through `editDraft`
* expanded item state via `expandedItemIds`
* saved item display labels through `itemTypeLabel`, `chapterDisplay`, and `compactText`
* empty-state decisions:
  * no saved items
  * no saved items match filters
  * loading/no-access states

There are no teacher/super-teacher permission flags beyond `canAccess`, and no assignment status labels.

### Render Sections

Current render sections:

* page shell
* navigation links:
  * Teacher Library
  * Follow-Along
* page title
* loading state
* no-access/error state
* book context card with cover/title/author and Follow-Along action
* message banner
* Step 1 paste/input form
* Step 2 definitions/support fields draft list
* Step 3 details/page/chapter fields
* bulk apply fields panel
* done state
* saved prep items header/count
* saved item search and page filter controls
* saved prep item empty states
* saved prep item table
* expandable details rows for teacher note/explanation/translation
* saved prep item edit panel

There is no assignment panel.

## Recommended First-Pass Visual Extractions

Only extract presentational UI. Keep all data loading, Jisho lookup, draft mutation, save/update/delete behavior, search/filter logic, helper functions, and page-local types in `page.tsx`.

### 1. `TeacherLibraryBookLoadingState`

What JSX it owns:

* loading card that says `Loading teacher book...`

What stays in `page.tsx`:

* `loading`
* `loadTeacherBook`
* auth/profile/book loading

Expected props:

* none, or `message?: string`

Risk level:

* Low

Suggested order:

* 1

### 2. `TeacherLibraryBookAccessState`

What JSX it owns:

* no-access/error card shown when access/book loading fails

What stays in `page.tsx`:

* `canAccess`
* `teacherBook`
* teacher role checks
* message setting

Expected props:

* `message: string`

Risk level:

* Low

Suggested order:

* 2

### 3. `TeacherLibraryBookHeader`

What JSX it owns:

* top navigation links
* `Prep Add` heading

What stays in `page.tsx`:

* `teacherBookId`
* decision to show Follow-Along link only when a teacher book exists, unless passed as `showFollowLink`

Expected props:

* `teacherBookId: string`
* `showFollowLink: boolean`

Risk level:

* Low

Suggested order:

* 3

### 4. `TeacherLibraryBookContextCard`

What JSX it owns:

* cover/title/author context card
* Add More Items button when `step === "done"`
* Follow-Along CTA

What stays in `page.tsx`:

* `book` derivation
* `step`
* `resetForMore`
* route choice

Expected props:

* `book: BookMeta | null`
* `teacherBookId: string`
* `showAddMore: boolean`
* `onAddMore: () => void`

Risk level:

* Low-medium because it includes an action button.

Suggested order:

* 4

### 5. `TeacherLibraryBookMessageBanner`

What JSX it owns:

* amber message banner

What stays in `page.tsx`:

* `message`
* all behavior that sets messages

Expected props:

* `message: string`

Risk level:

* Low

Suggested order:

* 5

### 6. `TeacherPrepStepHeader`

What JSX it owns:

* repeated step card header pattern for Step 1, Step 2, Step 3
* step label, title, and description

What stays in `page.tsx`:

* `step` rendering conditions
* form/list behavior

Expected props:

* `stepLabel: string`
* `title: string`
* `description: string`

Risk level:

* Low

Suggested order:

* 6

### 7. `TeacherPrepPastePanel`

What JSX it owns:

* Step 1 paste form
* default item type select
* raw textarea
* item count
* Check Items button

What stays in `page.tsx`:

* `handlePreview`
* `defaultItemType`
* `rawInput`
* `itemCount`
* `isPreviewing`
* setters

Expected props:

* controlled form values, setters, item type options, labels, submit handler

Risk level:

* Medium. Still mostly presentational, but it is a controlled form.

Suggested order:

* 7, or defer if doing only tiny pass.

### 8. `TeacherPrepDraftDefinitionList`

What JSX it owns:

* Step 2 draft cards
* item type select per draft
* reading input
* definition choice select and meaning textarea
* teacher note/explanation/translation textareas

What stays in `page.tsx`:

* `drafts`
* `updateDraft`
* `chooseMeaning`
* `handleSaveDefinitions`
* all draft behavior

Expected props:

* large controlled draft prop set

Risk level:

* High for first pass. It would create a large prop basket.

Suggested order:

* Defer.

### 9. `TeacherPrepBulkFieldsPanel`

What JSX it owns:

* Step 3 apply fields panel
* bulk page/chapter/story name inputs
* Fill blanks / Apply all buttons

What stays in `page.tsx`:

* bulk field state
* `applyBulkField`
* `chapterNameLabel`

Expected props:

* `bulkPageNumber`, `bulkChapterNumber`, `bulkChapterName`
* setters
* `chapterNameLabel`
* `onApplyField`

Risk level:

* Medium. Mostly UI, but applies changes to many drafts.

Suggested order:

* Defer until the Step 3 behavior is ready for focused extraction.

### 10. `TeacherPrepSavedItemsHeader`

What JSX it owns:

* Saved prep items title
* showing count copy
* search input
* page filter select

What stays in `page.tsx`:

* `savedItems`
* `visibleSavedItems`
* `savedSearch`
* `savedPageFilter`
* `savedPageOptions`
* filter derivation

Expected props:

* `savedCount: number`
* `visibleCount: number`
* `search: string`
* `onSearchChange: (value: string) => void`
* `pageFilter: string`
* `onPageFilterChange: (value: string) => void`
* `pageOptions: number[]`

Risk level:

* Low-medium

Suggested order:

* 7 if continuing beyond tiny states/header.

### 11. `TeacherPrepSavedItemsTable`

What JSX it owns:

* saved prep item table
* rows
* type badge
* action buttons
* expandable details rows

What stays in `page.tsx`:

* `visibleSavedItems`
* `expandedItemIds`
* `startEditItem`
* `deleteSavedItem`
* `toggleExpandedItem`
* deleting state
* helper functions

Expected props:

* large list/action prop set

Risk level:

* Medium-high. It is visually useful but action-heavy.

Suggested order:

* Defer unless specifically targeting the saved-list UI.

### 12. `TeacherPrepEditPanel`

What JSX it owns:

* saved item edit form
* save/cancel buttons

What stays in `page.tsx`:

* `editingItemId`
* `editDraft`
* `updateEditDraft`
* `saveEditedItem`
* `editSaving`
* ref/scroll behavior

Expected props:

* many controlled edit fields and handlers

Risk level:

* High for first pass.

Suggested order:

* Defer.

### 13. `TeacherLibraryBookEmptyState`

What JSX it owns:

* no prep items empty state
* no filter matches empty state if generalized carefully

What stays in `page.tsx`:

* condition deciding which empty state applies

Expected props:

* `message: string`

Risk level:

* Low

Suggested order:

* 8

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* The tracker row is stale. The page is currently about 1320 lines, not 904.
* The file header says `teacher_book_items`, while the user's tracker label says Teacher Library Book Detail. The page itself is currently a `Prep Add` workflow, not a simple detail page.
* `normalizeJlpt(entry.jlpt?.[0] || "")` is called during Jisho lookup but its result is not stored on the draft. That looks inert.
* `vocabulary_cache_id` exists on drafts and saved items but does not appear to be set from the Jisho lookup in this page.
* Jisho lookup uses only `data?.data?.[0]`, not the candidate list/meaning-choice handling used in Add Word.
* Access checks confirm teacher role, but the query loads `teacher_books` by ID without an obvious local `.eq("teacher_id", user.id)` check. RLS may enforce ownership, and super-teacher behavior may be intended, but this is worth reviewing before architecture cleanup.
* The page uses Bulk Add-style flow and copy. The user recently noted Global Word Entry should not look like Bulk Add, but teacher lesson prep may be an appropriate place for a bulk-style workflow.
* The saved prep items table has fairly compact styling and large long-text fields are hidden behind details rows. This matches recent UI direction, but mobile table behavior should be checked.
* `Story Name` appears only when `book_type === "short_story"`. Confirm the actual book type value used for short story books.
* No assignment behavior is present, despite teacher prep eventually needing student-facing support.
* No grouping by chapter/page is rendered beyond sorting/filtering and chapter/page columns.
* The Follow-Along link exists before and inside the book context card; this may be intentional but duplicated.

## Recommended First Pass

Start with tiny, safe visual extractions:

1. `TeacherLibraryBookLoadingState`
2. `TeacherLibraryBookAccessState`
3. `TeacherLibraryBookHeader`
4. `TeacherLibraryBookContextCard`
5. `TeacherLibraryBookMessageBanner`
6. `TeacherPrepStepHeader`
7. `TeacherLibraryBookEmptyState`

After that, pause.

The draft definition list, Step 3 bulk fields, saved table, and edit panel are all useful visual extraction candidates, but they carry large controlled state, draft mutation behavior, save/delete handlers, and page/chapter logic. Extracting them too early would likely create large prop baskets.

## Architecture Deferred

* Teacher access helper: defer because teacher role, super-teacher access, ownership/RLS expectations, and teacher route protection should be reviewed together.
* Teacher library book service: defer because teacher-owned book access and shared book metadata loading are sensitive boundaries.
* Teacher prep item service: defer because insert/update/delete behavior is core to the page.
* Teacher prep item DAO: defer until RLS/ownership expectations are documented.
* Vocabulary cache helper: defer because `vocabulary_cache_id` is present but not actively set by this page.
* Jisho lookup helper/service: defer because lookup behavior is simpler than Add Word and may need product decisions before sharing.
* Assignment service: defer because assignment behavior is not currently present.
* Item type/page/chapter helper: defer until teacher prep, follow-along, and future student support use the same rules.
* Shared teacher book context components: defer until Teacher Library list/detail/follow pages settle.
* Future Teacher Prep / Student Support boundary cleanup: defer because this page intentionally does not write learner vocab, but future support may need a carefully separate student-facing layer.

## Browser Smoke Test Suggestions

Manual checklist for later implementation work:

* Teacher can open `/teacher/library/[teacherBookId]`.
* Super-teacher can open intended teacher library book detail pages, if supported.
* Regular student/member is blocked by teacher route protection or local access state.
* Teacher can only access intended teacher-owned books, unless super-teacher access is intended.
* Book context displays cover/title/author correctly.
* Follow-Along link works.
* Empty prep item state works.
* Step 1 paste flow detects item count.
* Default item type changes draft item type.
* Jisho-assisted preview works for word/phrase items.
* Manual grammar/sentence/note items can proceed without Jisho.
* Definition selection and custom meaning behavior work.
* Teacher note/explanation/translation fields save into drafts.
* Bulk page/chapter/story fields apply to blanks and all rows correctly.
* Saving all prep items inserts `teacher_book_items`.
* Saved prep items reload after save.
* Search works across word, reading, meaning, note, explanation, translation, chapter, and page.
* Page filter works.
* Details expand/collapse works.
* Edit prep item opens and scrolls down to the edit panel.
* Edit save updates the saved item.
* Delete prep item removes the item.
* Short-story books show `Story Name`.
* Non-short-story books show `Chapter Name`.
* No learner `user_book_words`, sessions, stats, or study progress are created.
* Mobile-ish visual check for paste form, draft cards, saved table, details rows, and edit panel.

## Final Recommendation

This page is ready for a small first-pass visual extraction, but only around tiny states/header/book context/message/empty/step-header components.

Do not start with the draft cards, saved table, or edit panel. Those are behavior-heavy and should wait until teacher prep item behavior is either stable enough for a focused visual extraction or ready for second-pass architecture planning.

No assignment behavior cleanup is needed before visual extraction because assignment is not present here. The main behavior cleanup to consider later is clarifying teacher-book ownership access, Jisho/cache behavior, and the future boundary between teacher prep items and student-facing support.

Suggested updated tracker row after map creation:

`- [ ] Refactor map ready / visual pass not started | app/(protected)/teacher/library/[teacherBookId]/page.tsx | 1320 | 1320 | 0 |`

### Finished 

* Extracted `TeacherLibraryBookHeader`
* Extracted `TeacherLibraryBookLoadingState`
* Extracted `TeacherLibraryBookAccessState`
* Extracted `TeacherLibraryBookMessageBanner`
* Extracted `TeacherLibraryBookContextCard`
* Extracted `TeacherLibraryBookEmptyState`
* Extracted `TeacherPrepStepHeader`
* Extracted `TeacherPrepSavedItemsHeader`
* Extracted `TeacherPrepDoneState`
* Extracted `TeacherPrepPastePanel`
* Extracted `TeacherPrepBulkFieldsPanel`
* Extracted `TeacherPrepPrimaryActionBar`

The first visual pass is complete. The page now has a calmer Bulk Add-style structure with shell, context, message, step header, paste panel, bulk fields, saved item controls, done state, and empty states extracted into named presentational components.

The draft definition cards, details draft rows, saved prep item table, and saved item edit panel are intentionally deferred because they carry controlled form state, save/edit/delete behavior, expand/collapse behavior, and page/chapter/story-name rules.