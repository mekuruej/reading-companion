# Reading Ability Refactor Map

Extraction Tasks

## Remaining

- [ ] I. Types
1. Move:
    * `SessionMode`
    * `SessionRow`
    * `WordRow`
    * `RawUserBookRow`
    * `UserBookRow`
    * `BookMetric`
    * `ReadingAbilityFilter`
    * `TypeMetric`
2. Stay in `page.tsx`: imports and page composition.
3. Props: none.
4. Type: shared feature types.
5. Risk: low.
Do after at least one component extraction needs shared types.

- [ ] J. Data loading
1. Move: Supabase reads for session, user books, reading sessions, and words.
2. Stay in `page.tsx`: `useEffect`, loading/error state transitions at first.
3. Future functions:
    * `dao.ts`: load user books, sessions, words
    * `controller.ts`: `loadReadingAbilityForCurrentUser()`
4. Type: data/query logic and controller orchestration.
5. Risk: medium-high.
Not first.

- [ ] K. Stats calculations
1. Move:
    * `bookMetrics`
    * `filteredBookMetrics`
    * `abilityTotals`
    * `abilityStandouts`
    * `abilityTypeMetrics`
    * `pacePie`
    * `abilityComparisonRows`
2. Stay in `page.tsx`: `useMemo` calls at first, or later one `buildReadingAbilityViewModel`.
3. Props/inputs needed:
    * rows
    * sessions
    * words
    * bookTypeFilter
4. Type: app-rule/stat calculation logic.
5. Risk: medium.
Do after presentational UI is split.

- [ ] L. Helper functions
1. Move:
    * `formatDecimal`
    * `sessionPages`
    * `wordKey`
    * `bookTypeLabel`
    * `readingAbilityGroupForBookType`
    * `bookTypeSortIndex`
    * `paceLabel`
    * `readingAbilityTheme`
2. Stay in `page.tsx`: imports and orchestration.
3. Props: none.
4. Type: helper logic / app-rule logic / UI-theme logic.
5. Risk: low-medium.
Move only once destinations are clear.

Target Architecture Placement
page.tsx
* state
* effects for now
* selected filter state
* high-level composition
* page loading/error states
* calls into future `dao/controller/service`

components/
* StatCard
* SectionBand
* BarStrip
* PieChart
* later: `ReadingAbilityFilterSelector`, `ReadingAbilityHeader`, `ReadingRangeCard`, `PaceLegendCards`

controller.ts
* future orchestration:
    * get current user
    * load user books
    * load reading sessions
    * load saved words
    * handle empty/no-login cases

service.ts
* session page counting
* word de-duplication keying
* book metric building
* filter grouping
* totals aggregation
* standout selection
* type metric grouping
* pace buckets
* comparison row shaping

dao.ts
* Supabase reads:
    * current user/session if desired
    * user books with joined book metadata
    * reading sessions by user book ids
    * saved words by user book ids

types.ts
* SessionMode
* SessionRow
* WordRow
* RawUserBookRow
* UserBookRow
* BookMetric
* ReadingAbilityFilter
* TypeMetric
* later view-model types.

Old Map
1. types
    * SessionMode
    * SessionRow
    * WordRow
    * RawUserBookRow
    * UserBookRow
    * BookMetric
    * ReadingAbilityFilter
    * TypeMetric
Future home: `types.ts`

1. constants
    * READING_ABILITY_FILTERS
Future home: likely `service.ts` or `types.ts` depending whether it is treated as app config.

1. helper functions
    * Format helper: `formatDecimal`
    * Stat helpers: `sessionPages`, `wordKey`
    * Label/group helpers: `bookTypeLabel`, `readingAbilityGroupForBookType`, `bookTypeSortIndex`, `paceLabel`
    * Theme helper: `readingAbilityTheme`
Future home:
* most calculations: `service.ts`
* `readingAbilityTheme`: page-level or component/theme helper

1. presentational components already inside page
    * StatCard
    * SectionBand
    * BarStrip
    * PieChart
Future home: `components/`

1. state inside `ReadingAbilityPage`
    * loading
    * errorMsg
    * rows
    * sessions
    * words
    * bookTypeFilter
