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

- [ ] B. Book context header card
1. Move: the clickable book cover/title/count card and `Book Hub` visual button.
2. Stay in `page.tsx`: `router.push`, `userBookId`, `bookTitle`, `bookCover`, `words.length`, `filteredSorted.length`.
3. Props needed:
    * bookTitle
    * bookCover
    * totalCount
    * visibleCount
    * onOpenBookHub
4. Type: presentational UI with one navigation callback.
5. Risk: low-medium.
Safe if navigation stays as a callback. Do not move router usage yet.

- [ ] C. Search and filter panel
1. Move: the rounded search/filter container with search input, hidden toggle, and chapter select.
2. Stay in `page.tsx`: `query`, `setQuery`, `showHidden`, `setShowHidden`, `chapterFilter`, `setChapterFilter`, `chapterOptions`, and all filter calculations.
3. Props needed:
    * query
    * onQueryChange
    * showHidden
    * onShowHiddenChange
    * chapterFilter
    * onChapterFilterChange
    * chapterOptions
4. Type: presentational UI with controlled inputs.
5. Risk: medium.
The JSX is isolated, but it owns controlled inputs that affect data reloading and filtering. Do after simpler display components.

- [ ] E. Loading / sign-in / error states
1. Move: simple loading, sign-in, and non-access-error return UIs.
2. Stay in `page.tsx`: branching decisions, `router.push`, `needsSignIn`, `errorMsg`, and `AccessDeniedMessage` usage at first.
3. Props needed:
    * message
    * onPrimaryAction for login/books navigation
4. Type: presentational UI with callbacks.
5. Risk: low-medium.
The UI is simple, but access-denied handling is security-sensitive. Keep the branching in `page.tsx`.

- [ ] F. Word metadata badges
1. Move: small repeated display pieces such as `KatakanaBadge`, repeat count cell content, chapter display snippet, and maybe definition-number display.
2. Stay in `page.tsx`: `chapterDisplayParts`, `repeatCounts`, `repeatKey`, and row mapping at first.
3. Props needed:
    * surface for katakana badge
    * repeat count
    * chapter display parts or word row
    * meaning choice index / meaning presence
4. Type: presentational UI.
5. Risk: low-medium.
Good once the table row is being prepared. Keep normalization and chapter helpers in `page.tsx` initially.

- [ ] G. Library stage cell
1. Move: the Library Study stage table cell, including `LibraryColorBadge` / `LibraryStudyStatusBadge` selection.
2. Stay in `page.tsx`: `computeLibraryStudyColorStatus`, `globalEncounterCounts`, `libraryProgressByKey`, `libraryColorByWordKey`, `learningSettings`, identity-key calculations, and fallback logic.
3. Props needed:
    * sharedColorInfo
    * fallbackStatus
    * showBadgeNumbers
    * encounterCount
4. Type: presentational UI.
5. Risk: medium.
It looks visual, but it reflects non-obvious Library Study rules. Extract only after row view-model values are computed in `page.tsx`.

- [ ] H. Word row action buttons
1. Move: `Open`, `Edit`, `Hide`/`Unhide`, and `Delete` buttons inside the actions cell.
2. Stay in `page.tsx`: router URL construction, `openEdit`, `hideWord`, `unhideWord`, `deleteWord`, and permission/role decisions if any are added later.
3. Props needed:
    * word
    * userBookId or prebuilt callbacks
    * onOpen
    * onEdit
    * onHide
    * onUnhide
    * onDelete
4. Type: presentational UI with action callbacks.
5. Risk: medium.
It is visually isolated, but the callbacks mutate database rows and must remain in `page.tsx`.

- [ ] J. Word table empty state
1. Move: the zero-results `<tr>`.
2. Stay in `page.tsx`: `filteredSorted.length` decision if preferred.
3. Props needed: none, or `colSpan`.
4. Type: presentational UI.
5. Risk: low.
Static table empty state.

- [ ] K. Word table row
1. Move: one `<tr>` for a word.
2. Stay in `page.tsx`: `filteredSorted.map`, drag state, drag/drop handlers, row view-model preparation, color status calculation, router navigation, edit/hide/delete handlers.
3. Props needed:
    * word
    * repeatCount
    * globalEncounterCount
    * sharedColorInfo
    * fallbackStatus
    * showBadgeNumbers
    * isDragging
    * isDropTarget
    * onDragStart
    * onDragOver
    * onDrop
    * onDragEnd
    * onOpen
    * onEdit
    * onHide
    * onUnhide
    * onDelete
4. Type: presentational UI with many callbacks.
5. Risk: medium-high.
Do not extract first. The row combines display, drag/drop, mutation actions, color logic, and repeated helper output.

- [ ] L. Word table shell
1. Move: table wrapper, table element, header, body slots, and maybe empty-state composition.
2. Stay in `page.tsx`: row mapping and all row calculations at first.
3. Props needed:
    * children or rendered rows
    * headerStickyStyle
4. Type: presentational layout.
5. Risk: medium.
Useful after header/empty-state/row pieces are clearer.

- [ ] M. Edit word modal shell
1. Move: modal frame, title area, close button, error placement, action footer.
2. Stay in `page.tsx`: `editing`, all edit state, `changeDefinition`, `saveEdit`, `closeEdit`, and all controlled inputs at first.
3. Props needed:
    * editing word
    * editErr
    * editSaving
    * onClose
    * onSave
    * children for form body
4. Type: presentational UI with callbacks.
5. Risk: medium.
The modal shell is safe, but the form body is controlled-input-heavy.

- [ ] N. Edit word form body
1. Move: all edit form labels/inputs/selects/checkboxes.
2. Stay in `page.tsx`: all state values and setters, `changeDefinition`, `parseNullableInt`, `saveEdit`, and patch construction.
3. Props needed:
    * editing
    * editSurface / setEditSurface
    * editReading / setEditReading
    * editMeaning / setEditMeaning
    * editJlpt / setEditJlpt
    * editPage / setEditPage
    * editChapterNum / setEditChapterNum
    * editChapterName / setEditChapterName
    * editMeaningChoices
    * editMeaningChoiceIndex
    * onDefinitionChange
    * editHideKanjiInReadingSupport / setEditHideKanjiInReadingSupport
4. Type: presentational UI with controlled inputs.
5. Risk: high.
Not an early extraction. Definition selection can overwrite meaning, and save payload behavior must stay exactly the same.

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
- [✔️] Extracted `ReorderStatusHint`.
- [✔️] Extracted `WordTableHeader`.
- [✔️] Extracted 
- [✔️] Extracted 
- [✔️] Extracted 
- [✔️] Extracted 
