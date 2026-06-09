# Teacher Kanji Queue Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/teacher/kanji/page.tsx`

Current observed size: 1766 lines.

Current tracker row is stale:

`- [ ] Skip for now | app/(protected)/teacher/kanji/page.tsx | 1670 | 1670 | 0 |`

Recommended updated tracker row for now:

`- [ ] Skip for now | app/(protected)/teacher/kanji/page.tsx | 1766 | 1766 | 0 |`

## Current Page Purpose

The Teacher Kanji Queue page is a teacher-facing workbench for reviewing and fixing kanji-reading enrichment issues.

It currently supports:
* teacher/super-teacher review of saved vocabulary that needs kanji-map enrichment
* global `vocabulary_kanji_map` review and editing
* old flagged global map rows through `vocabulary_kanji_map.flagged_for_review`
* learner-submitted `kanji_map_reports`, which are merged into the teacher queue as flagged review items
* cache-only/global flagged items that may not be connected to a visible learner-owned saved word
* queue status filters for active, flagged, needs reading, needs work, complete, and excluded
* student and book filters
* bulk opening of the first visible active queue items
* editing kanji map rows for reading type, base reading, and realized reading
* saving one open editor or all open editors
* clearing flags without saving readings
* excluding a word from kanji readings
* resolving or dismissing learner report rows when save/clear/exclude actions run

The current UI is mostly a page header, summary cards, filters/bulk actions, an open-editor area, and a queue table.

## Important Data Boundaries

Global/shared kanji-map data:
* `vocabulary_kanji_map` is global/shared data.
* Teachers can update map rows from this page.
* Learners should not directly update this table.
* Old `flagged_for_review` rows are still supported and displayed.

Learner-submitted reports:
* Learner flags go through `kanji_map_reports`.
* The page loads open/reviewing reports and then loads their linked `vocabulary_kanji_map` rows.
* Reported map rows are treated as flagged in the teacher queue by setting display-only `flagged_for_review: true` in memory.
* Save actions resolve open/reviewing reports for the affected cache.
* Clear/exclude actions dismiss open/reviewing reports for the affected cache.

Teacher review actions:
* Teachers can create missing `vocabulary_cache` rows.
* Teachers can create or update missing `vocabulary_kanji_map` rows.
* Teachers can update reading fields on global map rows.
* Teachers can clear global flagged rows.
* Teachers can dismiss or resolve learner reports through cache-level helper behavior.

Learner-owned context:
* The queue loads linked learner/user book context so teachers can see student and book labels.
* The visible queue includes saved words from the teacher's own library and linked students.
* Super-teacher broader access is indirectly represented through role flags, but this page does not load every user unless linked through the teacher/student query in this file.

Private saved-word/user-book data:
* `user_books` and `user_book_words` are queried for teacher-owned/linked-student context.
* These rows provide source book, student, surface, reading, cache ID, and ignore flags.
* This private context should remain protected by teacher access checks and RLS.

Important design note:
* Learners should be able to flag kanji cards, but learner reports should remain in `kanji_map_reports`.
* Teacher-side clearing/resolving should update report statuses so reports do not stay open forever after a global row is fixed or dismissed.

## Current Risks / Do Not Touch Yet

For the first visual pass, do not move or change:
* teacher/super-teacher access checks
* Supabase queries
* global `vocabulary_kanji_map` updates
* `kanji_map_reports` status updates
* report resolve/dismiss behavior
* queue loading and merging behavior
* old flagged-row compatibility
* learner report visibility
* saved-word and vocabulary-cache joins
* helper functions
* page-local types
* save/update/delete/resolve handlers
* bulk open/save behavior
* exclude/ignore behavior
* services, DAOs, controllers, or hooks

The page is behavior-heavy. A first visual pass should start with tiny presentational shells only.

## Current Structure Map

### Types / Interfaces

Keep all page-local types in `page.tsx` for the first visual pass:
* `ProfileRow`
* `UserBookRow`
* `WordRow`
* `KanjiMapRow`
* `VocabularyCacheRow`
* `QueueStatus`
* `StatusFilter`
* `QueueItem`

