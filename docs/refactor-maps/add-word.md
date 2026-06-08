# Add Word Refactor Map

No-code refactor map for:

`app/(protected)/books/[userBookId]/add-word/page.tsx`

## Current Page Purpose

This page is the single-word add/edit workflow for one user book.

It lets the user:
* open a book-specific Add Word form
* search Jisho for a word
* choose from dictionary candidates
* manually edit surface, reading, meaning, JLPT, common status, page, and chapter metadata
* use kanji component lookup to build a word
* save new words or update words saved during the current page session
* create or reuse `vocabulary_cache` rows for verified dictionary-backed kanji words
* generate `vocabulary_kanji_map` rows after saving vocabulary-cache-backed kanji words
* remember chapter defaults for the selected book
* hide kanji in Read Along support for a saved word
* see recently added words from the current page session
* see Library Study color/stage information for the current word and recent session words
* let super teachers save current word data to global cache or approve it for Word Sky
* navigate back to Book Hub or the book vocabulary list

The page displays and edits private/user-book data:
* selected `user_books` ownership and book context
* joined `books` title and cover
* current viewer profile, app access, feature access, and super-teacher status
* teacher/student access context
* `user_book_words` rows inserted, updated, or deleted during the current session
* `vocabulary_cache` rows for verified dictionary-backed vocabulary
* `vocabulary_kanji_map` generation through the API
* Library Study color/status enrichment for displayed words
* global word data through `/api/word-sky/approve` for super teachers

## Current Risks / Do Not Touch Yet

Do not move or change these in the first pass:
* access checks
* ownership checks
* teacher/student and super-teacher access logic
* feature access checks for `add_word`
* Supabase queries
* `handleLookup`
* `handleSave`
* `deleteSessionWord`
* `saveToGlobalWordData`
* `vocabulary_cache` lookup/insert behavior
* `vocabulary_kanji_map` generation behavior
* Jisho candidate parsing and exact-match behavior
* page/chapter tracking behavior
* page-order behavior
* localStorage chapter defaults
* Library Study color lookup behavior
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The first code changes should only move visual JSX into presentational components. Keep state, handlers, calculations, data loading, access/security logic, app-rule logic, and Supabase logic in `page.tsx`.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for now.

* `JishoChoice`: normalized dictionary result fields used by the form.
* `JishoCandidate`: `JishoChoice` plus render id for dictionary choice buttons.
* `SessionWord`: saved or edited word shown in the current-session list.

### 2. Constants

There are no file-level constants.

Page-local derived constants:
* `userBookId`: route param value.
* `isSuperTeacher`: derived from `superTeacherRole` and `profileIsSuperTeacher`.
* `currentColorSurface`: alternate surface when enabled, otherwise `word`.
* `currentLibraryColorInfo`: current word's Library Study color/stage info.
* localStorage key shape: `chapter_userBook_${userBookId}`.

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

File-level helpers:
* `normalizeJlpt`
* `extractMeaningChoices`
* `isExactJishoMatch`
* `buildJishoCandidates`
* `toNullableInt`
* `toDisplayString`
* `isSmallViewport`
* `hasKanji`
* `generateVocabularyKanjiMap`

Component-local helpers:
* `closeAndClearWordHelp`
* `clearKanjiLookupSelection`
* `canAccessUserBook`
* `prepareForNextWord`
* `jumpToWordFields`
* `clearForm`
* `applyJisho`
* `loadSessionWordIntoForm`
* `getNextPageOrder`
* `buildCurrentWordPayload`
* `sameGroup`

### 4. State

Book/access state:
* `bookTitle`
* `bookCover`
* `accessChecked`
* `canAccessBook`
* `canUseAddWord`
* `accessMessage`

Word form state:
* `word`
* `scratchWord`
* `alternateSurface`
* `useAlternateSurface`
* `reading`
* `meaning`
* `jlpt`
* `isCommon`
* `meaningChoices`
* `meaningChoiceIndex`
* `pageNumber`
* `chapterNumber`
* `chapterName`
* `hideKanjiInReadingSupport`

Word help / kanji lookup state:
* `isWordHelpOpen`
* `pickedKanji`
* `kanjiLookupResetKey`

Operation state:
* `lookupLoading`
* `saving`
* `message`
* `lookupCandidates`
* `savedNotice`

