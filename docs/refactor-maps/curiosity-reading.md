# Curiosity Reading Refactor Map

No-code refactor map for:

`app/(protected)/books/[userBookId]/curiosity-reading/page.tsx`

## Current Page Purpose

This page supports a slower, lookup-heavy reading mode for one user book.

It lets the user:
* open a book-specific curiosity reading workspace
* run a reading timer while stopping to investigate words
* save a timed curiosity reading session
* search Jisho for a word
* use kanji component lookup to build a word
* choose between dictionary candidates
* manually edit surface, reading, meaning, page, and chapter metadata
* save new words or update words saved during the current page session
* create or reuse `vocabulary_cache` rows for dictionary-backed words
* generate `vocabulary_kanji_map` rows after saving kanji vocabulary
* see recent words saved during the current session
* see Library Study color/stage information for the current preview and recent session words
* navigate back to Book Hub or the book vocabulary list

The page displays and edits private/user-book data:
* selected `user_books` ownership and book context
* joined `books` title and cover
* current viewer profile and feature access
* teacher/student access context
* `user_book_words` rows inserted, updated, or deleted during the current session
* `vocabulary_cache` rows for dictionary-backed vocabulary
* `vocabulary_kanji_map` generation through the API
* `user_book_reading_sessions` rows created when saving the timer
* `user_books` reading status updates after saving a timer session
* Library Study color/status enrichment for displayed words

## Current Risks / Do Not Touch Yet

Do not move or change these in the first pass:
* access checks
* ownership checks
* teacher/student and super-teacher access logic
* feature access checks for `curiosity_reading`
* Supabase queries
* `saveQuickWord`
* `deleteQuickWordById`
* `pullQuickWord`
* `vocabulary_cache` lookup/insert behavior
* `vocabulary_kanji_map` generation behavior
* timer/session state transitions
* reading-session insert behavior
* `user_books` status update after saving a reading session
* latest reading-session lookup used for default start page
* page/chapter tracking behavior
* page-order behavior
* localStorage quick meta behavior
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The first code changes should only move visual JSX into presentational components. Keep state, handlers, calculations, data loading, access/security logic, app-rule logic, and Supabase logic in `page.tsx`.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for now.

* `QuickPreview`: current add/edit form preview state, including dictionary metadata, page/chapter metadata, alternate surface, and current row id when editing.
* `QuickSessionWord`: saved or edited word shown in the current-session list.
* `QuickLookupCandidate`: Jisho result option shown in the dictionary choices panel.

### 2. Constants

There are no file-level constants.

Page-local derived constants:
* `routeUserBookId`: route param value.
* `quickMetaStorageKey`: localStorage key for page/chapter defaults.

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

File-level helpers:
* `makeBlankQuickPreview`
* `formatTimer`
* `toNullableInt`
* `sameGroup`
* `sortQuickSessionWords`
* `upsertAndSortQuickSessionWords`
* `extractQuickMeanings`
* `isExactQuickLookupMatch`
* `buildQuickLookupCandidates`
* `isSmallViewport`
* `hasKanji`
* `generateVocabularyKanjiMap`

Component-local helpers:
* `closeAndClearWordHelp`
* `clearKanjiLookupSelection`
* `canAccessUserBook`
* `prepareForNextQuickWord`
* `jumpToQuickWordFields`
* `getSavedQuickMeta`
* `saveQuickMeta`
* `clearQuickWordFields`
* `getNextPageOrder`
* `loadQuickSessionWordIntoPreview`

### 4. State

Route/book/access state:
* `userBookId`
* `username`
* `bookTitle`
* `bookCover`
* `message`
* `accessChecked`
* `canAccessBook`
* `canUseCuriosityReading`
* `accessMessage`

Quick word state:
* `quickLoading`
* `quickError`
* `hideKanjiInReadingSupport`
* `isWordHelpOpen`
* `pickedKanji`
* `scratchWord`
* `kanjiLookupResetKey`
* `quickPreview`
* `quickSessionWords`
* `libraryColorByWordKey`
* `quickLookupCandidates`
* `savedQuickNotice`

