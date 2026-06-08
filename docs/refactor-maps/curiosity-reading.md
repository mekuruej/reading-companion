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

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status label:

`Visual pass done / good stopping point`

This status fits because the first visual pass extracted the major visual surfaces: page header, book context card, status message, full-access state, timer panel, add/edit card shell, quick search row, word help panel, quick error, dictionary choices, detail fields, recent session words wrapper, and recent session word cards. The remaining page is now mostly access/data loading, timer/session behavior, word lookup/save behavior, vocabulary cache/kanji-map behavior, and wiring extracted components to local state.

The current tracker row can change from `Visual pass mostly done / architecture deferred` to `Visual pass done / good stopping point`.

Updated tracker row based on the current line count:

`- [x] Visual pass done / good stopping point | app/(protected)/books/[userBookId]/curiosity-reading/page.tsx | 1979 | 1425 | -554 |`

### 2. Readability Check

The page is easier to scan than before. The render branch now reads as a sequence of named components rather than one large form.

The extracted components are helping readability. The timer, quick search, dictionary choices, word details, word help, and recent word cards are all named in a way that makes the page easier to navigate.

The remaining page sections are understandable. The biggest remaining chunks are now behavior and callback wiring rather than raw visual layout.

The only remaining visually noisy area is the repeated recent-session detail logic for first visible cards, mobile details, and desktop details. It is understandable, but it repeats the same color lookup and card rendering pattern.

### 3. Remaining Code Classification

Access / ownership checks:
* current user lookup.
* profile/app access lookup.
* owner access.
* super-teacher access.
* linked-teacher access through `teacher_students`.
* access-denied render gate.

Full-access checks:
* feature access check for `curiosity_reading`.
* full-access-required render gate and navigation options.
* save-word guard when the viewer cannot use Curiosity Reading.

Supabase loading:
* current username/profile lookup.
* `user_books` ownership/context lookup.
* joined `books` title/cover lookup.
* latest reading session lookup.
* Library Study color lookup for quick preview/session words.

Book/context loading:
* route `userBookId`.
* effective `userBookId` state.
* book title and cover.
* stale query-param fallback copy still present when `userBookId` is missing.

Reading session / timer behavior:
* start/pause/resume/finish state.
* elapsed timer interval.
* before-unload warning.
* latest-session default start page.
* save-session validation.
* `user_book_reading_sessions` insert.
* `user_books` status/page update after saving.

Page/chapter/default behavior:
* `single-add-meta:${userBookId}` localStorage defaults.
* page/chapter preservation after saving/clearing.
* page-order calculation and preservation when editing within the same group.

Word lookup behavior:
* quick word input.
* Jisho API call through `/api/jisho`.
* dictionary candidate building.
* exact-match preference.
* candidate selection.
* kanji component lookup panel and scratch-word behavior.

Vocabulary save behavior:
* manual/dictionary distinction.
* insert/update decision for current-session words.
* `user_book_words` insert/update.
* recent-session word list update.
* delete saved session word.

Vocabulary cache behavior:
* dictionary-backed entries look up or insert `vocabulary_cache`.
* manual entries skip cache creation.
* cache identity uses surface/cache surface plus reading.

Vocabulary kanji-map generation behavior:
* after save, calls `/api/vocabulary-kanji-map/generate`.
* only when a cache row exists and the cache surface contains kanji.
* sends Supabase access token when available.

Session word list behavior:
* current-session saved words are stored in `quickSessionWords`.
* visible recent cards and details sections reuse `CuriosityRecentSessionWordCard`.
* Library Study color info is looked up by surface/reading key.

Edit/delete saved session word behavior:
* editing loads a recent session word back into `quickPreview`.
* deleting removes a `user_book_words` row and filters the item out locally.

iPad/lookup interaction behavior:
* `isSmallViewport` adjusts scroll offset to the word fields.
* refs focus the quick word input after actions.
* word-help scratch input suppresses Enter submit.

UI state:
* access and message state.
* quick lookup/loading/error state.
* form preview state.
* word-help open/scratch/reset state.
* timer/session state.
* saved notice state.

Derived values:
* quick preview Library Study color info.
* localStorage meta.
* normalized save payload values.
* page order.
* recent session color keys.

Helper functions:
* preview construction.
* timer formatting.
* nullable integer parsing.
* page/chapter grouping.
* Jisho candidate shaping.
* viewport and kanji helpers.
* cache/kanji-map API helper.

Visual JSX still in `page.tsx`:
* loading state shell.
* access denied component call.
* query-param fallback copy.
* component composition and callback wiring.
* repeated recent-session card maps/details.

Component composition:
* the active render path now mostly composes page-local components.
* behavior remains in `page.tsx`, which is correct for this pass.

Legacy or suspicious code:
* `username`, `hasFinishedTimer`, and `sortQuickSessionWords` still look unused.
* `upsertAndSortQuickSessionWords` name does not match behavior.
* query-param fallback copy looks stale for a route-param page.
* recent-session details still duplicate display patterns.

Overall, the remaining 1425 lines are mostly behavior/architecture rather than easy visual JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `CuriosityLoadingState`

What JSX it owns:
* loading shell that says "Loading book info..."

Why it is safe or not safe:
* Very safe. It is a small early state with no behavior.

Expected risk level:
* Low.

Do now or defer:
* Defer. It is too small to justify another pass by itself.

#### `CuriosityRecentSessionWordList`

What JSX it owns:
* first visible recent words.
* mobile details list.
* desktop details list.
* repeated color lookup and `CuriosityRecentSessionWordCard` mapping.

