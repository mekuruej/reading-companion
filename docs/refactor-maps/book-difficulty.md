# Book Difficulty Refactor Map

Extraction Tasks

## Remaining

- [ ] H. Types
1. Move:
    * `DifficultyTimeRange`
    * `RawBook`
    * `RawUserBookRow`
    * `UserBookRow`
    * `PieItem`
2. Stay in `page.tsx`: imports and page-level composition.
3. Props: none.
4. Type: shared feature types.
5. Risk: low.
This is safe, but it is more useful after at least one component extraction needs the shared types.

- [ ] I. Data loading
1. Move: Supabase reads for session and `user_books`.
2. Stay in `page.tsx`: `useEffect`, state transitions, loading/error handling at first.
3. Future functions:
    * `dao.ts`: `loadBookDifficultyRows(userId)`
    * `controller.ts`: `loadBookDifficultyForCurrentUser()`
4. Type: database/query logic and controller orchestration.
5. Risk: medium-high.
Not first. Query behavior is working and should be preserved while UI is split.

- [ ] J. Stats calculations
1. Move:
    * filtering by range
    * totals
    * count arrays
    * pie arrays
    * hardest/easiest book selection
    * reader-fit row selection
2. Stay in `page.tsx`: `useMemo` calls at first, or later one `buildBookDifficultyViewModel`.
3. Props/inputs needed:
    * rows
    * timeRange
4. Type: app-rule/stat calculation logic.
5. Risk: medium.
Good later target, but only after UI components are split.

- [ ] K. Pure helper functions
1. Move:
    * `formatDecimal`
    * `formatRating`
    * `bookTypeLabel`
    * `ratingLabel`
    * `difficultyLabel`
    * `pageCountBucket`
    * `average`
    * `countByLabel`
    * `balancedBookTypeRows`
2. Stay in `page.tsx`: imports and memoized orchestration.
3. Props: none.
4. Type: formatting/stat utility logic.
5. Risk: low-medium.
Move helpers only when the destination is clear. Formatting can go to `service.ts` or a local `formatters.ts`; aggregation can go to `service.ts`.

- [ ] L. Time range helpers
1. Move:
    * `startDateForRange`
    * `readerFitDate`
    * `isInTimeRange`
2. Stay in `page.tsx`: selected range state and selected range label.
3. Props: none.
4. Type: app-rule/date window logic.
5. Risk: medium.
Preserve the current fallback order: finished date, DNF date, started date, then created date.

Target Architecture Placement
page.tsx
* state
* effects for now
* selected time range state
* high-level composition
* page loading/error states
* calls into future `dao/controller/service`
components/
* StatCard
* SectionBand
* BarStrip
* PieChart
* DifficultyTimeRangeSelector
* later: `BookDifficultyHeader`, `ReaderFitTable`, maybe small chart sections
controller.ts
* future orchestration:
    * get current user
    * load user books
    * handle empty/no-login cases
* not needed for the first extraction.
service.ts
* date window filtering
* difficulty/rating/page bucket labels
* totals aggregation
* count grouping
* pie/model shaping
* balanced hardest/easiest selection
* reader-fit table row shaping
dao.ts
* Supabase reads:
    * current user/session if desired
    * user book rows with joined book metadata
types.ts
* DifficultyTimeRange
* RawBook
* RawUserBookRow
* UserBookRow
* PieItem
* later view-model types.


Old Map
1. types
    * DifficultyTimeRange
    * RawBook
    * RawUserBookRow
    * UserBookRow
    * PieItem
Future home: `types.ts`
1. constants
    * DIFFICULTY_TIME_FILTERS
    * palette
Future home:
* DIFFICULTY_TIME_FILTERS: likely `service.ts` or `types.ts` depending whether it is treated as app config.
* palette: can stay page-level until chart sections are extracted; later maybe chart/theme config.
1. helper functions
    * Date helpers: `ymdLocal`, `startDateForRange`, `readerFitDate`, `isInTimeRange`
    * Format helpers: `formatDecimal`, `formatRating`, `bookTypeLabel`, `ratingLabel`, `difficultyLabel`, `pageCountBucket`
    * Stat helpers: `average`, `countByLabel`, `balancedBookTypeRows`
    * Theme helper: `difficultyTheme`