Super-teacher tool state:
* `superTeacherRole`
* `profileIsSuperTeacher`
* `superToolSaving`
* `superToolMessage`

Session list and display enrichment:
* `editingSessionWordId`
* `sessionWords`
* `libraryColorByWordKey`

Refs:
* `wordInputRef`
* `wordFieldsRef`

### 5. Data Loading

Keep all data loading in `page.tsx` for the first pass.

* Chapter defaults load from localStorage.
* Access/book load from auth, `profiles`, `user_books`, joined `books`, and `teacher_students`.
* Library Study color lookup through `fetchLibraryStudyColorInfoByWord`.
* Jisho lookup through `/api/jisho`.
* Super-teacher global word save through `/api/word-sky/approve`.
* Page-order lookup from `user_book_words`.

### 6. Access / Ownership Checks

Keep all access and ownership checks in `page.tsx`.

* Signed-in user check.
* Profile role and `is_super_teacher` lookup.
* App access status lookup.
* Feature access check for `add_word`.
* User book existence check.
* Owner access.
* Super-teacher access.
* Linked teacher/student access through `teacher_students`.
* Render gates for loading, no access, and full-access-required states.
* Save-time guards in `handleSave` for auth, book access, and feature access.

### 7. Save-Word Flow

Keep the full save-word flow in `page.tsx`.

Flow outline:
* clear message
* trim word, alternate surface, reading, and meaning
* require `userBookId`
* require word
* require alternate surface when alternate-surface mode is active
* require reading
* require meaning
* enter saving state
* load current auth user
* block save when signed out
* block save when the viewer cannot access the book
* block save when the viewer cannot use Add Word
* choose final surface from alternate surface or word
* detect verified dictionary match from `lookupCandidates`
* conditionally look up or insert `vocabulary_cache`
* normalize chapter/page/chapter name
* decide whether this is insert or update of a current-session word
* choose `page_order`, preserving it when page/chapter grouping did not change
* build `user_book_words` payload
* insert or update `user_book_words`
* shape returned row into `SessionWord`
* update `sessionWords`
* show saved notice
* generate vocabulary kanji map when a cache row exists and final surface has kanji
* clear form while preserving page/chapter location
* refocus for next word
* leave saving state

### 8. Vocabulary-Cache Behavior

Keep this behavior in `page.tsx` for the first pass.

Current behavior:
* cache is considered only when the final surface has kanji
* cache is considered only when the current form matches a verified dictionary candidate
* verified dictionary match requires matching surface, reading, and at least one meaning choice
* cache row is keyed by `surface` and `reading`
* existing cache row is reused
* missing cache row is inserted
* resulting `id` becomes `vocabulary_cache_id` on `user_book_words`
* manual or unverified words save without `vocabulary_cache_id`

Super-teacher cache behavior:
* `saveToGlobalWordData(false)` calls `/api/word-sky/approve`
* the API receives the current word payload and `approveForWordSky: false`
* this action updates global word data and does not have to save the word to the selected book

### 9. Vocabulary-Kanji-Map / Kanji-Map Generation Behavior

Keep this behavior in `page.tsx` for the first pass.

Current behavior:
* `generateVocabularyKanjiMap` calls `/api/vocabulary-kanji-map/generate`
* request body sends `vocabulary_cache_id`
* current Supabase access token is sent when available
* map generation happens after a successful word insert/update
* map generation only runs when `vocabularyCacheId` exists
* map generation only runs when `hasKanji(finalSurface)` is true

### 10. Page / Chapter Tracking Behavior

Keep page/chapter tracking in `page.tsx` for the first pass.

Current behavior:
* chapter defaults load from `localStorage` key `chapter_userBook_${userBookId}`
* chapter defaults save back to localStorage when chapter number or chapter name is present
* `clearForm(true)` preserves page, chapter number, and chapter name
* `clearForm(false)` clears page, chapter number, and chapter name
* `loadSessionWordIntoForm` loads saved page/chapter fields into the form
* `handleSave` converts page/chapter number through `toNullableInt`
* `chapter_name` is trimmed and saved as null when blank
* `getNextPageOrder` calculates next order inside the current chapter/page group
* editing an existing current-session word preserves page order when the group is unchanged
* changing page/chapter group while editing assigns a fresh page order

### 11. Derived Values

Keep derived values in `page.tsx` for now.

