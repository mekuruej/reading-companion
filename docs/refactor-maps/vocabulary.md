# Vocabulary Refactor Map

Extraction Tasks

## Remaining

- [ ] B. Small metric cards
1. Move: `SmallMetricCard`.
2. Stay in `page.tsx`: rhythm/study calculations and values.
3. Props needed:
    * label
    * value
    * hint
4. Type: presentational UI.
5. Risk: low.
Good first extraction because it is reused inside the rhythm and sticky-book sections.

- [ ] C. Section wrapper
1. Move: `SectionBand`.
2. Stay in `page.tsx`: section order, selected theme, children.
3. Props needed:
    * eyebrow
    * title
    * description
    * children
    * tone
4. Type: presentational UI.
5. Risk: low.
Good first extraction.

- [ ] D. Bar strip
1. Move: `BarStrip`.
2. Stay in `page.tsx`: `wordiestBooks.map(...)`, color choice, suffix.
3. Props needed:
    * items
    * colorClass
    * valueSuffix
4. Type: presentational UI.
5. Risk: low.

- [ ] E. Pie chart
1. Move: `PieChart`.
2. Stay in `page.tsx`: `wordsByBookTypePie`.
3. Props needed:
    * items
    * size
    * formatPercent
4. Type: presentational UI.
5. Risk: low-medium.
It currently calls `formatDecimal`; pass that in later rather than moving helper logic first.

- [ ] F. Book category filter selector
1. Move: the `BOOK_CATEGORY_FILTERS.map(...)` button grid and included-book count.
2. Stay in `page.tsx`: `bookCategoryFilter`, `setBookCategoryFilter`, `BOOK_CATEGORY_FILTERS`, selected filter lookup, filtered metrics.
3. Props needed:
    * filters
    * value
    * onChange
    * bookCount
4. Type: presentational UI with callback.
5. Risk: low-medium.
Keep the filter state and behavior in `page.tsx`.

- [ ] G. Page header
1. Move: back link plus hero/header block.
2. Stay in `page.tsx`: selected theme.
3. Props needed:
    * tone
4. Type: presentational UI.
5. Risk: low.

- [ ] H. Recent words grid
1. Move: the recent saved words empty state and word card grid.
2. Stay in `page.tsx`: `recentWords`, selected label, `SectionBand`.
3. Props needed:
    * words
4. Type: presentational UI.
5. Risk: low-medium.
Simple UI, but make sure optional reading/meaning rendering remains identical.

- [ ] I. Types
1. Move:
    * `SessionMode`
    * `SessionRow`
    * `WordRow`
    * `StudyEventRow`
    * `RawUserBookRow`
    * `UserBookRow`
    * `VocabularyBookMetric`
    * `TypeMetric`
    * `BookCategoryFilter`
2. Stay in `page.tsx`: imports and page composition.
3. Props: none.
4. Type: shared feature types.
5. Risk: low.
Do not move first unless a component extraction needs shared types.

- [ ] J. Data loading
1. Move:
    * `chunkArray`
    * `fetchAllReadingSessionsForBooks`
    * `fetchAllWordsForBooks`
    * `fetchAllStudyEventsForBooks`
    * Supabase user/session and `user_books` load flow
2. Stay in `page.tsx`: `useEffect`, state transitions, loading/error handling at first.
3. Future functions:
    * `dao.ts`: paginated session/word/study-event reads
    * `controller.ts`: `loadVocabularyGrowthForCurrentUser()`
4. Type: data/query logic and controller orchestration.
5. Risk: medium-high.
Not first. Query paging and soft-failure study-event behavior should be preserved.

- [ ] K. Stats calculations
1. Move:
    * `vocabularyBookMetrics`
    * `filteredVocabularyBookMetrics`
    * `filteredVocabularyBookIds`
    * `filteredWords`
    * `filteredStudyEvents`
    * `monthlyWords`
    * `vocabularyTotals`
    * `studySignals`
    * `vocabularyRhythmActivity`
    * `visibleVocabularyRhythmActivity`
    * `vocabularyRhythmSummary`
    * `vocabularyTypeMetrics`
    * `wordsByBookTypePie`
    * `wordiestBooks`
    * `densestBooks`
    * `recentWords`
2. Stay in `page.tsx`: `useMemo` calls at first, or later one `buildVocabularyGrowthViewModel`.
3. Props/inputs needed:
    * rows
    * sessions
    * words
    * studyEvents
    * bookCategoryFilter
    * showFullVocabularyRhythm
4. Type: app-rule/stat calculation logic.
5. Risk: medium-high.
Do after presentational UI is split.

- [ ] L. Helper functions
1. Move:
    * `ymdLocal`
    * `startOfToday`
    * `addDays`
    * `monthStartYmd`
    * `isThisMonth`
    * `sessionPages`
    * `wordKey`
    * `bookTypeLabel`
    * `bookCategoryForBookType`
    * `vocabularyGrowthTheme`
    * `formatDecimal`
    * `formatPercent`
    * `isCorrectStudyEvent`
    * `isIncorrectStudyEvent`
    * `isSkippedStudyEvent`
    * `isKanjiStudyEvent`
2. Stay in `page.tsx`: imports and orchestration.
3. Props: none.
4. Type: helper logic / app-rule logic / UI-theme logic.
5. Risk: low-medium.
Move only once destinations are clear.

