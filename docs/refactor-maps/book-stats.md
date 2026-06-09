# Book Stats Refactor Map

No-code refactor map for:

`app/(protected)/books/[userBookId]/stats/page.tsx`

Current size: about 788 lines.

## Current Page Purpose

This page is a read-only stats view for one private `user_book`.

It lets an allowed viewer:
* open a book's stats from its private Book Hub
* see reading/listening progress, pace, time by mode, saved-word count, and difficulty comparison
* compare the book's difficulty rating against the owner's other rated books of the same type
* navigate back to the Book Hub or Vocab List

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks
* ownership checks
* teacher/student permission checks
* Supabase queries
* reading-session loading logic
* word-count loading logic
* difficulty comparison loading logic
* stats calculations
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `Book`: joined global book display fields.
* `UserBook`: private user-book row, owner ID, reading status, difficulty rating, and joined `books`.
* `ReadingSession`: private reading/listening session row used for progress and pace stats.
* `ComparisonBook`: owner-owned comparison row for difficulty neighborhood calculation.

### 2. Constants

There are no obvious file-level constants yet.

Potential constants to introduce later, after visual extraction:
* book type labels currently embedded in `bookTypeLabel`
* difficulty label text currently embedded in `difficultyText`
* difficulty neighborhood thresholds and copy currently embedded in `difficultyNeighborhood`

Do not extract these during the first visual pass.

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

File-level helpers:
* `formatMinutes`
* `bookTypeLabel`
* `statusLabel`
* `difficultyText`
* `difficultyNeighborhood`

Page-local visual helper currently present:
* `StatCard`

### 4. State

Access/loading:
* `loading`
* `errorMessage`
* `accessChecked`
* `canAccessBook`
* `accessMessage`

Loaded data:
* `row`
* `sessions`
* `wordCount`
* `comparisonBooks`

There is no word edit/save/delete state on this page.

### 5. Data Loading

Keep all data loading in `page.tsx`.

Auth/access load:
* `supabase.auth.getUser()`
* current viewer `profiles` row for `role` and `is_super_teacher`
* target `user_books` row and joined book fields
* linked-teacher check through `teacher_students`

Stats load:
* `user_book_reading_sessions` for the current `userBookId`
* `user_book_words` count for the current `userBookId`
* owner's rated `user_books` rows for difficulty comparison

Notes:
* The page first verifies access to the target `user_books` row, then loads stats for that same `userBookId`.
* Difficulty comparison intentionally uses the owner user's other rated books, not the current viewer's library.

### 6. Access / Ownership Checks

Keep in `page.tsx`.

Flow:
* require a signed-in user
* load viewer profile
* load target `user_books` row
* allow owner access
* allow `super_teacher` / `is_super_teacher`
* allow linked teacher access through `teacher_students`
* deny with `AccessDeniedMessage` when not allowed

### 7. Word Edit / Save / Delete Behavior

Not present on this page.

The page only loads a count of saved words:
* `user_book_words.select("id", { count: "exact", head: true })`

It does not:
* edit words
* save words
* delete words
* update definitions
* flag words
* hide words

### 8. Vocabulary / Global / Cache Behavior

No `vocabulary_cache`, global vocabulary, or kanji-map behavior is present.

The only vocabulary-related behavior is the private saved-word count for the current book.

### 9. Event Handlers

Keep event handlers in `page.tsx`.

Current event handlers are navigation-only:
* header click opens `/books/[userBookId]`
* `Vocab List` button opens `/books/[userBookId]/words`
* `Book Hub` button opens `/books/[userBookId]`

No database write handlers are present.

### 10. Derived Values

Keep all derived values in `page.tsx` for the first pass.

Book/session filters:
* `book`
* `realSessions`
* `visualReadingSessions`
* `pageTrackedSessions`
* `timedSessions`
* `timedPageTrackedSessions`
* `curiositySessions`
* `fluidSessions`
* `listeningSessions`

Time and progress:
* `curiosityMinutes`
* `fluidMinutes`
* `listeningMinutes`
* `totalTrackedMinutes`
* `pagesRead`
* `timedPages`
* `timedPageMinutes`
* `daysEngaged`
* `lastEngaged`
* `overallMinPerPage`
* `pagesPerHour`
* `curiosityPageStats`
* `fluidPageStats`

Difficulty:
* `difficultyComparison`
* `neighborhood`
* `typeLabel`

### 11. Render Sections

Current render order:
* loading state
* access-check loading state
* access denied state
* error/not-found state
* page shell
* header/book summary with cover, title, Vocab List button, and Book Hub button
* Difficulty Neighborhood panel
* Progress Snapshot stat grid
* Time by Mode stat grid, conditional
* Pace stat grid, conditional
* Vocabulary stat grid

## Recommended First-Pass Visual Extractions

