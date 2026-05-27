# Reading Ability Refactor Map

Extraction Tasks

## Remaining

- [ ] G. Reading range cards
1. Move: Fluid Reading Range and Curiosity Reading Range card UI.
2. Stay in `page.tsx`: `abilityStandouts`, selected theme, formatting.
3. Props needed:
    * title
    * fastestValue
    * fastestTitle
    * slowestValue
    * slowestTitle
    * emptyText
    * tone
4. Type: presentational UI.
5. Risk: medium.

- [ ] H. Pace explanation cards
1. Move: the four static pace explanation cards.
2. Stay in `page.tsx`: `pacePie`, `SectionBand`, chart placement.
3. Props needed:
    * items, or none if static inside component.
4. Type: presentational UI.
5. Risk: low.

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
- [✔️] Extracted `Page header`.