* `userBookId`
* `isSuperTeacher`
* `currentColorSurface`
* `currentLibraryColorInfo`
* inline `hasAnyChapterInfo` in the localStorage save effect
* inline `wordsToCheck` in the Library Study color effect
* inline candidate selected state in dictionary choices
* inline recent-word Library Study color lookups
* inline render-gate decisions from `accessChecked`, `canAccessBook`, and `canUseAddWord`

### 12. Event Handlers

Keep handler logic in `page.tsx` for the first pass. Presentational components should receive callbacks.

Handler groups:
* navigation to Book Hub, Vocab List, and Library
* rapid search form submit
* rapid search text input
* word help open/close
* scratch word input
* scratch word Enter suppression
* use scratch word
* kanji pick
* clear kanji selection
* dictionary candidate selection
* reading input
* alternate surface input and alternate-surface mode toggle
* meaning choice radio input
* custom meaning textarea
* page, chapter number, and chapter name inputs
* hide-kanji checkbox
* save word
* clear word fields
* super-teacher save to cache
* super-teacher save and approve for Word Sky
* edit recent session word
* delete recent session word

### 13. Render Sections

Render sections in order:
* loading state
* access denied state
* full-access-required state
* page header
* book context/navigation card
* top message
* add/edit word card
* rapid search form and current Library Study status
* word help / kanji lookup panel
* inline form message
* dictionary choices
* manual/detail fields
* meaning fields
* page/chapter fields
* hide-kanji checkbox
* save/clear actions
* super-teacher tools
* recently added session words
* mobile saved-word details section
* desktop saved-word details section

## First Pass: Visual / Presentational Extractions

### 1. `AddWordPageHeader`

What JSX it owns:
* top page title and description

What stays in `page.tsx`:
* all state, data, access checks, and handlers

Expected props:
* none, or `title` and `description` if the copy should be supplied by the page

Category:
* presentational UI

Risk level:
* very low

Suggested order:
* 1

### 2. `AddWordStatusMessage`

What JSX it owns:
* top-level message block and success/error styling

What stays in `page.tsx`:
* `message` state and all code that sets messages

Expected props:
* `message: string`

Category:
* presentational UI

Risk level:
* very low

Suggested order:
* 2

### 3. `AddWordBookContextCard`

What JSX it owns:
* book cover/title button
* "For book" label
* Vocab List and Book Hub buttons
* optional loading-book-info fallback can stay in page or be included

What stays in `page.tsx`:
* route construction
* `router.push` behavior
* access checks

Expected props:
* `bookTitle: string`
* `bookCover: string`
* `onOpenBookHub: () => void`
* `onOpenVocabList: () => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 3

### 4. `AddWordFullAccessRequired`

What JSX it owns:
* full-access-required card body
* current-book callout
* Back to Book Hub and Go to Library buttons

What stays in `page.tsx`:
* full-access render gate
* `getFullAccessRequiredCopy`
* route construction
* router callbacks
* access checks

Expected props:
* `title: string`
* `message: string`
* `bookTitle: string`
* `onBackToBookHub: () => void`
* `onGoToLibrary: () => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 4

### 5. `AddWordDictionaryChoices`

What JSX it owns:
* dictionary choices panel
* candidate buttons
* selected candidate visual styling
* candidate surface, reading, JLPT, and meaning display

What stays in `page.tsx`:
* candidate state
* `applyJisho`
* message setting
* `jumpToWordFields`

Expected props:
* `word: string`
* `reading: string`
* `meaning: string`
* `candidates: JishoCandidate[]`
* `onSelectCandidate: (candidate: JishoCandidate) => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 5

### 6. `AddWordRecentSessionWords`

What JSX it owns:
* "Recently added" section
* saved-this-session count
* visible recent word cards
* mobile saved-word details disclosure
* desktop saved-word details disclosure

What stays in `page.tsx`:
* `sessionWords` state
* edit handler
* delete handler
* Library Study color lookup map and keying behavior

Expected props:
* `words: SessionWord[]`
* `libraryColorByWordKey: Record<string, LibraryStudyWordColorInfo>`
* `onEditWord: (word: SessionWord) => void`
* `onDeleteWord: (id: string) => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 6

### 7. `AddWordRecentSessionWordCard`

What JSX it owns:
* individual recent-word display
* surface, reading, meaning
* optional page/chapter metadata
* optional Library Study badge
* Edit and Delete buttons