Future home:
* `ymdLocal`: currently appears unused; remove if confirmed.
* `startDateForRange`, `readerFitDate`, `isInTimeRange`: `service.ts`
* `formatDecimal`, `formatRating`, `bookTypeLabel`, `ratingLabel`, `difficultyLabel`, `pageCountBucket`: `service.ts` or local `formatters.ts`
* `average`, `countByLabel`, `balancedBookTypeRows`: `service.ts`
* `difficultyTheme`: probably `components/` or page-level theme helper; it is UI-theme logic, not database logic.
1. presentational components already inside page
    * StatCard
    * SectionBand
    * BarStrip
    * PieChart
Future home: `components/`
1. state inside `BookDifficultyPage`
    * loading
    * errorMsg
    * rows
    * timeRange
Future home:
* stays in `page.tsx` for now.
* could later move loading orchestration into `controller.ts`, but not first.
1. data loading
The `useEffect`:
    * gets current Supabase session
    * loads `user_books`
    * joins `books`
    * normalizes joined `books` from array/object into one book object
Future home:
* Supabase query: `dao.ts`
* orchestration/load flow: `controller.ts`
* page keeps state/useEffect until a later refactor.
1. derived/calculated values
    * selectedTimeFilter
    * selectedTimeLabel
    * selectedTheme
    * filteredRows
    * finishedRows
    * ratedDifficultyRows
    * ratedOverallRows
    * ratedBooks
    * dnfRows
    * totals
    * bookTypeCounts
    * pageBucketCounts
    * difficultyCounts
    * overallRatingCounts
    * bookTypePie
    * difficultyPie
    * finishedRatedDifficultyRows
    * hardestBooks
    * easiestBooks
    * readerFitRows
Future home:
* Most calculations: `service.ts`
* UI-specific chart-ready arrays like `bookTypePie` and `difficultyPie`: either `service.ts` if standardized, or stay in page until chart sections are extracted.
* selectedTheme: can stay page-level or become component/theme helper.
1. event handlers
    * time range button handler:
        * `setTimeRange(option.value)`
Future home:
* stays in `page.tsx` for now.
1. render sections
    * loading state
    * page shell/back link/header
    * error box
    * time range selector
    * top stat cards
    * book type pie
    * difficulty pie
    * page-count bars
    * entertainment rating bars
    * hardest books
    * easiest books
    * reader-fit table
Future home:
* presentational chunks into `components/`
* page should eventually compose components and pass derived props.

## Finished

- [✔️] Extracted `StatCard`.
- [✔️] Fixed `Header Text`.
- [✔️] Extracted `SectionBand`.
- [✔️] Extracted `BarStrip`.
- [✔️] Extracted `PieChart`.
- [✔️] Extracted `Time range selector`.
- [✔️] Extracted `Page header`.
- [✔️] Extracted `Reader-fit table`.

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass done / good stopping point`

This page has reached a good first-pass visual stopping point. The main render is now mostly high-level composition:

* `BookDifficultyHeader`
* `DifficultyTimeRangeSelector`
* `StatCard`
* `SectionBand`
* `PieChart`
* `BarStrip`
* `ReaderFitTable`

The remaining page code is primarily data loading, time-range filtering, rating/book difficulty calculations, and derived chart/table data. Further extraction would mostly move behavior-aware logic rather than simple presentational JSX.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/community/stats/book-difficulty/page.tsx | 1109 | 810 | -299 |`

Note: the tracker previously listed 809 lines; the current file is 810 lines. This is close enough to treat as the same completed visual pass.

### 2. Readability Check

The page is easier to scan than before. The extracted components make the bottom render section read like a stats dashboard outline instead of a long block of repeated card/chart markup.

The remaining sections are understandable:

* loading state
* page shell
* header
* error banner
* time-range selector
* summary stat cards
* chart sections
* hardest/easiest sections
* reader-fit table

No render area currently feels visually overwhelming. The page is still long because the calculation layer remains in `page.tsx`, but that is architecture work rather than low-risk visual thinning.

### 3. Remaining Code Classification

Remaining code is mostly in these buckets:

* access / current-user checks: Supabase user/session lookup and logged-in-user scoping.
* Supabase loading: `user_books` query with joined book metadata.
* book metadata normalization: handling the joined `books` value and shaping it into page rows.
* time-range behavior: selected range state, selected label/theme, date-window helpers.
* rating/difficulty calculations: average difficulty, average entertainment, rated-book totals, finished/DNF counts.
* book/category calculations: book type labels, type balancing, page-count buckets.
* chart/stat calculations: pie data, bar data, hardest/easiest rows, reader-fit rows.
* derived values: most of the dashboard view model lives in `useMemo` blocks.
* helper functions: formatting, labels, date helpers, aggregation helpers, theme helpers.
* visual JSX still in `page.tsx`: page shell, tiny loading state, error banner, and the composition of extracted components.
* component composition: the render now mostly wires derived values into page-local visual components.
* legacy or suspicious code: the older map notes `ymdLocal` may be unused; verify separately before removing.

The remaining 810 lines are mostly behavior/calculation/data structure rather than easy presentational JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `BookDifficultyLoadingState`

What JSX it owns:

* the small loading screen.

Why it is safe:

* it is purely presentational.

Risk level:

* Low.

Do now or defer:

* Defer. It is too small to justify another extraction pass by itself.

#### `BookDifficultyErrorBanner`

What JSX it owns:

* the red error message banner.

Why it is safe:

* it only receives `errorMsg` or `message`.

Risk level:

* Low.

Do now or defer:

* Defer. It is tiny and does not meaningfully improve scanability.

#### `BookDifficultySummaryStats`

What JSX it owns:

* the four top `StatCard` instances.

Why it is safe:

* it could receive `totals` and `selectedTheme`.

Risk level:

* Low-medium.

Do now or defer:

* Defer. It would bundle derived values into a wider prop surface, and the current four-card composition is already readable.

#### `BookDifficultyChartSections`

What JSX it owns:

* the pie and bar chart section groups.

Why it is not ideal:

* it would need many derived props and formatter callbacks, creating a large prop basket.

Risk level:

* Medium.

Do now or defer:

* Defer. This should wait for a second-pass view-model or stats service cleanup.

### 5. Prop Basket / Over-Extraction Check

The extracted components do not appear too prop-heavy for this pass.

* `StatCard`, `SectionBand`, `BarStrip`, and `PieChart` are small and clear.
* `DifficultyTimeRangeSelector` has several props, but they match its job and keep time-range behavior in `page.tsx`.
* `ReaderFitTable` receives formatter callbacks, which is acceptable because rating/book-type logic stays page-owned.
* No extraction appears to make the page harder to understand.

Keep these components page-local for now. Some stats components may eventually become shared across community stats pages, but that should be a separate shared-stats pass after the page-specific thinning work settles.

### 6. Behavior Boundary Check

The visual pass does not appear to move or blur:

* current-user/session checks
* Supabase queries
* private `user_books` data boundaries
* joined book metadata normalization
* time-range behavior
* difficulty and entertainment rating calculations
* page-count bucket behavior
* hardest/easiest selection
* reader-fit table derivation
* chart/stat calculation behavior

No suspicious behavior-boundary issue was found during this wrap-up audit.

### 7. Architecture Deferred List

Keep these deferred for later:

* shared types: useful later, but moving them now does not reduce risk.
* helper functions: should move only when the destination is clear, likely a local service/formatters file.
* access helpers: this page is current-user scoped and stable; broader access centralization should be planned across stats pages.
* services/DAOs/controllers: data loading is stable and should not be moved during a visual pass.
* repeated Supabase loading: better handled in a second-pass stats architecture cleanup.
* time-range helpers: preserve the current date fallback behavior before extracting.
* stats calculation helpers: medium-risk because they define the dashboard numbers.
* chart data helpers: wait until there is a shared stats view-model pattern.
* shared stats UI components: possible later, but avoid premature shared-component churn.

### 8. Browser Smoke Test Suggestions

Suggested manual smoke test checklist:

* logged-in user can open Book Difficulty Stats.
* logged-out or invalid access behavior still works.
* book difficulty rows load for the current user only.
* time-range selector updates the displayed stats.
* top stat cards show plausible totals.
* book type pie chart renders.
* difficulty pie chart renders.
* page-count bars render.
* entertainment bars render.
* hardest/easiest book sections render.
* reader-fit table shows finished rated books.
* empty state/low-data state still looks acceptable.
* mobile-ish check for header, time filters, stat cards, charts, and reader-fit table.

Do not run browser tests unless explicitly requested.

### 9. Final Recommendation

Stop visual thinning here.

This page is ready to leave the visual pass. The next useful work would be second-pass architecture planning around calculation helpers, data loading, and possibly shared stats UI once multiple stats pages have settled.