These types encode the current Supabase select shapes and queue merge behavior. Moving them before the queue model stabilizes would make the page harder to audit.

### Constants

Current constants:
* `KANJI_ENRICHMENT_TEST_START`
* `BULK_OPEN_LIMIT`

Embedded copy/options:
* page eyebrow/title/description
* Teacher Home link copy
* summary card labels
* status filter options
* bulk open/save copy
* editor labels and placeholders
* queue table labels
* empty-state copy

Keep constants and copy in `page.tsx` for the first visual pass unless passed into visual components as plain props.

### Helper Functions

Keep these helpers in `page.tsx` for the first visual pass:
* `hasKanji`
* `kanjiChars`
* `hiraToKata`
* `getBookTitle`
* `statusLabel`
* `statusTone`
* `statusDetailLabel`
* `isNeedsReadingStatus`
* `isNeedsWorkStatus`
* `isActiveStatus`
* `effectiveReadingType`
* `getQueueStatus`

Important local helpers inside the component:
* `loadQueue`
* `ensureKanjiRows`
* `loadEditorRows`
* `openKanjiEditor`
* `openFirstVisibleBatch`
* `updateEditorRow`
* `saveKanjiRowsForItem`
* `updateKanjiReportsForCache`
* `saveAllOpenEditors`
* `saveEditorRows`
* `ignoreWord`
* `clearKanjiFlag`

Do not move these in a visual pass.

### State

Access/loading state:
* `loading`
* `error`
* `saveMessage`
* `currentUserId`
* `canAccess`

Queue/report rows:
* `queueItems`

Filters/search state:
* `studentFilter`
* `bookFilter`
* `statusFilter`

Selected/open item state:
* `editorOpenByWordId`
* `editorRowsByWordId`

Edit form state:
* editor rows are stored by `userBookWordId`; row fields are edited through `updateEditorRow`

Saving/error/success state:
* `preparingId`
* `bulkOpening`
* `bulkSaving`
* `savingEditorId`
* `ignoringId`
* `error`
* `saveMessage`

Resolve/dismiss state:
* no separate status state; report status changes happen through mutation helpers

### Data Loading / Supabase Behavior

The page loads:
* current Supabase auth user
* current profile with role and `is_super_teacher`
* linked students from `teacher_students`
* profiles for teacher/self/student display names
* `user_books` for the teacher and linked students
* `user_book_words` with kanji surfaces, readings, cache IDs, and ignore flags
* global `vocabulary_kanji_map` rows for cache IDs found in saved words
* old flagged `vocabulary_kanji_map` rows where `flagged_for_review = true`
* open/reviewing `kanji_map_reports`
* reported `vocabulary_kanji_map` rows by report map IDs
* `vocabulary_cache` rows for flagged cache IDs that are not connected to currently loaded user-book words

Queue merge behavior:
* saved-word queue items come from linked/private user-book words.
* old global flagged map rows are merged into the map-row cache.
* learner reports are converted into flagged map rows for display.
* cache-only flagged rows become queue items with `userBookWordId: cache:{id}` and student label `Shared kanji bank`.
* queue items are sorted with flagged items first, done/excluded items later, then date/student/book/surface.

Do not change this behavior during visual extraction.

### Save / Resolve / Update Behavior

Mutation handlers:
* `ensureKanjiRows`
  * creates a missing `vocabulary_cache` row when needed
  * updates `user_book_words.vocabulary_cache_id`
  * creates missing `vocabulary_kanji_map` rows for each kanji position
  * updates existing map row kanji if position contents changed
* `openKanjiEditor`
  * ensures rows, loads editor rows, opens one editor, refreshes queue
* `openFirstVisibleBatch`
  * ensures and opens editors for the first visible active items
* `updateEditorRow`
  * updates local editor row state
  * syncs realized reading to base reading when appropriate
* `saveKanjiRowsForItem`
  * saves reading type, base reading, and realized reading
  * clears global `flagged_for_review` for that cache when flagged
  * resolves open/reviewing reports for that cache
* `updateKanjiReportsForCache`
  * finds map row IDs for a cache
  * updates open/reviewing `kanji_map_reports` to `resolved` or `dismissed`