What stays in `page.tsx`:
* edit/delete behavior
* color lookup behavior

Expected props:
* `word: SessionWord`
* `colorInfo: LibraryStudyWordColorInfo | null`
* `showLocation?: boolean`
* `showLibraryBadge?: boolean`
* `className?: string`
* `onEdit: () => void`
* `onDelete: () => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 7, or as part of `AddWordRecentSessionWords`

### 8. `AddWordQuickSearchPanel`

What JSX it owns:
* Add/Edit Word section heading
* editing state shell and editing notice
* rapid search form
* word input
* Search button
* current Library Study status
* inline form message if desired

What stays in `page.tsx`:
* `word` state
* lookup behavior
* lookup candidate clearing
* saved notice clearing
* submit behavior
* word input ref
* current color derivation and Library Study lookup behavior

Expected props:
* `word: string`
* `editingSessionWordId: string | null`
* `lookupLoading: boolean`
* `message: string`
* `currentColorSurface: string`
* `reading: string`
* `currentLibraryColorInfo: LibraryStudyWordColorInfo | null`
* `wordInputRef: React.RefObject<HTMLInputElement | null>`
* `onWordChange: (value: string) => void`
* `onSubmitLookup: () => void`

Category:
* presentational UI

Risk level:
* medium-low

Suggested order:
* 8

### 9. `AddWordHelpPanel`

What JSX it owns:
* details/summary wrapper
* scratch word input
* "Use this word" button
* last picked kanji display
* "Use this kanji" button
* `KanjiComponentLookup` placement

What stays in `page.tsx`:
* details open state
* scratch word state
* picked kanji state
* reset key state
* handlers that mutate `word`, `scratchWord`, or lookup candidates

Expected props:
* `isOpen: boolean`
* `scratchWord: string`
* `pickedKanji: string`
* `kanjiLookupResetKey: number`
* `onToggleOpen: (open: boolean) => void`
* `onScratchWordChange: (value: string) => void`
* `onScratchWordKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void`
* `onUseScratchWord: () => void`
* `onClearPickedKanji: () => void`
* `onPickKanji: (kanji: string) => void`

Category:
* presentational UI

Risk level:
* medium

Suggested order:
* 9

### 10. `AddWordDetailFields`

What JSX it owns:
* manual entry hint
* reading input
* alternate surface input
* meaning choices radio list
* custom meaning textarea
* page input
* chapter number input
* chapter name input
* hide-kanji checkbox
* Save Word and Clear Word Fields buttons
* saved notice

What stays in `page.tsx`:
* controlled state updates
* `handleSave`
* `clearForm`
* `wordFieldsRef`
* save validation and mutation behavior

Expected props:
* `wordFieldsRef: React.RefObject<HTMLDivElement | null>`
* `reading: string`
* `alternateSurface: string`
* `meaning: string`
* `meaningChoices: string[]`
* `meaningChoiceIndex: number | null`
* `pageNumber: string`
* `chapterNumber: string`
* `chapterName: string`
* `hideKanjiInReadingSupport: boolean`
* `saving: boolean`
* `word: string`
* `savedNotice: string`
* callbacks for each field/action

Category:
* presentational UI

Risk level:
* medium

Suggested order:
* 10

### 11. `AddWordSuperTeacherTools`

What JSX it owns:
* super-teacher tools section
* cache-only button
* cache-plus-Word-Sky approval button
* super-tool status message

What stays in `page.tsx`:
* `isSuperTeacher` derivation
* `saveToGlobalWordData`
* payload building
* API call behavior
* `superToolSaving` and `superToolMessage` state

Expected props:
* `saving: "cache" | "wordSky" | null`
* `message: string`
* `onSaveCacheOnly: () => void`
* `onSaveAndApproveWordSky: () => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 11

## Curiosity Reading Reuse Notes

Some presentational components can likely be shared with Curiosity Reading after both pages have page-local visual components, but do not share them during the first Add Word extraction unless the prop contract is behavior-neutral.

Potentially safe to reuse with no behavior change:
* page header shell/copy component if it accepts copy props
* status message component
* book context card
* full-access-required card shell if button labels and callbacks are props
* word help / kanji lookup panel
* recent session words section/card

