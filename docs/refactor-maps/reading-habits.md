# Reading Habits Refactor Map

Extraction Tasks

## Remaining

- [ ] F. Reading rhythm calendar section
1. Move: the large daily rhythm SectionBand body into a component.
2. Stay in page.tsx: all data calculations and state.
3. Props needed:
    * selectedTimeLabel
    * selectedTheme
    * readingRhythmWindowLabel
    * readingRhythmActivity
    * visibleReadingRhythmActivity
    * readingRhythmSummary
    * showFullReadingRhythm
    * onToggleFullReadingRhythm
4. Type: presentational UI with some inline visual classification logic.
5. Risk: medium.
This is a big chunk and should not be first.

- [ ] H. Data loading
1. Move: Supabase reads for session/user books/reading sessions.
2. Stay in page.tsx: useEffect, state transitions, loading/error handling at first.
3. Future functions:
    * dao.ts: loadUserBookIds(userId), loadReadingSessions(userBookIds)
    * controller.ts: loadReadingHabitsForCurrentUser()
4. Type: database/query logic and controller orchestration.
5. Risk: medium-high.
Not first. Query behavior is currently working and should be preserved.
- [ ] I. Stats calculations
1. Move:
    * filtering by range
    * habitStats
    * rhythm activity generation
    * rhythm summary
    * chart data arrays
    * personality calculation
2. Stay in page.tsx: useMemo calls at first, or later one buildReadingHabitsViewModel.
3. Props/inputs needed:
    * sessions
    * timeRange
    * showFullReadingRhythm
4. Type: app-rule/stat calculation logic.
5. Risk: medium.
Good later target, but only after UI components are split.
- [ ] J. Types
1. Move the four type definitions.
2. Stay in page.tsx: imports.
3. Props: none.
4. Type: shared feature types.
5. Risk: low.
But I would not make this the first code change because it creates a new architecture file without improving readability much by itself.

Target Architecture Placement
page.tsx
* state
* effects for now
* selected time range state
* high-level composition
* page loading/error states
* calls into future dao/controller/service
components/
* StatCard
* SectionBand
* BarStrip
* PieChart
* ModeStrip
* later: TimeRangeSelector, ReadingRhythmGrid, ReadingHabitsHeader
controller.ts
* future orchestration:
    * get current user
    * load user books
    * load reading sessions
    * handle empty/no-login cases
* not needed for the first extraction.
service.ts
* date window filtering
* session page counting
* habit stats aggregation
* rhythm day generation
* rhythm summary
* reading personality
* chart/model shaping
dao.ts
* Supabase reads:
    * current user/session if desired
    * user book ids
    * reading sessions for book ids
types.ts
* SessionMode
* HabitTimeRange
* SessionRow
* ModeStripItem
* later view-model types.


Old Map
1. types
    * SessionMode
    * HabitTimeRange
    * SessionRow
    * ModeStripItem
Future home: types.ts
1. constants
    * HABIT_TIME_FILTERS
    * COLLAPSED_READING_RHYTHM_DAY_COUNT
Future home:
* HABIT_TIME_FILTERS: likely service.ts or types.ts depending whether it is treated as app config.
* COLLAPSED_READING_RHYTHM_DAY_COUNT: service.ts or local page constant.
1. helper functions
    * Date helpers: ymdLocal, monthStartYmd, isThisMonth
    * Stat helpers: sessionPages, formatDecimal, formatMinutesAsReadableTime
    * Theme helper: readingHabitsTheme
    * App-rule helper: readingPersonality
Future home:
* ymdLocal, monthStartYmd: service.ts
* isThisMonth: currently unused; later remove or move only if needed.
* sessionPages: service.ts
* formatDecimal, formatMinutesAsReadableTime: maybe service.ts, or shared utility later.
* readingHabitsTheme: probably components/ or service.ts; it is UI-theme logic, not database logic.
* readingPersonality: service.ts
1. presentational components already inside page
    * StatCard
    * SectionBand
    * BarStrip
    * PieChart
    * ModeStrip
    * DailyActivityChart
Future home: components/
Note: DailyActivityChart appears unused right now.
1. stateInside ReadingHabitsPage:
    * loading
    * errorMsg
    * sessions
    * timeRange
    * showFullReadingRhythm