* `saveAllOpenEditors`
  * saves every open editor, refreshes the queue, closes editors, and clears editor row state
* `saveEditorRows`
  * saves one open editor, refreshes the queue, closes that editor, and clears its rows
* `ignoreWord`
  * confirms exclusion
  * marks all map rows for the cache as excluded and clears flags
  * dismisses open/reviewing reports for that cache
  * marks the user-book word as ignored when it is not a cache-only item
* `clearKanjiFlag`
  * clears global `flagged_for_review` for the cache
  * dismisses open/reviewing reports for that cache
  * refreshes queue

Do not change these mutation flows during visual extraction.

### Derived Values

Current derived values:
* `studentOptions`
* `bookOptions`
* `filteredItems`
* `bulkOpenItems`
* `openEditorItems`
* `summary`
* status labels and tones through helper functions
* display fields per queue item: student, username, book, surface, reading, katakana reading, cache ID
* row counts: kanji count, map rows, complete positions, incomplete rows, flagged rows
* active/done/excluded status grouping behavior

### Render Sections

Current JSX sections:
* page shell
* header panel with Teacher Workbench label, title, description, and Teacher Home link
* loading state
* access-denied state
* error banner
* save-message banner
* summary cards
* filter controls
* bulk open/save controls
* open editors panel
* editor item header
* editor kanji-map row form
* editor action bar: clear flag, exclude, save
* queue table
* queue empty state
* queue item rows
* queue status badge and detail
* queue row action buttons: open editor, clear flag, exclude

## Recommended First-Pass Visual Extractions

Only extract presentational UI. Keep all data loading, access checks, queue merge logic, mutation handlers, helper functions, and page-local types in `page.tsx`.

### 1. `TeacherKanjiHeader`

What JSX it owns:
* top rounded header section
* eyebrow, title, description
* Teacher Home link

What stays in `page.tsx`:
* route choice
* access/data loading

Expected props:
* `onBackHref?: string` or `homeHref: string`

Risk level:
* Low

Suggested order:
* 1

### 2. `TeacherKanjiLoadingState`

What JSX it owns:
* loading section

What stays in `page.tsx`:
* loading branch decision

Expected props:
* none or `message`

Risk level:
* Low

Suggested order:
* 2

### 3. `TeacherKanjiAccessState`

What JSX it owns:
* access-denied section

What stays in `page.tsx`:
* teacher/super-teacher access checks

Expected props:
* `message`

Risk level:
* Low

Suggested order:
* 3

### 4. `TeacherKanjiMessageBanner`

What JSX it owns:
* error banner
* save/success banner

What stays in `page.tsx`:
* error/save-message state and timing

Expected props:
* `type: "error" | "success"`
* `message: string`

Risk level:
* Low

Suggested order:
* 4

### 5. `TeacherKanjiSummaryCards`

What JSX it owns:
* total/flagged/needs reading/needs work/complete/excluded cards

What stays in `page.tsx`:
* `summary` calculation

Expected props:
* `summary: { total: number; flagged: number; needsReading: number; needsWork: number; complete: number; excluded: number }`

Risk level:
* Low

Suggested order:
* 5

### 6. `TeacherKanjiFilterBar`

What JSX it owns:
* student select
* book select
* status select

What stays in `page.tsx`:
* filter state
* option derivation
* filtering behavior

Expected props:
* `studentFilter`
* `bookFilter`
* `statusFilter`
* `studentOptions`
* `bookOptions`
* `onStudentFilterChange`
* `onBookFilterChange`
* `onStatusFilterChange`

Risk level:
* Low-medium because it has several controlled inputs.

Suggested order:
* 6

### 7. `TeacherKanjiBulkActionBar`

What JSX it owns:
* bulk open/save explanation
* open-first-visible button
* save-all-open button

What stays in `page.tsx`:
* bulk item derivation
* confirm/save/open behavior
* loading flags

Expected props:
* `bulkOpenCount`
* `openEditorCount`
* `bulkOpenLimit`
* `bulkOpening`
* `bulkSaving`
* `onOpenBatch`
* `onSaveAll`