Not safe to directly reuse without careful prop shaping:
* dictionary choices, because Add Word displays JLPT and uses `defaultMeaning`, while Curiosity Reading uses `meaning` and custom-meaning flags
* word detail fields, because Add Word has JLPT/common/cache verification semantics and separate primitive state, while Curiosity Reading uses `QuickPreview`
* quick search panel, because Add Word uses a form submit and Curiosity Reading uses input keydown/button behavior
* save actions, because the save flows and vocabulary-cache conditions differ
* timer components, because Add Word has no timer

Recommended approach:
* First extract page-local `AddWord*` components.
* Compare them against `Curiosity*` components after both pages are visually thinned.
* Promote only purely presentational, prop-driven pieces to shared components.

## Original First-Pass Extraction Plan

Historical note: this was the original safe extraction order before the first visual pass was completed. These recommendations are no longer pending.

The suggested starting point was `AddWordPageHeader`.

It is the smallest and clearest low-risk visual extraction because it only owns static page copy. It does not touch access checks, Supabase queries, routing, Jisho lookup, save handlers, vocabulary cache behavior, kanji-map behavior, page/chapter behavior, refs, or controlled form state.

After that, extract `AddWordStatusMessage`, `AddWordBookContextCard`, `AddWordDictionaryChoices`, and `AddWordRecentSessionWords`. These give useful page-thinning value before touching the larger controlled form and word help panels.

## Later Architecture Refactor

Do not start these in the visual pass. They are listed only to show future destinations after presentational extraction is complete and behavior is covered.

### Access And Ownership Loading

Possible future files:
* `dao.ts`
* `service.ts`
* `controller.ts`

What might move later:
* current user/profile loading
* app access status lookup
* feature access mapping
* owner/super-teacher/linked-teacher checks
* book context loading

Why it should wait:
* this is security-sensitive and currently controls render gates and mutation permission checks.

### Supabase Query Organization

Possible future files:
* `dao.ts`
* `repository.ts`

What might move later:
* load profile
* load user book and joined book
* lookup/insert `vocabulary_cache`
* insert/update/delete `user_book_words`
* page-order lookup

Why it should wait:
* first pass should avoid changing query behavior, selected columns, error handling, write ordering, and access expectations.

### Add Word Save Orchestration

Possible future files:
* `controller.ts`
* `service.ts`

What might move later:
* validation
* verified dictionary match detection
* payload shaping
* page-order decision
* insert-vs-update orchestration
* session-list item shaping
* post-save cleanup decisions

Why it should wait:
* this is the highest mutation-risk area in the page.

### Vocabulary Cache And Kanji Map

Possible future files:
* `dao.ts`
* `service.ts`

What might move later:
* verified cache eligibility
* cache row lookup/creation
* kanji detection
* vocabulary kanji map API call

Why it should wait:
* cache identity and kanji-map generation are app-rule logic, not presentational concerns.

### Jisho Lookup And Candidate Shaping

Possible future files:
* `service.ts`
* `helpers.ts`

What might move later:
* exact-match filtering
* candidate deduping
* meaning extraction
* JLPT normalization

Why it should wait:
* first pass should not change lookup result selection or default form-fill behavior.

### Page / Chapter Tracking

Possible future files:
* page-local hook later
* `service.ts`
* `helpers.ts`

What might move later:
* localStorage chapter defaults
* page/chapter normalization
* page-order grouping helpers

Why it should wait:
* Add Word, Curiosity Reading, Vocab List, and Read Along all depend on page/chapter behavior, so this should be refactored only after the expected shared rules are clear.

### Super-Teacher Global Word Tools

Possible future files:
* `controller.ts`
* `service.ts`

What might move later:
* current word payload shaping
* API call orchestration
* status message handling

Why it should wait:
* this path updates global word data and has separate authorization expectations.

### Shared Types

Possible future file:
* `types.ts`

What might move later:
* `JishoChoice`
* `JishoCandidate`
* `SessionWord`
* future component prop types

Why it should wait:
* types can stay page-local until components or services require shared contracts.

## Suspicious / Possibly Unused Code

Do not remove in the first pass. Check behavior first.

