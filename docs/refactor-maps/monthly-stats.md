# Monthly Stats Refactor Map

## Current Page Purpose

`app/(protected)/community/stats/monthly/page.tsx` is the monthly reading detail page for the signed-in reader.

It helps the user understand this month's reading rhythm by showing:
* reading/activity streaks
* days engaged this month
* pages read this month
* saved words and unique saved words
* books finished this month
* reading and listening session counts
* time split across Curiosity, Fluid, and Listening sessions
* book-type mix by page movement
* monthly rhythm summary metrics
* a monthly mood summary based on how the month has gone

The page displays private/user-book activity data:
* the current user's `user_books`
* joined `books.book_type`
* `user_book_reading_sessions`
* `user_book_words`

It does not currently edit data. It only reads monthly activity and renders derived stats.

## Current Risks / Do Not Touch Yet

For the first pass, do not move or change:
* Supabase auth/session lookup
* current-user scoping
* `user_books` loading
* joined `books` normalization, especially because Supabase joins may return an object or array
* paginated/chunked `user_book_reading_sessions` loading
* paginated/chunked `user_book_words` loading
* `isMounted` guard behavior in the load effect
* signed-out and no-user-books empty behavior
* loading and error state behavior
* filler-session filtering
* date/month boundary helpers
* streak calculation
* page movement calculation from `start_page` and `end_page`
* Listening sessions not counting pages
* Curiosity vs Fluid vs Listening mode classification
* saved-word and unique-word calculations
* book-finished-this-month calculation
* book-type aggregation and sorting
* chart color meanings

There are no access/ownership writes, timer controls, save behavior, controlled form inputs, or saved-word edit/filter controls on this page. The main risk is accidentally changing private data loading or monthly stat calculations.

Keep state, handlers, calculations, helper functions, and data fetching in `page.tsx` for the visual/page-thinning pass.

## Current Code Inventory

### Types

* `SessionMode`
* `SessionRow`
* `WordRow`
* `RawUserBookRow`
* `UserBookRow`
* `BookTypeMetric`
* `MonthlyStats`
* `PieItem`

### Constants

* `STATS_QUERY_PAGE_SIZE`
* `USER_BOOK_ID_CHUNK_SIZE`
* `bookTypePalette`

### Helper Functions

* `emptyMonthlyStats`
* `ymdLocal`
* `monthStartYmd`
* `isThisMonth`
* `sessionPages`
* `wordKey`
* `bookTypeLabel`
* `buildStreakStats`
* `formatMinutes`
* `formatPageCount`
* `chunkArray`
* `fetchMonthlySessionsForBooks`
* `fetchMonthlyWordsForBooks`

### State

* `loading`
* `errorMsg`
* `stats`

### Data Loading

The page has one `useEffect` load flow that:
* gets the current Supabase session
* resets to empty stats for signed-out users
* loads the current user's `user_books`
* joins `books.book_type`
* normalizes joined book rows
* exits early if there are no user books
* fetches monthly reading sessions by user-book chunks
* fetches monthly saved words by user-book chunks
* filters filler sessions
* derives all monthly stat values
* sets `stats`
* catches errors and resets to empty stats
* uses `isMounted` to avoid setting state after unmount

### Derived / Calculated Values

Calculated inside the loading flow:
* normalized `books`
* `userBookIds`
* `monthStart`
* `sessions`
* `words`
* `filteredSessions`
* `filteredWords`
* `activeDays`
* `bookTypeByUserBookId`
* `bookTypeMap`
* `pagesRead`
* `curiosityMinutes`
* `fluidMinutes`
* `listeningMinutes`
* `readingSessions`
* `listeningSessions`
* `streaks`
* `uniqueWords`
* `booksFinished`
* `bookTypeMetrics`

Calculated in render scope:
* `topStats`
* `totalReadingMinutes`
* `totalEngagementMinutes`
* `timeByModePie`
* `bookTypePie`
* `monthlyMood`

### Event Handlers

There are no interactive event handlers besides the page-load effect and the `Link` back to Stats Home.

### Render Sections

* page shell
* Back to Stats Home link
* page header and intro copy
* error banner
* top stat card grid
* Reading Time chart panel
* Book Mix chart panel
* Monthly Rhythm panel
* Monthly Mood panel

## First Pass: Visual / Page-Thinning Components

This first pass should be presentational only. Components should receive already-computed values and callbacks, if any are later added. Do not move calculations, Supabase logic, state, or helper functions yet.

The suggested components below are ordered from easiest / lowest-risk to more complex: A, B, C, and onward.


## Later Architecture Refactor

Do not implement these during the first visual pass. Keep them here so the ideas are not lost.