Future home:
* stays in `page.tsx` for now.

1. data loading
The `useEffect`:
    * gets current Supabase session
    * loads `user_books`
    * joins `books`
    * normalizes joined `books`
    * loads `user_book_reading_sessions`
    * loads `user_book_words`
    * filters filler sessions
Future home:
* Supabase queries: `dao.ts`
* orchestration/load flow: `controller.ts`
* page keeps state/useEffect until later.

1. derived/calculated values
    * bookMetrics
    * filteredBookMetrics
    * selectedFilter
    * selectedFilterLabel
    * selectedTheme
    * abilityTotals
    * abilityStandouts
    * abilityTypeMetrics
    * pacePie
    * abilityComparisonRows
Future home:
* most calculations: `service.ts`
* selected theme can stay page-level or move later.

1. event handlers
    * filter button handler:
        * `setBookTypeFilter(option.value)`
Future home:
* stays in `page.tsx`.

1. render sections
    * loading state
    * page shell/back link/header
    * error box
    * filter selector
    * top stat cards
    * fluid/curiosity range cards
    * pace pie and explanation cards
    * ability by book type
    * pushed back / flowed comparison table
Future home:
* presentational chunks into `components/`
* page should eventually compose components and pass derived props.

## Finished

- [✔️] Extracted `StatCard`.
- [✔️] Extracted `SectionBand`.
- [✔️] Extracted `BarStrip`.
- [✔️] Extracted `PieChart`.
- [✔️] Extracted `ReadingAbilityFilterSelector`.
- [✔️] Extracted `PageHeader`.
- [✔️] Extracted `ReadingRangeCards`.
- [✔️] Extracted `PaceExplanationCards`.

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass done / good stopping point`

This status fits because the first visual pass extracted the major presentational surfaces: stat cards, section bands, bar strips, pie chart, filter selector, page header, reading range cards, and pace legend/explanation cards. The remaining page is mostly data loading, stats calculation, selected-filter state, derived metrics, and page composition.

The previous tracker label can change from:

`Visual pass done / architecture deferred`

to:

`Visual pass done / good stopping point`

Current line count note:

The tracker row said the page was reduced to `1035` lines. The current file is about `1037` lines, which is effectively the same stopping point.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/community/stats/reading-ability/page.tsx | 1357 | 1037 | -320 |`

### 2. Readability Check

The page is easier to scan than before. The extracted components make the main visual sections clear: header, filter section, stat cards, range cards, pace section, and chart components.

The remaining page sections are understandable. Most of the complexity is now in data shaping and stats calculations rather than unnamed JSX blocks.

The most visually dense remaining areas are the two table sections:

* Ability by book type
* Books that pushed back / books that flowed

Those tables are readable enough to leave in place for now because extracting them would require passing derived rows, label helpers, formatting helpers, and section copy through another component boundary.

### 3. Remaining Code Classification

Remaining code is mostly behavior, data, and stats architecture:

* access / current-user checks: Supabase session/current-user loading remains in the page.
* Supabase loading: user books, reading sessions, and saved words are loaded in the page effect.
* reading-session loading: `user_book_reading_sessions` rows are loaded and filtered.
* saved-word loading: `user_book_words` rows are loaded for vocabulary/word-count metrics.
* book/context loading: `user_books` rows joined to `books` are normalized into page-local rows.
* book/category filter behavior: selected reading ability filter state and filtered metric calculations.
* page/session calculation behavior: page counts, timed/untimed sessions, minutes per page, and filler-session filtering.
* word-count behavior: saved words are counted by book and de-duplicated with page-local helpers.
* chart/stat calculations: totals, standouts, type metrics, pace pie data, and comparison rows.
* derived values: selected filter label/theme, filtered book metrics, ability totals, range cards, chart rows, and table rows.
* helper functions: formatting, page counting, word keying, book type labels, filter grouping, sorting, pace labels, and theme selection.
* visual JSX still in `page.tsx`: loading state, error banner, top-level layout, stat/range composition, and two table sections.
* component composition: extracted components are wired together from page-owned metrics and helpers.
* legacy or suspicious code: the doc's finished list uses older component names (`PageHeader`, `ReadingRangeCards`, `PaceExplanationCards`) while the current files are `ReadingAbilityHeader`, `ReadingRangeCard`, and `PaceLegendCards`.