* `useMemo` is imported but does not appear to be used.
* Several dictionary/Supabase paths use `any`; this may be fine temporarily, but it hides shape assumptions.
* The feature access comment says "For this first pass"; confirm whether it is still current product behavior.
* `useAlternateSurface` is only set from alternate surface input and reset paths; there is no explicit checkbox in the UI, despite save validation referencing alternate-surface mode.
* The "Use this kanji" button clears the picked kanji display. The kanji is already appended when selected, so the label may not match the action.
* `message` renders both as a top-level message and an inline form message, which can duplicate the same text.
* Desktop recent-word details use `sessionWords.slice(1)` while the first two words are already shown on desktop, so the second word may appear both in the visible list and desktop details.
* Mobile recent-word details use `sessionWords.slice(1)`, which matches the mobile behavior where the second visible card is hidden by `sm:block`; desktop and mobile behavior are intentionally different but easy to confuse.
* Mobile/desktop detail cards do not show Library Study badges even though `colorInfo` is calculated inside both maps.
* `buildCurrentWordPayload` is used only by super-teacher tools; changes there should not be assumed to affect normal save unless wired intentionally.
* `chapter_userBook_${userBookId}` localStorage naming differs from Curiosity Reading's `single-add-meta:${userBookId}` page/chapter storage.

## Suggested Status Labels

Use these labels for this page:
* Not started
* Visual pass in progress
* Visual pass mostly done
* Visual pass done / architecture deferred
* Visual pass done / good stopping point
* Architecture pass later
* Architecture pass in progress
* Architecture pass done

Recommended current status: `Visual pass done / good stopping point`.

Current tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/books/[userBookId]/add-word/page.tsx | 1706 | 1280 | -426 |`

The first visual pass is finished. The remaining work is behavior-aware cleanup or second-pass architecture planning, not more first-pass presentational thinning.

## Finished

First visual pass completed. Extracted page-local visual components:

* `AddWordPageHeader`
* `AddWordStatusMessage`
* `AddWordBookContextCard`
* `AddWordFullAccessRequired`
* `AddWordDictionaryChoices`
* `AddWordRecentSessionWordCard`
* `AddWordRecentSessionWords`
* `AddWordQuickSearchForm`
* `AddWordHelpPanel`
* `AddWordDetailFields`
* `AddWordSuperTeacherTools`
* `AddWordFormShell`
* `AddWordAddEditCard`

Remaining work is intentionally deferred to behavior-aware cleanup or second-pass architecture planning.

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status label:

`Visual pass done / good stopping point`

This status fits because the first-pass visual component extraction has now covered the major Add Word render surfaces:

* `AddWordPageHeader`
* `AddWordStatusMessage`
* `AddWordBookContextCard`
* `AddWordFullAccessRequired`
* `AddWordDictionaryChoices`
* `AddWordRecentSessionWordCard`
* `AddWordRecentSessionWords`
* `AddWordQuickSearchForm`
* `AddWordHelpPanel`
* `AddWordDetailFields`
* `AddWordSuperTeacherTools`
* `AddWordFormShell`
* `AddWordAddEditCard`

The current page is about 1280 lines, down from the tracker's original 1706. The tracker row's "now" count is slightly stale.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/books/[userBookId]/add-word/page.tsx | 1706 | 1280 | -426 |`

### 2. Readability Check

The page is easier to scan than before. The top-level return now reads as page composition: header, book context, status message, add/edit card, quick search, help panel, dictionary choices, detail fields, super-teacher tools, and recent session words.

The extracted components are helping readability because the page no longer carries the full JSX for the form fields, dictionary choice cards, recent word cards, and support panels inline.

The remaining page sections are understandable. Most of the remaining length is behavior and orchestration rather than obvious low-risk visual markup.

The most visually overwhelming remaining section is the recent-session word mapping near the bottom, but it is tied to mobile/desktop display differences, edit/delete callbacks, and Library Study badge enrichment. It is not worth forcing into another extraction unless the session-list behavior is cleaned up at the same time.

### 3. Remaining Code Classification

Remaining code is mostly behavior/architecture:

* access / ownership checks: signed-in user lookup, profile role lookup, owner/super-teacher/linked-teacher access check through `teacher_students`, render gates, and save-time access guards.
* full-access checks: app access status, feature access for `add_word`, full-access-required copy, and blocked save messaging.
* Supabase loading: book context, profile access, teacher/student relationship check, Library Study color lookup, page-order lookup, vocabulary cache lookup/insert, `user_book_words` insert/update/delete.
* book/context loading: `loadBookInfo`, `bookTitle`, `bookCover`, and access messages.
* Jisho lookup behavior: session token, `/api/jisho` call, dictionary candidate parsing, exact-match behavior, and candidate selection.
* manual word/meaning behavior: controlled word, reading, meaning, alternate surface, meaning choices, and custom meaning state.
* vocabulary cache lookup/insert/update behavior: verified dictionary-backed kanji words reuse or create `vocabulary_cache` rows.
* `user_book_words` insert/update/delete behavior: `handleSave`, `deleteSessionWord`, editing current-session words, and session-list updates.
* vocabulary kanji-map generation behavior: `generateVocabularyKanjiMap` after successful cache-backed kanji saves.
* page/chapter/default behavior: localStorage chapter defaults, page/chapter normalization, page order, and group-preserving edit behavior.
* saved session/current-page word list behavior: `sessionWords`, mobile/desktop detail disclosure, Library Study color badges, and edit/delete callbacks.
* edit/delete saved word behavior: `loadSessionWordIntoForm`, `deleteSessionWord`, editing state, and form reset behavior.
* alternative kanji/candidate behavior: alternate surface state, kanji component lookup, scratch word, lookup reset key, and dictionary candidates.
* UI state: loading, saving, messages, saved notice, help panel, lookup state, refs, and super-teacher tool state.
* derived values: `isSuperTeacher`, `currentColorSurface`, and `currentLibraryColorInfo`.
* helper functions: dictionary parsing, formatting, viewport/focus helpers, access helper, payload shaping, and page-order helper.
* visual JSX still in `page.tsx`: loading book info state, current library status pill, inline duplicate message near the form, and recent-session mapping/disclosures.
* component composition: imported `AddWord*` components with callbacks and controlled values passed down.
* legacy or suspicious code: stale first-pass comments, unused `useMemo` import, alternate-surface UI assumptions, message duplication, and recent-session desktop/mobile slice behavior.

The remaining 1280 lines are mostly behavior/data flow and page orchestration rather than easy visual JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `AddWordLoadingState`

What JSX it owns:

* the `!accessChecked` loading shell
* the fallback "Loading book info..." paragraph when the book title is not loaded

Why it is safe or not safe:

* Safe visually, but very small. It would not meaningfully improve the page.

Expected risk level:

* Low

Do now or defer:

* Defer. It is too small to justify another pass by itself.

#### `AddWordCurrentLibraryStatus`

What JSX it owns:

* the current library status pill beside the quick search form
* `LibraryColorBadge` display for current word/reading

Why it is safe or not safe:

* Mostly presentational, but it depends on Library Study color semantics and current surface/reading derivation. Extracting it would be reasonable only if the same status pill is reused elsewhere.

Expected risk level:

* Low-medium

Do now or defer:

* Defer. It is not a high-value extraction.

#### `AddWordInlineMessage`

What JSX it owns:

* the inline message shown inside the form

Why it is safe or not safe:

* Safe, but the page already has `AddWordStatusMessage` above the card. This should be reviewed as message behavior, not extracted as more UI.

Expected risk level:

* Low

Do now or defer:

* Defer. Clarify whether the duplicate message display is intended first.

#### `AddWordRecentSessionWordListBody`

What JSX it owns:

* the `sessionWords.slice(...)` maps
* mobile and desktop detail disclosures
* per-word Library Study color lookup before rendering `AddWordRecentSessionWordCard`

Why it is safe or not safe:

* This is the most obvious remaining visual chunk, but it has enough behavior-adjacent display rules that it could become a prop basket. It also contains the suspicious desktop/mobile slice behavior noted earlier.

Expected risk level:

* Medium

Do now or defer:

* Defer. Revisit only when cleaning up the session-list behavior.

### 5. Prop Basket / Over-Extraction Check

Some extracted components necessarily receive many controlled props, especially `AddWordDetailFields` and `AddWordHelpPanel`, but they still improve readability because they own coherent visual areas.

No extraction appears to make the page harder to understand. The page still clearly owns state, handlers, data loading, and save behavior.

Components that should stay local and page-specific for now:

* `AddWordDetailFields`
* `AddWordHelpPanel`
* `AddWordSuperTeacherTools`
* `AddWordRecentSessionWords`
* `AddWordRecentSessionWordCard`

Components that might eventually become shared, but should stay local for now:

* status message/banner components
* book context card shell
* dictionary choice list/card
* recent session word card shape
* full-access-required shell

