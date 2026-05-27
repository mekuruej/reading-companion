# Book Difficulty Refactor Map

Extraction Tasks

## Remaining

- [ ] F. Page header
1. Move: back link plus hero/header block into `BookDifficultyHeader`.
2. Stay in `page.tsx`: selected time label and selected theme.
3. Props needed:
    * selectedTimeLabel
    * selectedTheme
4. Type: presentational UI.
5. Risk: low.
Fix the current hero paragraph while extracting it; it currently renders a literal `description="..."` string.

- [ ] G. Reader-fit table
1. Move: the table section body into `ReaderFitTable`.
2. Stay in `page.tsx`: `readerFitRows`, selected section wrapper, and derived sorting logic.
3. Props needed:
    * rows
    * bookTypeLabel
    * formatRating
4. Type: presentational UI.
5. Risk: medium.
Rename the `Ease rating` column to `Difficulty` during this pass.

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