Only extract presentational JSX. Keep all calculations, access, queries, helpers, and handlers in `page.tsx`.

### 1. `BookStatsLoadingState`

What JSX it owns:
* repeated loading card markup used before and during access check

What stays in `page.tsx`:
* `loading`
* `accessChecked`
* decision of when to show loading

Expected props:
* optional `message?: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `BookStatsErrorState`

What JSX it owns:
* red error/not-found card

What stays in `page.tsx`:
* access-denied branch
* `errorMessage` / missing row decision

Expected props:
* `message: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 2

### 3. `BookStatsHeader`

What JSX it owns:
* top header section
* cover/no-cover display
* page eyebrow
* title and title reading
* subtitle text
* Vocab List / Book Hub buttons

What stays in `page.tsx`:
* router/navigation handlers or inline `router.push` callbacks
* `book`
* encoded route target generation if desired

Expected props:
* `bookTitle: string`
* `bookTitleReading?: string | null`
* `coverUrl?: string | null`
* `userBookId: string`
* `onOpenBookHub: () => void`
* `onOpenVocabList: () => void`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 3

### 4. `DifficultyNeighborhoodPanel`

What JSX it owns:
* colored difficulty neighborhood section
* label, note, harder-than text, sample-size text
* rating card on the right

What stays in `page.tsx`:
* `difficultyComparison` calculation
* `neighborhood` derivation
* `typeLabel`
* `difficultyText`

Expected props:
* `neighborhood: { label: string; colorClass: string; note: string }`
* `percentHarderThan: number | null`
* `sampleSize: number`
* `typeLabel: string`
* `ratingDifficulty: number | null`
* `ratingText: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 4

### 5. `StatsSection`

What JSX it owns:
* section wrapper with heading and grid

What stays in `page.tsx`:
* all conditional rendering decisions
* list of stat cards
* calculations

Expected props:
* `title: string`
* `children: React.ReactNode`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 5

### 6. `StatCard`

What JSX it owns:
* existing `StatCard` markup

What stays in `page.tsx`:
* stat values and notes

Expected props:
* `label: string`
* `value: string | number`
* `note?: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 6

Note:
* `StatCard` is already a small presentational helper inside `page.tsx`, so this can be moved to a local component file with very low behavior risk.

## Suggested Component Location

Keep components local for the first pass:

`app/(protected)/books/[userBookId]/stats/components/`

Suggested files:
* `BookStatsLoadingState.tsx`
* `BookStatsErrorState.tsx`
* `BookStatsHeader.tsx`
* `DifficultyNeighborhoodPanel.tsx`
* `StatsSection.tsx`
* `StatCard.tsx`

Do not promote shared stats components yet.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `errorMessage` is set for sign-in and final error state, while access failures mostly use `accessMessage`; this is understandable but slightly overlapping.
* `loading` and `accessChecked` both render the same loading UI. This is a good visual extraction candidate, but the state split should stay for now.
* `ComparisonBook.id` is compared to `row.id`. Both are `user_books.id`, so this appears correct.
* `bookTypeLabel` includes `ya`, `short_story`, `nonfiction`, `essay`, and `memoir`; confirm these still match current book type options before changing copy.
* `visualReadingSessions` includes only `curiosity` and `fluid`, so page pace excludes listening by design. This seems intentional, but worth preserving carefully.
* `pagesRead` and `Words/Page` are based only on page-tracked visual reading sessions, not listening sessions. This appears intentional.
* `lastEngaged` uses the first `realSessions` row based on current query order. Because sessions are ordered by `read_on` and `created_at` descending, this should be the latest engagement.

## Recommended First Pass

1. Extract loading and error states.
2. Extract `StatCard`.
3. Extract `StatsSection`.
4. Extract `BookStatsHeader`.
5. Extract `DifficultyNeighborhoodPanel`.

Stop there for the first pass.

Leave all data loading, access checks, helper functions, and derived stats in `page.tsx`.

* Extracted `BookStatsLoadingState`
* Extracted `BookStatsErrorState`
* Extracted `StatCard`
* Extracted and applied `StatsSection`
* Extracted `BookStatsHeader`
* Extracted `DifficultyNeighborhoodPanel`

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass done / good stopping point`

The first visual pass has now reached a good stopping point. The major presentational pieces have been extracted:

* `BookStatsLoadingState`
* `BookStatsErrorState`
* `StatCard`
* `StatsSection`
* `BookStatsHeader`
* `DifficultyNeighborhoodPanel`

The repeated stat-section shell pattern is now handled by `StatsSection` for:

* `Progress Snapshot`
* `Time by Mode`
* `Pace`
* `Vocabulary`

The remaining page code is mostly access checks, Supabase loading, session/word-count loading, difficulty comparison logic, and stats calculations. Further extraction would be behavior-aware architecture work, not low-risk visual thinning.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/books/[userBookId]/stats/page.tsx | 788 | 655 | -133 |`