Risk level:
* Low-medium

Suggested order:
* 7

### 8. `TeacherKanjiEmptyState`

What JSX it owns:
* queue clear empty state

What stays in `page.tsx`:
* empty branch decision

Expected props:
* optional copy strings

Risk level:
* Low

Suggested order:
* 8

### 9. `TeacherKanjiQueueTable`

What JSX it owns:
* table shell
* table header
* maps items to row component

What stays in `page.tsx`:
* `filteredItems` derivation
* all handlers
* status helpers unless passed in

Expected props:
* `items`
* `editorOpenByWordId`
* `preparingId`
* `ignoringId`
* `onOpenEditor`
* `onClearFlag`
* `onExclude`

Risk level:
* Medium because table rows are behavior-heavy and handler-rich.

Suggested order:
* 9, after small components only if still useful.

### 10. `TeacherKanjiQueueItem`

What JSX it owns:
* one queue table row
* student/book/word/status/count/action cells

What stays in `page.tsx`:
* handlers
* status helper functions
* derived queue item model

Expected props:
* `item`
* `isEditorOpen`
* `isPreparing`
* `isIgnoring`
* `onOpenEditor`
* `onClearFlag`
* `onExclude`

Risk level:
* Medium. This is visually clear but coupled to multiple actions.

Suggested order:
* 10, only after table shell if the row feels too large.

### 11. `TeacherKanjiOpenEditorsPanel`

What JSX it owns:
* open editor section wrapper
* section heading/copy
* close-all button
* maps open editor items

What stays in `page.tsx`:
* open editor derivation
* close-all state update
* save/exclude/clear handlers

Expected props:
* `items`
* `editorRowsByWordId`
* `onCloseAll`
* `onCloseOne`
* `onUpdateRow`
* `onClearFlag`
* `onExclude`
* `onSave`
* saving/loading IDs

Risk level:
* Medium-high because the prop surface is large.

Suggested order:
* Defer until after tiny visual extraction and behavior smoke tests.

### 12. `TeacherKanjiEditorCard`

What JSX it owns:
* one open editor card
* word header
* row editor list
* action bar

What stays in `page.tsx`:
* local editor row state
* update/save/clear/exclude behavior

Expected props:
* `item`
* `rows`
* `onClose`
* `onUpdateRow`
* `onClearFlag`
* `onExclude`
* `onSave`
* loading IDs/flags

Risk level:
* Medium-high. It is a tempting visual extraction, but behavior is dense.

Suggested order:
* Defer unless the page becomes hard to work in after smaller extractions.

### 13. `TeacherKanjiEditFormRow`

What JSX it owns:
* one kanji-map row editor
* kanji display
* reading type select
* base reading input
* realized reading input
* katakana previews

What stays in `page.tsx`:
* `updateEditorRow`
* reading sync behavior
* editor row state

Expected props:
* `row`
* `onUpdate`
* `hiraToKata` output or callback

Risk level:
* Medium. It is visual, but it is part of the global map mutation surface.

Suggested order:
* Later in the first visual pass, only after header/states/cards/filter.

## Suspicious / Possibly Unused Code

Do not remove yet.

* The current tracker line count appears stale. The page currently has 1766 lines, not 1670.
* Old flagged-row handling and `kanji_map_reports` now overlap intentionally. This is useful, but easy to break.
* Report metadata is reduced to report created time and display-as-flagged behavior; report IDs/statuses are not preserved in queue item display.
* `currentUserId` is only used for ignore audit fields.
* `QueueStatus` includes `complete` and `excluded`; the default status filter is `active`, so complete/excluded can be hidden unless filter changes.
* The queue table has a `Fragment` wrapper around each single row, likely left from a previous expandable-row design.
* `BULK_OPEN_LIMIT` is used in both actual item slicing and button/copy. This is fine, but should stay centralized.
* `KANJI_ENRICHMENT_TEST_START` hard-codes a date and may hide older saved words.
* `ensureKanjiRows` can create global cache/map rows from this page. That behavior is important but high-risk.
* Clearing a flag dismisses reports for every map row in the same vocabulary cache, not only one report row. This may be intended, but should be remembered.
* Saving resolves reports for every map row in the same vocabulary cache.
* Copy says "Flagged from Kanji Study"; queue can include learner reports and old global flags, so wording may need future refinement.