Refs:
* `quickWordInputRef`
* `quickWordFieldsRef`

Timer/session state:
* `isRunning`
* `isPaused`
* `startTime`
* `elapsed`
* `showTimedSessionForm`
* `timerSaveMessage`
* `hasFinishedTimer`
* `sessionStartPage`
* `sessionEndPage`

### 5. Data Loading

Keep all data loading in `page.tsx` for the first pass.

* Current username load from `supabase.auth.getUser()` and `profiles`.
* Access/book load from auth, `profiles`, `user_books`, `teacher_students`, and `books`.
* Library Study color lookup through `fetchLibraryStudyColorInfoByWord`.
* Jisho lookup through `/api/jisho`.
* Latest reading-session lookup from `user_book_reading_sessions` when opening the timer save form.

### 6. Access / Ownership Checks

Keep all access and ownership checks in `page.tsx`.

* Signed-in user check.
* Profile role and app access status lookup.
* Feature access check for `curiosity_reading`.
* User book existence check.
* Owner access.
* Super-teacher access.
* Linked teacher/student access through `teacher_students`.
* Render gates for loading, no access, and full-access-required states.

### 7. Save-Word Flow

Keep the full save-word flow in `page.tsx`.

Flow outline:
* require `userBookId` and a non-empty surface
* block save when the viewer cannot access the book
* block save when the viewer cannot use Curiosity Reading
* normalize selected meaning, surface, cache surface, reading, chapter, page, and chapter name
* skip `vocabulary_cache` for manual entries
* look up or insert `vocabulary_cache`
* determine whether this is an insert or update of a current-session word
* choose `page_order`, preserving it when page/chapter grouping did not change
* insert or update `user_book_words`
* update `quickSessionWords`
* show saved notice
* generate vocabulary kanji map when a cache row exists and the cache surface has kanji
* clear form while preserving page/chapter defaults
* refocus for next word

### 8. Reading-Session / Timer Flow

Keep timer and reading-session behavior in `page.tsx`.

Flow outline:
* start sets `startTime`, resets elapsed, and enters running state
* interval updates `elapsed` once per second while running
* pause captures elapsed and moves to paused state
* resume reconstructs `startTime` from elapsed
* finish captures elapsed and opens the session save form
* before-unload warning is active while running or paused
* save-session form can prefill start page from latest saved session end page plus one
* `saveReadingSession` validates pages, inserts `user_book_reading_sessions`, updates `user_books`, resets timer/form state, and shows a short success message

### 9. Kanji-Map / Vocabulary-Cache Behavior

Keep this behavior in `page.tsx` for the first pass.

Vocabulary cache:
* only used when the entry is not manual
* keyed by `surface` and `reading`
* existing row is reused
* missing row is inserted
* resulting `id` becomes `vocabulary_cache_id` on `user_book_words`

Kanji map:
* generated after saving the word
* only runs when `vocabularyCacheId` exists
* only runs when `hasKanji(normalizedCacheSurface)` is true
* uses `/api/vocabulary-kanji-map/generate`
* sends the current Supabase access token when available

### 10. Derived Values

Keep derived values in `page.tsx` for now.

* `routeUserBookId`
* `quickMetaStorageKey`
* `quickPreviewLibraryColorInfo`
* inline `hasAnyLocation` in the localStorage meta effect
* inline `wordsToCheck` in the Library Study color effect
* inline candidate selection state in the dictionary choices render
* inline recent-word Library Study color lookups
* inline timer button visibility from `isRunning` and `isPaused`
* inline render-gate decisions from `accessChecked`, `canAccessBook`, and `canUseCuriosityReading`

### 11. Event Handlers

Keep handler logic in `page.tsx` for the first pass. Presentational components should receive callbacks.