Why it is safe or not safe:
* This is the clearest remaining visual extraction. It would reduce repeated JSX, but it would need props for `quickSessionWords`, `libraryColorByWordKey`, edit/delete handlers, and key helper behavior.

Expected risk level:
* Low-medium.

Do now or defer:
* Defer unless recent-session display changes again. The page is readable enough now.

#### `CuriosityMainContent`

What JSX it owns:
* everything inside the main page after access gates.

Why it is safe or not safe:
* Not safe as a first-pass extraction. It would create a giant prop basket and hide orchestration.

Expected risk level:
* High.

Do now or defer:
* Defer.

#### `CuriosityWordFormCallbacks`

What JSX it owns:
* none; this would be a callback/view-model helper rather than visual JSX.

Why it is safe or not safe:
* Not a visual extraction. It belongs in architecture planning later.

Expected risk level:
* Medium-high.

Do now or defer:
* Defer to second-pass architecture.

### 5. Prop Basket / Over-Extraction Check

Some extracted components are necessarily prop-heavy, especially `CuriosityTimerPanel` and `CuriosityWordDetailFields`, but they remain understandable because they receive controlled form state and callbacks, not Supabase logic.

No extraction appears to have made the page harder to understand. The page now clearly separates presentation from save/session orchestration.

Components that should stay local and page-specific:
* `CuriosityTimerPanel`
* `CuriosityQuickSearchRow`
* `CuriosityWordHelpPanel`
* `CuriosityWordDetailFields`
* `CuriosityRecentSessionWords`
* `CuriosityRecentSessionWordCard`

Components that might eventually become shared, but should stay local for now:
* `CuriosityBookContextCard`
* `CuriosityStatusMessage`
* `CuriosityFullAccessRequired`
* `CuriosityAddEditWordCard`
* `CuriosityAddEditWordFormShell`

Do not move shared components yet. Add Word and Curiosity Reading now share visual ideas, but their behavior contracts are still different.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred:
* access checks.
* owner/private book checks.
* linked-teacher checks.
* full-access checks.
* Supabase queries.
* reading session creation/update behavior.
* timer behavior.
* page/chapter handling.
* Jisho lookup behavior.
* manual meaning behavior.
* `vocabulary_cache` lookup/insert behavior.
* `user_book_words` insert/update/delete behavior.
* `vocabulary_kanji_map` generation behavior.
* private saved-word data boundaries.
* navigation back to Book Hub / Vocab / Just Reading timer.

The extracted components own UI, inputs, and display surfaces. The page still owns all mutations, lookups, access decisions, and app-rule logic.

Suspicious, but not fixed here:
* stale `?userBookId=...` fallback copy.
* unused-looking timer/username helpers.
* recent-session duplicate display pattern.

### 7. Architecture Deferred List

Shared types:
* Defer because `QuickPreview`, `QuickSessionWord`, and `QuickLookupCandidate` still reflect page-specific behavior.

Helper functions:
* Defer because they encode page/chapter behavior, Jisho shaping, and save grouping rules.

Access helpers:
* Defer because owner/teacher/super-teacher access is privacy-sensitive and repeated across private book pages.

Services / DAOs / controllers:
* Defer because mutations and reads are interleaved with user-facing save/session behavior.

Repeated Supabase loading:
* Defer until private book access and shared book-page data loading are centralized intentionally.

Reading-session helpers:
* Defer because timer state, latest page defaults, session insert, and user-book update need behavior coverage.

Timer helpers:
* Defer because browser lifecycle and state transitions are easy to break.

Lookup helpers:
* Defer because Jisho candidate selection and exact-match behavior affect save results.

Vocabulary cache service:
* Defer because cache identity and manual-entry exceptions are app-rule logic.

Saved-word service:
* Defer because insert/update/delete behavior touches private saved-word rows and page-order logic.

Kanji-map generation service:
* Defer because API auth, cache IDs, and kanji detection should be preserved exactly.

Session-word edit/delete helpers:
* Defer because current-session display, edit preload, and delete mutation are tightly connected.

Page/chapter default helpers:
* Defer because Add Word and Curiosity Reading have similar but not identical storage/default behavior.

### 8. Browser Smoke Test Suggestions

Manual smoke checklist:
* Owner can open their own Curiosity Reading page.
* Unauthorized user is blocked from another user's private Curiosity Reading page.
* Full-access locked behavior still works if applicable.
* Linked teacher access still works if intended.
* Super-teacher access still works if intended.
* Reading timer starts, pauses, resumes, finishes, and saves correctly.
* Begin/end page validation works.
* Latest-session default start page works.
* Chapter/page defaults persist and refill correctly.
* Jisho lookup works with session token.
* Dictionary candidate selection fills the form.
* Manual word/meaning save works.
* Saved dictionary word gets a `vocabulary_cache_id` when expected.
* Manual entry skips `vocabulary_cache` when expected.
* Kanji-map generation runs for kanji-containing cached saved words.
* Saved session word list updates after save.
* Edit saved session word loads it into the form and saves update.
* Delete saved session word removes it from the session list and database.
* Hide-kanji/reading-support checkbox persists on saved word.
* Kanji component lookup/scratch word flow still works on mobile/iPad-ish layout.
* Navigation back to Book Hub / Vocab / Just Reading timer works.
* Empty/error states still work.

Do not run this smoke test during this doc-only audit unless specifically requested.

### 9. Final Recommendation

Recommendation:

Stop visual thinning here.

The first visual pass reached a good stopping point. Further work should move to second-pass architecture planning or targeted behavior cleanup. The only small visual extraction still worth considering later is a `CuriosityRecentSessionWordList`, but it is not necessary before behavior verification.