## Recommended First Pass

Recommended practical first visual pass:

1. Extract `TeacherKanjiHeader`.
2. Extract `TeacherKanjiLoadingState`.
3. Extract `TeacherKanjiAccessState`.
4. Extract `TeacherKanjiMessageBanner`.
5. Extract `TeacherKanjiSummaryCards`.
6. Extract `TeacherKanjiEmptyState`.

Stop there and reassess.

Then, if the page still feels visually noisy and behavior smoke tests pass:

7. Extract `TeacherKanjiFilterBar`.
8. Extract `TeacherKanjiBulkActionBar`.

Pause before extracting queue table/editor components unless there is a specific UI reason. The queue table and editor panel are behavior-heavy and can quickly create a large prop basket.

## Architecture Deferred

Teacher access helper:
* Defer because the teacher/super-teacher/linked-student boundary is privacy-sensitive and currently visible in-page.

Kanji report service:
* Defer because learner report resolution/dismissal recently became important and should be stabilized before extraction.

Vocabulary kanji-map DAO:
* Defer because this page creates and updates global map/cache data. Query extraction should happen with tests or strong smoke coverage.

Queue merge helper:
* Defer because merging saved-word gaps, old global flags, and learner reports is the heart of this page's behavior.

Report resolve/dismiss helper:
* Defer because cache-level report status updates are subtle and should remain visible until behavior is trusted.

Status label helper:
* Defer unless doing a tiny helper cleanup pass. Current helpers are simple and local.

Shared teacher upkeep components:
* Defer because Teacher Hub / Needs Attention / General Upkeep structure is still evolving.

Editor row view model:
* Defer because editor rows directly map to global `vocabulary_kanji_map` updates.

Bulk open/save controller:
* Defer because it interleaves confirm prompts, row creation, row loading, and state updates.

## Browser Smoke Test Suggestions

Manual smoke checklist:
* Teacher/super-teacher can open `/teacher/kanji`.
* Regular student/member is blocked by teacher route protection or this page's teacher access state.
* Old `vocabulary_kanji_map.flagged_for_review` rows appear if still supported.
* Learner-submitted open/reviewing `kanji_map_reports` appear.
* Learner reports are displayed without learners updating the global map directly.
* Status summary counts match visible queue behavior.
* Student, book, and status filters work.
* Selecting/opening an item creates or loads kanji rows and shows correct details.
* Bulk open opens the expected first visible active items.
* Editing reading type/base/realized readings updates local form state correctly.
* Saving one editor persists readings and closes/removes the editor.
* Saving all open editors persists all open rows.
* Resolving/fixing an item clears old flags and resolves related report rows.
* Clearing an old flag removes it from the flagged queue.
* Clearing an old flag does not leave `kanji_map_reports` stuck open.
* Excluding an item dismisses reports and hides the item from active queue.
* Teacher Hub count matches queue behavior after save/clear/exclude.
* Empty state works.
* Mobile-ish visual check for header, summary cards, filters, open editors, and queue table.

Do not run these smoke tests during this documentation task unless explicitly requested.

## Final Recommendation

This page is ready for a small first-pass visual extraction, but only at the safe shell level.

Start with tiny states/header/cards/empty state. Then reassess before touching filters, queue list, or editor panels.

No behavior cleanup is required before extracting tiny presentational shells, but behavior should be smoke-tested before extracting the queue table or editor components because the page now merges old global flags with learner `kanji_map_reports`.

### Finished

* Extracted `TeacherKanjiHeader`
* Extracted `TeacherKanjiLoadingState`
* Extracted `TeacherKanjiAccessState`
* Extracted `TeacherKanjiMessageBanner`
* Extracted `TeacherKanjiSummaryCards`
* Extracted `TeacherKanjiEmptyState`
* Extracted `TeacherKanjiFilterBar`
* Extracted `TeacherKanjiBulkActionBar`