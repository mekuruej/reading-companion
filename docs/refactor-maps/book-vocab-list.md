# Book Vocab List Refactor Map

Extraction Tasks

## Current Page Purpose

`app/(protected)/books/[userBookId]/words/page.tsx` is the book-specific vocabulary list for one saved user book.

It lets the user:
* view words saved from a specific book
* return to the book hub
* search words by surface, reading, meaning, JLPT, chapter, page, and definition number
* filter by chapter
* switch into hidden-word mode
* see book repeat counts
* see Library Study color/stage status from cross-book encounter and progress data
* drag words to adjust reading order within the same chapter/page group
* open a word detail page
* edit, hide, unhide, or delete words

The page displays and edits private/user-book data:
* `user_book_words` rows for the selected `userBookId`
* word surface, reading, meaning, other definition, JLPT, page, chapter, hidden status, definition choice, and reading-support behavior
* joined book title/cover from `user_books` and `books`
* user ownership/access context from `user_books`, `profiles`, and `teacher_students`
* user learning settings and Library Study progress/encounter data

## Current Risks / Do Not Touch Yet

Do not move or change these in the first pass:
* access, ownership, linked-teacher, and super-teacher checks
* `loadAllGlobalEncounterRows`
* Supabase reads for `user_books`, `profiles`, `teacher_students`, `user_learning_settings`, `user_library_word_summaries`, `user_library_word_progress`, and `user_book_words`
* `fetchLibraryStudyColorInfoByWord` effect and color lookup behavior
* global encounter and progress fallback behavior
* hidden-word filtering query behavior
* `openEdit`, `closeEdit`, `saveEdit`, `deleteWord`, `hideWord`, and `unhideWord`
* drag/drop reorder behavior and `moveWordInGroup`
* search, chapter filter, hidden filter, and sort behavior
* meaning-choice handling in the edit modal
* controlled edit inputs and editing state
* Library Study color/status calculations
* chapter/key/normalization helpers until their future home is clearer

The first code changes should only move visual JSX into components and keep state, handlers, calculations, and data flow in `page.tsx`.

## Suggested Extraction Order

## Remaining

## Recommended First Extraction

Start with `BookVocabIntroCopy`.

It is the smallest and clearest low-risk visual extraction because it only owns static text. It does not touch access checks, Supabase queries, routing, filters, sorting, drag/drop, edit state, or mutation handlers.

After that, extract `BookVocabReorderHint`, then `BookVocabTableHeader` or `BookVocabContextCard`.

## Commenting Notes

Useful future comments would be selective and should explain responsibility or safety boundaries, not repeat JSX.

Good candidates:
* Above the access/ownership block: explain that the page can be viewed by the owner, a super teacher, or a linked teacher, and that all data loads must use the book owner where appropriate.
* Above the Library Study encounter/progress load: explain why the page loads both summary counts and progress rows, and why it falls back to scanning `user_book_words`.
* Above `moveWordInGroup`: explain that reorder is intentionally limited to words with the same chapter/page grouping.
* Above `repeatKey`: explain that book repeats are counted by surface plus selected definition, not just by surface.
* Above `studyIdentityKey`: explain that Library Study status is keyed by normalized surface and normalized reading across books.
* Above the `fetchLibraryStudyColorInfoByWord` effect: explain that this fetch is display-only color enrichment and should not drive ownership or mutation decisions.
* Above `changeDefinition`: explain that selecting a definition number intentionally overwrites the meaning field with the selected stored choice.

Avoid comments like:
* "renders table"
* "maps over filtered words"
* "sets edit state"
* "shows button"

Target Architecture Placement

page.tsx
* route params and router
* all state
* all effects
* access/ownership checks
* Supabase reads
* edit/save/delete/hide/unhide handlers
* drag/drop reorder handlers
* filter/search/sort calculations
* Library Study color/status calculations for now
* high-level composition

components/
* BookVocabIntroCopy
* BookVocabContextCard
* BookVocabFilterPanel
* BookVocabReorderHint
* BookVocabTableHeader
* BookVocabEmptyRow
* BookVocabMetadataBadge pieces
* BookVocabLibraryStageCell
* BookVocabActionsCell
* BookVocabRow
* BookVocabEditModalShell
* later: BookVocabEditForm

controller.ts
* future orchestration only, not first:
    * load vocab list for a book
    * save edits
    * hide/unhide/delete
    * reorder within group

service.ts
* future pure/app helper logic only, not first:
    * chapter display/key helpers
    * definition-choice normalization
    * repeat keying
    * study identity keying
    * filter/sort helpers
    * row view-model shaping