Future home:
* stays in page.tsx for now.
* could later move orchestration into controller.ts, but not first.
1. data loadingThe useEffect:
    * gets current Supabase session
    * loads user_books
    * loads user_book_reading_sessions
    * filters out filler rows
Future home:
* Supabase queries: dao.ts
* orchestration/load flow: controller.ts
* page keeps state/useEffect until a later refactor.
1. derived/calculated values
    * filteredSessions
    * selectedTimeFilter
    * selectedTimeLabel
    * selectedTheme
    * habitStats
    * readingRhythmActivity
    * visibleReadingRhythmActivity
    * readingRhythmWindowLabel
    * readingRhythmSummary
    * dayMetrics
    * timePie
    * pagesPie
    * modeStripItems
    * sessionBars
    * personality
Future home:
* Most calculations: service.ts
* UI-specific chart-ready arrays like timePie, pagesPie, modeStripItems, sessionBars: either service.ts if standardized, or stay in page until components are extracted.
* selectedTheme: can stay page-level or become component/theme helper.
1. event handlers
    * time range button handler:
        * setTimeRange(option.value)
        * setShowFullReadingRhythm(false)
    * rhythm expand/collapse button:
        * setShowFullReadingRhythm((prev) => !prev)
Future home:
* stays in page.tsx for now.
* later could become controller.ts if the page grows more complex, but currently low value.
1. render sections
    * loading state
    * page shell/back link/header
    * error box
    * time range selector
    * top stat cards
    * time by mode + mode strip/personality
    * reading rhythm calendar/grid
    * reading rhythm summary cards
    * pages by mode + session balance
    * total time/pace stat cards
Future home:
* presentational chunks into components/
* page should eventually compose components and pass derived props.

## Finished