### 2. Readability Check

The page is easier to scan than before. Loading/error states, the header, the difficulty comparison panel, stat cards, and stat-section wrappers are now named components.

The render now reads as a concise composition:

* `StatsSection` for Progress Snapshot
* `StatsSection` for Time by Mode
* `StatsSection` for Pace
* `StatsSection` for Vocabulary

No remaining area feels visually overwhelming. The page is still moderately long because the calculations and access/data loading remain in `page.tsx`, which is intentional for this pass.

### 3. Remaining Code Classification

Remaining code is mostly in these buckets:

* access / ownership checks: signed-in user, viewer profile, owner access, linked-teacher access, and super-teacher access.
* linked-teacher / super-teacher checks: access to private book stats is guarded before stats are shown.
* Supabase loading: target `user_books` row, reading sessions, saved-word count, and comparison books.
* book/context loading: joined `books` metadata and owner context.
* reading-session loading: sessions for the current `userBookId`.
* word-count loading: private saved-word count for the current book.
* difficulty comparison loading: owner user's other rated books of the same type.
* stats calculations: minutes by mode, pages read, days engaged, pace, words/page, difficulty comparison.
* UI state: loading, access checked, access message, error message, loaded rows.
* derived values: real sessions, page-tracked sessions, timed sessions, mode groupings, labels, totals, pace values.
* helper functions: minutes formatting, book type labels, status labels, difficulty labels, neighborhood calculation.
* visual JSX still in `page.tsx`: page shell and high-level component composition.
* component composition: the render wires derived stats into extracted presentational components.
* legacy or suspicious code: no obvious stale visual extraction target remains after applying `StatsSection`.

The remaining 655 lines are mostly behavior/data/calculation logic rather than easy visual JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `BookStatsPageShell`

What JSX it owns:

* outer `main` and max-width wrapper.

Why it is safe:

* visual-only wrapper.

Risk level:

* Low.

Do now or defer:

* Defer. It would not improve readability enough to justify another component.

#### `BookStatsSummaryGrid`

What JSX it owns:

* groups of `StatCard` values per stats category.

Why it is not ideal:

* it would need many stats values and conditionals, creating prop-basket pressure.

Risk level:

* Medium.

Do now or defer:

* Defer. Keep calculations and stat-card choices in `page.tsx`.

No remaining low-risk visual extraction is necessary before marking this pass complete.

### 5. Prop Basket / Over-Extraction Check

The extracted components are healthy:

* `BookStatsLoadingState` and `BookStatsErrorState` are simple.
* `StatCard` has a clean display API.
* `StatsSection` now handles repeated stat-section wrappers with a small `title`/`children` API.
* `BookStatsHeader` owns book context and navigation presentation without owning routing decisions.
* `DifficultyNeighborhoodPanel` receives derived values but does not calculate them.

No component appears too prop-heavy. The only caution is to avoid extracting whole stat groups into large components until the derived stats are shaped into a deliberate view model.

### 6. Behavior Boundary Check

The visual pass does not appear to move or blur:

* access checks
* owner/private book checks
* linked-teacher checks
* super-teacher checks
* Supabase queries
* reading-session loading
* saved-word count loading
* difficulty comparison loading
* stats calculations
* vocabulary count behavior
* navigation to Book Hub / Vocab List

No suspicious behavior-boundary issue was found during this audit.

### 7. Architecture Deferred List

Keep these deferred for later:

* shared types: useful later, but not needed for this visual pass.
* helper functions: move only with a clear stats service/formatters plan.
* access helpers: centralize with other private book routes later.
* services/DAOs/controllers: data loading is stable and should not move during visual cleanup.
* reading-session stats helpers: medium-risk because they define progress and pace numbers.
* difficulty comparison helper: keep page-owned until the reader-fit/difficulty model is stable.
* saved-word count service: simple now, but should align with broader book stats architecture later.
* shared stats UI components: possible later, but keep these page-local for now.

### 8. Browser Smoke Test Suggestions

Suggested manual smoke test checklist:

* owner can open their own Book Stats page.
* unauthorized user is blocked from another user's private Book Stats page.
* linked teacher/super-teacher access still works if intended.
* Book Hub navigation works.
* Vocab List navigation works.
* difficulty neighborhood panel displays correctly.
* Progress Snapshot stats display correctly.
* Time by Mode appears only when tracked minutes exist.
* Pace appears only when page/time data exists.
* Vocabulary stats show saved-word count and words/page when available.
* empty/low-data states still look acceptable.
* mobile-ish check for header, stat cards, and conditional sections.

Do not run browser tests unless explicitly requested.

### 9. Final Recommendation

Stop visual thinning here.

The first visual pass is complete. Further work should be second-pass architecture planning around access helpers, data loading, reading-session calculations, and difficulty comparison logic.