### 4. Visual Chunks Still Worth Extracting?

`ReadingAbilityLoadingState`

* What JSX it owns: the loading page shell and loading copy.
* Why it is safe or not safe: safe and tiny, but not very valuable.
* Risk level: low.
* Recommendation: defer. It would not materially improve readability.

`ReadingAbilityErrorBanner`

* What JSX it owns: the red error banner.
* Why it is safe or not safe: safe and tiny.
* Risk level: low.
* Recommendation: defer. It is too small to justify another extraction pass.

`ReadingAbilityTypeTable`

* What JSX it owns: the table under “Ability by book type.”
* Why it is safe or not safe: visually extractable, but it needs metric rows, formatting, and table labels. It is clearer to wait until stats calculations are moved or shaped into a view model.
* Risk level: medium.
* Recommendation: defer to a second-pass stats/view-model cleanup.

`ReadingAbilityComparisonTable`

* What JSX it owns: the pushed-back/flowed comparison table and empty state.
* Why it is safe or not safe: presentational at first glance, but it depends on comparison row shape, book type label helper, and formatting rules.
* Risk level: medium.
* Recommendation: defer. It should move only with a clearer comparison view model.

### 5. Prop Basket / Over-Extraction Check

No extracted component appears too prop-heavy. `ReadingRangeCard`, `ReadingAbilityFilterSelector`, `PieChart`, and `BarStrip` have healthy visual boundaries and reasonable props.

No extraction appears to make the page harder to understand. The components remain page-local, which is appropriate because stats pages still have slightly different themes and display models.

`StatCard`, `SectionBand`, `BarStrip`, and `PieChart` may eventually become shared stats components, but they should stay local until the stats pages are stabilized and a dedicated shared-stats pass is planned.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred these boundaries:

* current-user/session checks remain in `page.tsx`.
* Supabase queries remain in `page.tsx`.
* private reading-session data boundaries remain scoped to the current user's `user_books`.
* private saved-word data boundaries remain scoped to the current user's `user_books`.
* book/context loading remains page-owned.
* stats calculations remain in `page.tsx`.
* book/category filtering remains in `page.tsx`.
* page-count and minutes-per-page behavior remains in `page.tsx`.
* chart/table data derivation remains in `page.tsx`.

Nothing suspicious needs an immediate fix during this audit.

### 7. Architecture Deferred List

* shared types: defer because current row/metric types are still tied to this page's calculation flow.
* helper functions: defer until a stats service/view-model boundary is clearer.
* access helpers: defer until stats pages share a consistent current-user loading helper.
* services/DAOs/controllers: defer because moving Supabase reads and calculations is behavior-aware and needs focused testing.
* repeated Supabase loading: defer to a broader stats data-loading cleanup.
* reading-session metric helpers: defer because page counting, session mode handling, and filler-session filtering affect visible stats.
* saved-word metric helpers: defer because word de-duplication and book association rules need to stay stable.
* filter/grouping helpers: defer until the reading ability categories are settled.
* chart data helpers: defer until multiple stats pages can share chart view models safely.
* shared stats UI components: defer until a dedicated shared stats component pass.

### 8. Browser Smoke Test Suggestions

Manual smoke test checklist:

* logged-in user can open Reading Ability stats.
* logged-out or invalid access behavior still works.
* reading sessions load only for the current user's books.
* saved words load only for the current user's books.
* filler sessions are excluded.
* book category filter works.
* top stat cards update with the selected filter.
* fluid and curiosity range cards display expected fastest/slowest examples.
* pace pie chart and legend display correctly.
* Ability by book type table displays rows and page/minute values correctly.
* pushed-back/flowed comparison table displays expected rows.
* empty states work for users with little or no timed reading data.
* mobile-ish visual check for header, filters, cards, chart, and tables.

### 9. Final Recommendation

Stop visual thinning here.

This page has reached a good first-pass stopping point. Further improvements should happen in a second-pass architecture cleanup: stats calculation helpers, view-model shaping, Supabase loading extraction, and possibly shared stats UI components.
