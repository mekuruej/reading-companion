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