dao.ts
* future Supabase data access only, not first:
    * load book/access context
    * load user learning settings
    * load library summaries/progress
    * load `user_book_words`
    * update word
    * delete word
    * hide/unhide word
    * update page order

types.ts
* WordRow
* ProfileRole
* LearningSettingsRow
* GlobalEncounterRow
* LibraryWordSummaryRow
* LibraryWordProgressRow
* future component/view-model prop types if useful.

## Finished

- [✔️] Extracted `BookVocabIntroCopy`.
- [✔️] Extracted `BookVocabContextCard`.
- [✔️] Extracted `BookVocabFilterPanel`.
- [✔️] Extracted `BookVocabReorderHint`.
- [✔️] Extracted `BookVocabTableHeader`.
- [✔️] Extracted `BookVocabEmptyRow`.
- [✔️] Extracted `BookVocabTableShell`.
- [✔️] Extracted `BookVocabActionsCell`.
- [✔️] Extracted `BookVocabEditModalShell`.
- [✔️] Extracted `BookVocabKatakanaBadge`.
- [✔️] Extracted `BookVocabRepeatCountCell`.
- [✔️] Extracted `BookVocabChapterCell`.
- [✔️] Extracted `BookVocabPageCell`.
- [✔️] Extracted `BookVocabLibraryStageCell`.
- [✔️] Extracted `BookVocabLibraryStudyStatusBadge`.
- [✔️] Extracted `LoadingSigninStates`.
- [✔️] Extracted `EditWordFormBody`.
- [✔️] Extracted `WordTableRow`.

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass done / good stopping point`

This status fits because the first visual pass extracted the main render surfaces: intro copy, book context, filters, reorder hint, table shell/header/empty state, row/cell components, action cell, edit modal shell, edit form body, loading state, and sign-in state. The remaining page is now mostly route orchestration, access checks, Supabase loading, local state, filtering/sorting, drag/drop ordering, edit/hide/delete handlers, and Library Study color/status enrichment.

The previous tracker label can change from:

`Visual pass done / architecture deferred`

to:

`Visual pass done / good stopping point`

Current line count note:

The tracker row said the page was reduced to `1056` lines, but the current file is about `1147` lines. The count likely changed after later feature or cleanup work.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/books/[userBookId]/words/page.tsx | 1457 | 1147 | -310 |`

### 2. Readability Check

The page is easier to scan than before. The extracted components give names to the major visual areas, especially the context card, filter panel, table shell, table row, action cell, and edit modal/form.

The remaining page sections are understandable because they mostly follow the app workflow: load access/context, load words and study status, derive filtered/sorted rows, handle edits/reorder/delete/hide, then compose extracted components.

The only area that still feels visually heavy is the full-access locked fallback JSX. It is not large enough to justify another extraction right now, and it carries route/book copy that would add props for limited readability gain.

### 3. Remaining Code Classification

Remaining code is mostly behavior and architecture:

* access / ownership checks: current user loading, owner checks, and no-access handling.
* linked-teacher / super-teacher checks: profile role and linked-teacher access paths.
* full-access checks: feature access status and full-access locked fallback.
* Supabase loading: user book, profile, linked teacher, learning settings, library summaries/progress, and saved words.
* book/context loading: title, cover, owner/user book context.
* saved-word list loading: `user_book_words` rows for the selected `userBookId`.
* filtering/sorting/search behavior: query matching, hidden filter, chapter filter, and sorted output.
* page/chapter grouping behavior: chapter display/key helpers and page/chapter sort group behavior.
* edit saved-word behavior: edit state, meaning choices, definition switching, and save handler.
* delete saved-word behavior: delete handler and local list update.
* reorder/page-order behavior: drag/drop state, group-limited reorder, and `page_order` update.
* hide-kanji/reading-support behavior: edit form state and save payload.
* Library Study color/status behavior: global encounter counts, summary/progress rows, fallback count behavior, and display-only color enrichment.
* vocabulary cache / kanji-map context: cache surface/vocabulary cache ID are present as display/edit context, but kanji-map generation is not a main behavior here.
* UI state: query, chapter filter, hidden mode, editing modal state, drag/drop state, messages, and saving flags.
* derived values: repeat counts, global encounter counts, chapter options, filtered rows, sorted rows, study identity keys, and color statuses.
* helper functions: repeat keying, study identity keying, chapter display, normalization, global count loading, and definition helpers.
* visual JSX still in `page.tsx`: full-access locked fallback, access error fallback, high-level component composition, and row mapping.
* component composition: extracted components are wired together from page-owned state and handlers.
* legacy or suspicious code: line count is stale in tracker; `LibraryColorBadge` import should be checked later if unused; current `surface`/`reading` identity should be revisited only as part of the broader base-form/identity migration.