Do not promote these to shared components until Add Word, Curiosity Reading, and any future Teacher Prep word-entry flows have stable prop contracts.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred these boundaries:

* access checks remain in `page.tsx`
* owner/private book checks remain in `page.tsx`
* linked-teacher checks remain in `page.tsx`
* full-access checks remain in `page.tsx`
* Supabase queries remain in `page.tsx`
* Jisho lookup behavior remains in `handleLookup`
* manual meaning behavior remains in page state and handlers
* meaning-choice behavior remains in page state and handlers
* `vocabulary_cache` lookup/insert behavior remains in `handleSave`
* `user_book_words` insert/update/delete behavior remains in `handleSave` and `deleteSessionWord`
* `vocabulary_cache_id` assignment behavior remains in `handleSave`
* `vocabulary_kanji_map` generation remains in `generateVocabularyKanjiMap` and post-save logic
* page/chapter defaults remain in localStorage effects and save helpers
* localStorage chapter defaults remain page-local
* private saved-word data boundaries remain guarded by access checks and `user_book_id` filters
* navigation back to Book Hub and Vocab List remains page-owned

Suspicious but not fixed:

* `message` renders both above the add/edit card and inside the form.
* Desktop recent-session details appear to use `sessionWords.slice(1)` even though two cards can already be visible on desktop.
* `useAlternateSurface` is controlled by alternate surface text rather than an obvious explicit checkbox.
* The feature-access comment still says "For this first pass."

### 7. Architecture Deferred List

* shared types: defer until multiple pages need the same `JishoChoice`, `JishoCandidate`, or `SessionWord` contracts.
* helper functions: defer because dictionary parsing, page-order, and access helpers are behavior-sensitive.
* access helpers: defer until Book Hub, Add Word, Curiosity Reading, Study, Vocab List, and teacher access rules are centralized together.
* services/DAOs/controllers: defer because save ordering and access checks are still tightly coupled in this page.
* repeated Supabase loading: defer until shared user-book access and vocabulary save services are designed.
* Jisho lookup service: defer because candidate parsing and exact-match behavior still need careful testing, especially same-surface/different-reading cases.
* vocabulary cache service: defer because cache identity affects `vocabulary_cache_id`, global data, and kanji-map generation.
* saved-word service: defer because insert/update/delete interacts with page order, chapter/page defaults, and session list state.
* kanji-map generation service: defer because API auth, cache identity, and post-save timing are behavior-sensitive.
* page/chapter default helpers: defer because Add Word and Curiosity Reading use different localStorage key patterns.
* edit/delete saved-word helpers: defer because current-session editing is not the same as general Vocab List editing.
* meaning-choice helpers: defer until dictionary candidate identity and selected-definition rules are stable.

### 8. Browser Smoke Test Suggestions

Manual checklist for later implementation work:

* owner can open their own Add Word page
* unauthorized user is blocked from another user's private Add Word page
* full-access locked behavior still works if applicable
* linked teacher/super-teacher access still works if intended
* Jisho lookup works for a normal word
* Jisho lookup works for same-surface/different-reading words such as `市`
* manual word/meaning save works
* saved word gets a `vocabulary_cache_id` when expected
* manual/unverified saved word can save without a `vocabulary_cache_id`
* kanji-map generation works for kanji-containing cache-backed saved words
* alternate surface/candidate behavior works if present
* page number save works
* chapter number/name save works
* default page/chapter behavior persists and reloads
* saved word appears in the saved/session list
* editing a saved session word works
* deleting a saved session word works
* duplicate or duplicate-like word behavior still works if present
* Library Study color/status badge displays for current and recent words
* super-teacher cache-only save works for authorized users
* super-teacher Word Sky approval works for authorized users
* navigation back to Book Hub and Vocab List works
* mobile/iPad-ish layout still looks usable
* empty/error states still work

Do not run browser tests unless explicitly asked.

### 9. Final Recommendation

Stop visual thinning here.

The first visual pass has reached a good stopping point. One more tiny extraction would not meaningfully improve maintainability, and the remaining high-line-count areas are mostly access, lookup, save, cache, page/chapter, and current-session behavior.

Next useful work should be either:

* behavior-aware cleanup of suspicious session-list/message/alternate-surface details, or
* second-pass architecture planning for access, Jisho lookup, vocabulary cache, saved-word writes, and page/chapter helpers.