Target Architecture Placement
page.tsx
* state
* effects for now
* selected book category state
* rhythm expand/collapse state
* high-level composition
* page loading/error states
* calls into future `dao/controller/service`

components/
* StatCard
* SmallMetricCard
* SectionBand
* BarStrip
* PieChart
* later: `BookCategoryFilterSelector`, `VocabularyHeader`, `RecentWordsGrid`, `VocabularyRhythmSection`

controller.ts
* future orchestration:
    * get current user
    * load user books
    * load reading sessions
    * load saved words
    * load study events
    * handle empty/no-login cases

service.ts
* date helpers
* session page counting
* word keying
* book category grouping
* vocabulary metric building
* totals aggregation
* study signal aggregation
* rhythm day generation
* rhythm summary
* type metric grouping
* chart/model shaping

dao.ts
* Supabase reads:
    * current user/session if desired
    * user books with joined book metadata
    * paginated reading sessions by user book ids
    * paginated saved words by user book ids
    * paginated study events by user book ids

types.ts
* SessionMode
* SessionRow
* WordRow
* StudyEventRow
* RawUserBookRow
* UserBookRow
* VocabularyBookMetric
* TypeMetric
* BookCategoryFilter
* later view-model types.

Old Map
1. types
    * SessionMode
    * SessionRow
    * WordRow
    * StudyEventRow
    * RawUserBookRow
    * UserBookRow
    * VocabularyBookMetric
    * TypeMetric
    * BookCategoryFilter
Future home: `types.ts`

1. constants
    * BOOK_CATEGORY_FILTERS
    * STATS_QUERY_PAGE_SIZE
    * USER_BOOK_ID_CHUNK_SIZE
    * VOCABULARY_RHYTHM_DAY_COUNT
    * COLLAPSED_VOCABULARY_RHYTHM_DAY_COUNT
    * STUDY_EVENT_TABLE
Future home:
* filter/rhythm config: `service.ts` or `types.ts`
* query paging constants/table name: `dao.ts`

1. helper functions
    * Date helpers: `ymdLocal`, `startOfToday`, `addDays`, `monthStartYmd`, `isThisMonth`
    * Stat helpers: `sessionPages`, `wordKey`
    * Label/group helpers: `bookTypeLabel`, `bookCategoryForBookType`
    * Theme helper: `vocabularyGrowthTheme`
    * Format helpers: `formatDecimal`, `formatPercent`
    * Study helpers: `isCorrectStudyEvent`, `isIncorrectStudyEvent`, `isSkippedStudyEvent`, `isKanjiStudyEvent`
    * Query helper: `chunkArray`
Future home:
* app/stat helpers: `service.ts`
* query helper: `dao.ts`
* theme helper: page-level or component/theme helper

1. presentational components already inside page
    * StatCard
    * SmallMetricCard
    * SectionBand
    * BarStrip
    * PieChart
Future home: `components/`

1. state inside `VocabularyGrowthPage`
    * loading
    * errorMsg
    * rows
    * sessions
    * words
    * studyEvents
    * bookCategoryFilter
    * showFullVocabularyRhythm
Future home:
* stays in `page.tsx` for now.

1. data loading
The `useEffect`:
    * gets current Supabase session
    * loads `user_books`
    * joins `books`
    * normalizes joined `books`
    * loads all reading sessions in chunks/pages
    * loads all saved words in chunks/pages
    * loads all study events in chunks/pages
    * filters filler sessions
Future home:
* Supabase queries: `dao.ts`
* orchestration/load flow: `controller.ts`
* page keeps state/useEffect until later.

1. derived/calculated values
    * vocabularyBookMetrics
    * filteredVocabularyBookMetrics
    * filteredVocabularyBookIds
    * filteredWords
    * filteredStudyEvents
    * monthlyWords
    * selectedFilter
    * selectedFilterLabel
    * selectedTheme
    * vocabularyTotals
    * studySignals
    * vocabularyRhythmActivity
    * visibleVocabularyRhythmActivity
    * vocabularyRhythmSummary
    * vocabularyRhythmWindowLabel
    * vocabularyTypeMetrics
    * wordsByBookTypePie
    * wordiestBooks
    * densestBooks
    * recentWords
Future home:
* most calculations: `service.ts`
* selected theme can stay page-level or move later.

1. event handlers
    * category filter button handler:
        * `setBookCategoryFilter(option.value)`
    * rhythm expand/collapse button:
        * `setShowFullVocabularyRhythm((prev) => !prev)`
Future home:
* stays in `page.tsx`.

1. render sections
    * loading state
    * page shell/back link/header
    * error box
    * book category filter selector
    * top stat cards
    * vocabulary rhythm calendar/grid
    * vocabulary rhythm summary cards
    * study rhythm summary
    * answer mix cards
    * sticky study books
    * words by book type pie
    * vocabulary-heavy books
    * densest books
    * vocabulary by category table
    * recent saved words
Future home:
* presentational chunks into `components/`
* page should eventually compose components and pass derived props.

## Finished

- [✔️] Extracted `StatCard`.
- [✔️] Extracted `MetricCards`.
- [✔️] 
- [✔️] 
- [✔️] 
- [✔️] 
- [✔️] 