### 4. Visual Chunks Still Worth Extracting?

`BookVocabFullAccessLockedState`

* What JSX it owns: the full-access locked card, current-book mini card, and navigation buttons.
* Why it is safe or not safe: visually safe, but it needs copy, `bookTitle`, `userBookId`, and router callbacks. The gain is modest and it is not part of the normal loaded list UI.
* Risk level: low-medium.
* Recommendation: defer. It is not worth another extraction right now.

`BookVocabErrorState`

* What JSX it owns: non-access-denied error fallback and back-to-books button.
* Why it is safe or not safe: low-risk presentational JSX, but tiny.
* Risk level: low.
* Recommendation: defer. It will not materially improve readability.

`BookVocabRowMapper`

* What JSX it owns: the `filteredSorted.map` block and calculation of row props.
* Why it is safe or not safe: not safe for a first visual pass because it mixes derived values, Library Study status calculation, drag/drop handlers, and navigation/action handlers.
* Risk level: medium-high.
* Recommendation: defer to architecture cleanup, not visual extraction.

### 5. Prop Basket / Over-Extraction Check

No extracted component appears to have become too prop-heavy for the first pass. `BookVocabRow` and `BookVocabEditFormBody` naturally receive many props because they represent dense UI areas, but they still keep behavior in the page and make the render easier to scan.

No extraction appears to make the page harder to understand. Components should stay page-local for now because the table, actions, edit form, repeat counts, and Library Study status display are tightly tied to this book-vocab workflow.

Some pieces might eventually become shared, such as Library Study status badges or book-vocab action cells, but they should not be moved into shared components until similar pages stabilize.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred these boundaries:

* access checks remain in `page.tsx`.
* owner/private book checks remain in `page.tsx`.
* linked-teacher checks remain in `page.tsx`.
* full-access checks remain in `page.tsx`.
* Supabase queries remain in `page.tsx`.
* saved-word loading remains in `page.tsx`.
* edit/update behavior remains in `page.tsx`.
* delete behavior remains in `page.tsx`.
* reorder/page-order behavior remains in `page.tsx`.
* page/chapter behavior remains in `page.tsx`.
* hide-kanji behavior remains in `page.tsx`.
* Library Study color/status behavior remains in `page.tsx`.
* private saved-word data boundaries remain page-owned.
* navigation to word detail and Book Hub remains page-owned.

Nothing suspicious needs an immediate fix during this audit.

### 7. Architecture Deferred List

* shared types: defer because `WordRow` and related row types still mirror current Supabase payloads and local edit behavior.
* helper functions: defer until page/chapter, repeat, and study identity behavior has a stable shared home.
* access helpers: defer until the repeated owner/linked-teacher/super-teacher checks are centralized across private book routes.
* services/DAOs/controllers: defer because current Supabase loading, edit, delete, hide, and reorder behavior should not move during visual cleanup.
* repeated Supabase loading: defer until a broader private-book data loading pass.
* saved-word list service: defer because it touches private saved-word boundaries and hidden-word filtering.
* edit/delete saved-word service: defer because it is mutation-heavy and should be tested separately.
* reorder/page-order helper: defer because group-limited drag/drop behavior is easy to break.
* page/chapter grouping helper: defer until chapter naming/default behavior is reviewed across Add Word, Curiosity Reading, and Vocab List.
* Library Study color/status helper: defer because it spans summaries, progress rows, fallback counts, and display-only enrichment.
* shared book-vocab UI components: defer until the Teacher Lesson Book Prep and Vocab List visual models are both stable.

### 8. Browser Smoke Test Suggestions

Manual smoke test checklist:

* owner can open their own book vocab list.
* unauthorized user is blocked from another user's private book vocab list.
* full-access locked behavior still works if applicable.
* linked teacher/super-teacher access still works if intended.
* saved words load for the selected book only.
* empty state works for a book with no saved words.
* search/filter/sort works.
* hidden-word toggle works.
* chapter filter and chapter/page display work.
* edit saved word works, including meaning choice and hide-kanji/reading-support fields.
* delete saved word works.
* hide and unhide saved word works.
* reorder/page-order behavior works within the intended chapter/page group.
* Library Study color/status badges display correctly.
* navigation to word detail and Book Hub works.
* mobile-ish visual check for table/list rows, controls, and action buttons.

### 9. Final Recommendation

Stop visual thinning here.

This page reached a good first-pass stopping point. Further work should be behavior-aware cleanup or second-pass architecture planning, especially around access helper reuse, saved-word mutation services, page/chapter grouping, and Library Study identity/status logic.