- [✔️] Extracted `StatCard`.
- [✔️] Extracted `SectionBand`.
- [✔️] Extracted `BarStrip`.
- [✔️] Extracted `ModeStrip`.
- [✔️] Extracted `PieChart`.
- [✔️] Extracted `TimeRangeSelector`.
- [✔️] Removed unused `DailyActivityChart`.
- [✔️] Removed unused `isThisMonth`.

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass mostly done / architecture deferred`

This status fits because the first visual pass extracted the repeated stats UI primitives: stat cards, section bands, bar strips, mode strips, pie chart, and time range selector. It also removed two unused pieces: `DailyActivityChart` and `isThisMonth`.

The page is significantly clearer, but the large reading rhythm calendar/grid section still remains in `page.tsx`. That section is visual, but it contains enough inline classification and summary display logic that extracting it now would create a medium prop basket. This makes it better as a later view-model/component cleanup, not a final tiny visual pass.

Current tracker row remains accurate:

`- [x] Visual pass mostly done / architecture deferred | app/(protected)/community/stats/reading-habits/page.tsx | 1310 | 985 | -325 |`

### 2. Readability Check

The page is easier to scan than before. The extracted stat/chart primitives make the main dashboard sections less repetitive and easier to read.

The remaining page sections are understandable, but the reading rhythm area is still visually dense. It includes header controls, calendar tiles, mode/intensity color classification, month labels, legend, summary cards, and a summary sentence.

The remaining complexity is not just easy JSX. It is mixed with display classification logic and derived rhythm values, so it should wait for a more deliberate extraction.

### 3. Remaining Code Classification

Remaining code is mostly behavior, calculations, and architecture:

* access / current-user checks: Supabase session/current-user loading remains in `page.tsx`.
* Supabase loading: user books and reading sessions remain loaded in the page effect.
* reading-session loading: `user_book_reading_sessions` rows are loaded through current user's `user_books`.
* filler-session filtering: filler rows are filtered out during loading.
* time range behavior: `timeRange` state and selected time filter behavior remain page-owned.
* reading rhythm behavior: visible/collapsed rhythm window, full-window toggle, rhythm summary, and day classification remain page-owned.
* stats calculations: habit stats, mode totals, pace stats, pages/time/session chart data, and reading personality remain in `page.tsx`.
* chart/list data shaping: `timePie`, `pagesPie`, `modeStripItems`, and `sessionBars` remain page-owned.
* UI state: loading, error message, selected range, and full rhythm toggle.
* derived values: filtered sessions, selected labels/themes, rhythm activity, summaries, chart arrays, and stat values.
* helper functions: date helpers, page counting, formatting, theme selection, and personality classification.
* visual JSX still in `page.tsx`: loading state, error banner, page header/back link, reading rhythm calendar/grid/summary section, and high-level composition.
* component composition: extracted primitives are wired from page-owned derived values.
* legacy or suspicious code: none urgent after removing `DailyActivityChart` and `isThisMonth`.

### 4. Visual Chunks Still Worth Extracting?

`ReadingRhythmSection`

* What JSX it owns: the full reading rhythm `SectionBand` body, including the window label, expand/collapse button, calendar grid, legend, summary cards, and rhythm summary copy.
* Why it is safe or not safe: it is presentational, but it receives many props and contains inline display classification logic for session mode/intensity colors and month labels.
* Risk level: medium.
* Recommendation: defer. Extract only after rhythm data is shaped into a cleaner view model.

`ReadingHabitsHeader`

* What JSX it owns: the back link/title/description at the top of the page.
* Why it is safe or not safe: safe, simple, and presentational.
* Risk level: low.
* Recommendation: optional, but defer unless doing a polish pass. It will not materially reduce the page's complexity.

`ReadingHabitsLoadingState` / `ReadingHabitsErrorBanner`

* What JSX it owns: loading shell and error banner.
* Why it is safe or not safe: safe, but tiny.
* Risk level: low.
* Recommendation: defer. Low readability payoff.

### 5. Prop Basket / Over-Extraction Check

The extracted components do not appear too prop-heavy. `StatCard`, `SectionBand`, `BarStrip`, `ModeStrip`, `PieChart`, and `TimeRangeSelector` all have clear presentational boundaries.

No extraction appears to make the page harder to understand. These components should remain page-local for now while the stats pages settle.

`StatCard`, `SectionBand`, `BarStrip`, and `PieChart` may eventually be shared across stats pages, but that should happen in a dedicated shared-stats pass.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred these boundaries:

* current-user/session checks remain in `page.tsx`.
* Supabase queries remain in `page.tsx`.
* private reading-session data remains scoped to the current user's `user_books`.
* filler-session filtering remains page-owned.
* time range filtering remains page-owned.
* reading rhythm calculations remain in `page.tsx`.
* stats calculations remain in `page.tsx`.
* chart/list data shaping remains in `page.tsx`.
* event handlers for time range and rhythm expand/collapse remain in `page.tsx`.

Nothing suspicious needs an immediate fix during this audit.

### 7. Architecture Deferred List

* shared types: defer because session and mode types are still page-local and simple.
* helper functions: defer until stats services/view models are introduced.
* access/current-user helper: defer until stats pages share a common loading pattern.
* services/DAOs/controllers: defer because moving Supabase reads and calculations is behavior-aware.
* repeated Supabase loading: defer to a broader stats data-loading cleanup.
* reading rhythm view model: defer because the rhythm section needs cleaner display-ready rows before extraction.
* stats calculation helpers: defer because session mode/page counting affects visible totals.
* chart data helpers: defer until multiple stats pages can share chart view models.
* shared stats UI components: defer until a dedicated shared-stats component pass.

### 8. Browser Smoke Test Suggestions

Manual smoke test checklist:

* logged-in user can open Reading Habits stats.
* logged-out or invalid access behavior still works.
* reading sessions load only for the current user's books.
* filler sessions are excluded.
* time range selector changes the displayed stats.
* top stat cards update with selected range.
* time-by-mode chart and mode strip display correctly.
* reading rhythm calendar displays active/inactive days correctly.
* rhythm expand/collapse works.
* rhythm summary cards update correctly.
* pages-by-mode chart displays correctly.
* session balance bar strip displays correctly.
* empty state works for users with no reading sessions.
* mobile-ish visual check for filters, cards, rhythm grid, charts, and summary cards.

### 9. Final Recommendation

Pause visual thinning here.

This page is readable enough after the first visual pass, but it should stay labeled:

`Visual pass mostly done / architecture deferred`

The only substantial visual chunk left is the reading rhythm section. Do not extract it just for line count. Move it later when there is a cleaner rhythm view model or during a second-pass stats architecture cleanup.