### Shared Types

* Possible file/layer: `types.ts`
* What logic might move later:
  * `SessionMode`
  * `SessionRow`
  * `WordRow`
  * `RawUserBookRow`
  * `UserBookRow`
  * `BookTypeMetric`
  * `MonthlyStats`
  * `PieItem`
* Why it should wait:
  * The first pass can keep types local until component prop contracts prove which types need sharing.
* Risks to check before moving it:
  * overlap with other stats pages
  * avoiding a too-general stats type too early

### Supabase Query Organization

* Possible file/layer: `dao.ts`
* What logic might move later:
  * `chunkArray`
  * `fetchMonthlySessionsForBooks`
  * `fetchMonthlyWordsForBooks`
  * paging constants
  * current user's `user_books` query
* Why it should wait:
  * Query paging and chunk behavior are important for large libraries and should not move during visual cleanup.
* Risks to check before moving it:
  * preserving pagination
  * preserving date filters
  * Supabase object/array join normalization
  * error behavior

### Controller / Load Orchestration

* Possible file/layer: `controller.ts`
* What logic might move later:
  * `loadMonthlyStatsForCurrentUser`
  * auth/session handling
  * no-user and no-books empty-state handling
  * orchestration of user-book, session, and word loads
  * final handoff to service calculation
* Why it should wait:
  * Loading state, error state, and `isMounted` behavior should stay visible until the UI is safely thinned.
* Risks to check before moving it:
  * state update cancellation
  * no-login behavior
  * no-book behavior
  * error messages

### Monthly Stats Service

* Possible file/layer: `service.ts`
* What logic might move later:
  * `emptyMonthlyStats`
  * `ymdLocal`
  * `monthStartYmd`
  * `isThisMonth`
  * `sessionPages`
  * `wordKey`
  * `bookTypeLabel`
  * `buildStreakStats`
  * monthly aggregation into `MonthlyStats`
  * `topStats` shaping
  * `timeByModePie` shaping
  * `bookTypePie` shaping
  * `monthlyMood` selection
* Why it should wait:
  * These calculations encode app rules. Move them later with focused fixtures or tests.
* Risks to check before moving it:
  * timezone and month-boundary behavior
  * active days from both sessions and saved words
  * current streak ending today
  * best streak across this month only vs active data loaded
  * listening minutes not counting pages
  * Curiosity/Fluid split
  * unique-word identity
  * book type labels and sorting

### Formatting Helpers

* Possible file/layer: `service.ts`, `helpers.ts`, or component-local helpers
* What logic might move later:
  * `formatMinutes`
  * `formatPageCount`
* Why it should wait:
  * Small helpers can remain local until components or service extraction makes their future home obvious.
* Risks to check before moving it:
  * pluralization
  * hour/minute formatting
  * chart total labels vs card labels

### Reusable Stats Components

* Possible file/layer: page-local `components/` first, shared stats components later
* What logic might move later:
  * stat cards
  * chart panel shell
  * pie chart
  * small metric cards
* Why it should wait:
  * Page-local extraction should come first. Promote shared components only after monthly, vocabulary, reading ability, and other stats pages show stable common needs.
* Risks to check before moving it:
  * chart colors carry meaning
  * panel tone differences
  * copy and empty-state differences across stats pages

## Suggested Target Structure

Use this only as a planning guide:

```text
app/(protected)/community/stats/monthly/
  page.tsx
  components/
  controller.ts
  service.ts
  dao.ts
  types.ts
```

For the first actual code changes, prefer low-risk presentational components only. Do not move data loading, calculations, helper functions, services, DAOs, controllers, or types yet unless there is a clear reason after the visual pass.

## Suggested Status Labels

* Not started
* Visual pass in progress
* Visual pass mostly done
* Visual pass done / architecture deferred
* Architecture pass later
* Architecture pass in progress
* Architecture pass done

Recommended current status: `Not started`.

A future status of `Visual pass done / architecture deferred` should mean the safe presentational extraction pass is complete and deeper architecture work is intentionally saved for later.

## Finished

- [✔️] Extracted `MonthlyStatsPageHeader`.
- [✔️] Extracted `MonthlyStatsErrorBanner`.
- [✔️] Extracted `MonthlyTopStatsGrid`.
- [✔️] Extracted `MonthlyStatCard`.
- [✔️] Extracted `MonthlyChartPanel`.
- [✔️] Extracted `PieChart`.
- [✔️] Extracted `MonthlyRhythmSection`.
- [✔️] Extracted `MonthlyMoodSection`.
- [✔️] Extracted `MonthlySmallMetricCard`.
- [✔️] Extracted `MonthlyChartsSection`.
- [✔️] Extracted