Handler groups:
* navigation to Book Hub, Vocab List, and Just Reading Timer
* timer start, pause, finish, resume, cancel, and save
* quick search text input
* quick search Enter key
* search button click
* word help open/close
* scratch word input
* scratch word Enter suppression
* use scratch word
* kanji pick
* clear kanji selection
* candidate selection
* reading input
* alternate surface input
* meaning choice radio input
* custom meaning textarea
* page, chapter number, and chapter name inputs
* hide-kanji checkbox
* save word
* clear word fields
* edit recent word
* delete recent word

### 12. Render Sections

Render sections in order:
* loading state
* access denied state
* full-access-required state
* page header
* book context/navigation card
* message
* timer/session card
* add/edit word card
* rapid search row and current Library Study status
* word help / kanji lookup panel
* quick error
* dictionary choices
* manual/detail fields
* meaning fields
* page/chapter fields
* hide-kanji checkbox
* save/clear actions
* recently added session words
* mobile and desktop saved-word details sections

## First Pass: Visual / Presentational Extractions

### 2. `CuriosityStatusMessage`

What JSX it owns:
* message block and success/error text color selection

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

### 3. `CuriosityBookContextCard`

What JSX it owns:
* book cover/title card
* "For book" label
* Vocab List and Book Hub buttons

What stays in `page.tsx`:
* route construction
* `router.push` behavior
* missing `userBookId` fallback behavior

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

### 4. `CuriosityFullAccessRequired`

What JSX it owns:
* full-access-required card body
* current-book callout
* Back to Book Hub and Use Just Reading Timer buttons

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
* `onUseJustReadingTimer: () => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 4

### 5. `CuriosityDictionaryChoices`

What JSX it owns:
* dictionary choices panel
* candidate buttons
* selected candidate visual styling

What stays in `page.tsx`:
* candidate list state
* selected candidate application
* `jumpToQuickWordFields`
* quick error state

Expected props:
* `surface: string`
* `candidates: QuickLookupCandidate[]`
* `selectedSurface: string`
* `selectedReading: string`
* `selectedMeaning: string`
* `onSelectCandidate: (candidate: QuickLookupCandidate) => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 5

### 6. `CuriosityRecentSessionWords`

What JSX it owns:
* "Recently added" section
* saved-this-session count
* visible recent word cards
* mobile saved-word details disclosure
* desktop saved-word details disclosure

What stays in `page.tsx`:
* `quickSessionWords` state
* edit handler
* delete handler
* Library Study color lookup map and keying behavior

Expected props:
* `words: QuickSessionWord[]`
* `libraryColorByWordKey: Record<string, LibraryStudyWordColorInfo>`
* `onEditWord: (word: QuickSessionWord) => void`
* `onDeleteWord: (id: string) => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 6

### 7. `CuriosityRecentSessionWordCard`

What JSX it owns:
* individual recent-word display
* surface, reading, meaning
* optional page/chapter metadata
* Library Study badge
* Edit and Delete buttons

What stays in `page.tsx`:
* edit/delete behavior
* color lookup behavior

Expected props:
* `word: QuickSessionWord`
* `colorInfo: LibraryStudyWordColorInfo | null`
* `showLocation?: boolean`
* `className?: string`
* `onEdit: () => void`
* `onDelete: () => void`

Category:
* presentational UI

Risk level:
* low

Suggested order:
* 7, or as part of `CuriosityRecentSessionWords`

### 8. `CuriosityTimerPanel`

What JSX it owns:
* timer card shell
* start/pause/finish/resume buttons
* elapsed display
* save-session form
* active timer warning
* timer save message

What stays in `page.tsx`:
* all timer state
* all timer transitions
* latest-session default lookup
* session validation
* `saveReadingSession`
* `formatTimer` helper for now

Expected props:
* `isRunning: boolean`
* `isPaused: boolean`
* `elapsed: number`
* `showTimedSessionForm: boolean`
* `sessionStartPage: string`
* `sessionEndPage: string`
* `timerSaveMessage: string`
* `formatTimer: (seconds: number) => string`
* `onStart: () => void`
* `onPause: () => void`
* `onFinish: () => void`
* `onResume: () => void`
* `onSaveSession: () => void`
* `onCancelSession: () => void`
* `onSessionStartPageChange: (value: string) => void`
* `onSessionEndPageChange: (value: string) => void`

Category:
* presentational UI

Risk level:
* medium-low

Suggested order:
* 8

### 9. `CuriosityQuickSearchPanel`

What JSX it owns:
* Add/Edit Word section header
* editing state highlight shell
* rapid search label/help copy
* rapid search input and Search button
* current Library Study status badge
* quick error block if desired

What stays in `page.tsx`:
* `quickPreview` state
* search behavior
* input ref
* candidate clearing
* saved notice clearing
* Library Study color lookup behavior

Expected props:
* `quickPreview: QuickPreview`
* `quickLoading: boolean`
* `quickError: string | null`
* `quickPreviewLibraryColorInfo: LibraryStudyWordColorInfo | null`
* `quickWordInputRef: React.RefObject<HTMLInputElement | null>`
* `onSurfaceChange: (value: string) => void`
* `onSearch: () => void`
* `onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void`

Category:
* presentational UI

Risk level:
* medium-low

Suggested order:
* 9

### 10. `CuriosityWordHelpPanel`

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
* handlers that mutate quick preview or scratch word

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
* 10

### 11. `CuriosityWordDetailFields`

What JSX it owns:
* manual entry hint
* reading input
* alternate surface input
* meaning radio list
* custom meaning textarea
* page input
* chapter number input
* chapter name input
* hide-kanji checkbox
* Save Word and Clear Word Fields buttons
* saved notice

What stays in `page.tsx`:
* `quickPreview` state updates
* `hideKanjiInReadingSupport` state updates
* `saveQuickWord`
* `clearQuickWordFields`
* `quickWordFieldsRef`

Expected props:
* `quickPreview: QuickPreview`
* `hideKanjiInReadingSupport: boolean`
* `savedQuickNotice: string`
* `quickWordFieldsRef: React.RefObject<HTMLDivElement | null>`
* `onReadingChange: (value: string) => void`
* `onAlternateSurfaceChange: (value: string) => void`
* `onMeaningChoiceChange: (index: number, meaning: string) => void`
* `onCustomMeaningChange: (value: string) => void`
* `onPageChange: (value: string) => void`
* `onChapterNumberChange: (value: string) => void`
* `onChapterNameChange: (value: string) => void`
* `onHideKanjiChange: (checked: boolean) => void`
* `onSaveWord: () => void`
* `onClearWordFields: () => void`

Category:
* presentational UI

Risk level:
* medium

Suggested order:
* 11

## Recommended First Extraction

Start with `CuriosityPageHeader`.

It is the smallest and clearest low-risk extraction because it only owns static page copy. It does not touch access checks, Supabase queries, routing, timers, save handlers, vocabulary cache behavior, kanji-map behavior, page/chapter behavior, refs, or controlled form state.

After that, extract `CuriosityStatusMessage`, `CuriosityBookContextCard`, `CuriosityDictionaryChoices`, and `CuriosityRecentSessionWords`. These give meaningful page-thinning value before touching the larger controlled form and timer panels.

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
* load user book
* load book details
* load latest reading session
* insert/update/delete `user_book_words`
* insert `user_book_reading_sessions`
* update `user_books`
* lookup/insert `vocabulary_cache`

Why it should wait:
* first pass should avoid changing query behavior, selected columns, error handling, and write ordering.

### Quick Word Save Orchestration

Possible future files:
* `controller.ts`
* `service.ts`

What might move later:
* payload shaping
* page-order decision
* insert-vs-update orchestration
* session-list item shaping
* post-save cleanup decisions

Why it should wait:
* this flow is the highest mutation-risk area in the page.

### Vocabulary Cache And Kanji Map

Possible future files:
* `dao.ts`
* `service.ts`

What might move later:
* cache row lookup/creation
* kanji detection
* vocabulary kanji map API call

Why it should wait:
* cache identity and kanji-map generation are app-rule logic, not presentational concerns.

### Timer And Reading Session

Possible future files:
* page-local hook later
* `controller.ts`
* `service.ts`

What might move later:
* timer transitions
* elapsed-to-minutes conversion
* latest end-page default
* reading-session validation
* session insert and user-book update orchestration

Why it should wait:
* timer behavior depends on browser lifecycle, multiple related state flags, and save/reset ordering.

### Shared Types

Possible future file:
* `types.ts`

What might move later:
* `QuickPreview`
* `QuickSessionWord`
* `QuickLookupCandidate`
* future component prop types

Why it should wait:
* types can stay page-local until components or services require shared contracts.

### Shared Reading Components

Possible future placement:
* app-level reading components
* book-page local components

What might become shared later:
* book context card
* timer panel
* status message
* loading shell

Why it should wait:
* Read Along, Just Reading, Curiosity Reading, and other reading modes have similar shapes but different rules and session modes.

## Suspicious / Possibly Unused Code

Do not remove in the first pass. Check behavior first.

* `username` is loaded and stored but does not appear to be used by the render or handlers.
* `hasFinishedTimer` is set but does not appear to be read.
* `sortQuickSessionWords` appears unused.
* `upsertAndSortQuickSessionWords` does not sort despite its name.
* Several dictionary/Supabase paths use `any`; this may be fine temporarily, but it hides shape assumptions.
* The missing `userBookId` fallback mentions `?userBookId=...`, which looks stale for a route-param page.
* Recent session word card JSX is repeated across the visible, mobile details, and desktop details sections.
* The "Use this kanji" button clears the picked kanji display. The kanji is already appended when selected, so the label may not match the action.
* `quickMetaStorageKey` uses `single-add-meta:${userBookId}`, which may be legacy naming from another add-word flow.
* The comment inside feature access says "For this first pass"; confirm whether it is still current product behavior.

## Suggested Status Labels

Use these labels for this page:

* Not started
* Visual pass in progress
* Visual pass mostly done / architecture deferred
* Visual pass done / architecture deferred
* Architecture pass later
* Architecture pass in progress
* Architecture pass done

Recommended current status: `Visual pass mostly done / architecture deferred`.

Current tracker row:

Visual pass mostly done / architecture deferred | `app/(protected)/books/[userBookId]/curiosity-reading/page.tsx` | 1979 | 1435 | -544 |

This means the safe visual/page-thinning layer has mostly been completed, and deeper controller/service/DAO/helper cleanup is intentionally saved for later.

## Finished

Finished:

* Extracted `CuriosityPageHeader`
* Extracted `CuriosityStatusMessage`
* Extracted `CuriosityBookContextCard`
* Extracted `CuriosityDictionaryChoices`
* Extracted `CuriosityRecentSessionWordCard`
* Extracted `CuriosityRecentSessionWords`
* Extracted `CuriosityFullAccessRequired`
* Extracted `CuriosityTimerPanel`
* Extracted `CuriosityQuickSearchRow`
* Extracted `CuriosityWordHelpPanel`
* Extracted `CuriosityQuickErrorMessage`
* Extracted `CuriosityWordDetailFields`
* Extracted `CuriosityAddEditWordFormShell`
* Extracted `CuriosityAddEditWordCard`

Still intentionally deferred:

* access checks
* ownership checks
* Supabase queries
* `saveQuickWord`
* `deleteQuickWordById`
* `pullQuickWord`
* `vocabulary_cache` lookup/insert behavior
* `vocabulary_kanji_map` generation behavior
* timer/session save behavior
* page/chapter tracking behavior
* page-order behavior
* localStorage quick meta behavior
* suspicious/possibly unused code cleanup

Notes:

* The visual pass reduced the page from 1979 lines to 1435 lines.
* The remaining work should be treated as architecture/refactor-later work, not part of the first visual extraction pass.
* Do not remove suspicious code yet without behavior testing.
