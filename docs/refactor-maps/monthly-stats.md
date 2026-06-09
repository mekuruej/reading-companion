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

Recommended current status: `Visual pass done / good stopping point`.

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

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass done / good stopping point`

The first visual pass has reached a good stopping point. The page render is now short and mostly composed from page-local presentational components:

* `MonthlyStatsPageHeader`
* `MonthlyStatsErrorBanner`
* `MonthlyTopStatsGrid`
* `MonthlyChartsSection`
* `MonthlyRhythmSection`
* `MonthlyMoodSection`

The lower-level visual pieces are also extracted:

* `MonthlyStatCard`
* `MonthlyChartPanel`
* `PieChart`
* `MonthlySmallMetricCard`

The remaining page code is mostly private current-user data loading, monthly stat calculations, date/month boundaries, chart data shaping, and mood/rhythm derived values. Those are architecture or calculation concerns, not safe first-pass visual JSX.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/community/stats/monthly/page.tsx | 873 | 600 | -273 |`

### 2. Readability Check

The page is easier to scan than before. The render now reads as a compact monthly dashboard outline:

* header
* error banner
* top stats grid
* chart section
* rhythm and mood section

The extracted components are helping readability. The remaining page sections are understandable, and no render area feels visually overwhelming.

The page is still calculation-heavy above the render, but that is expected because monthly stats have many private-data and date-boundary rules.

### 3. Remaining Code Classification

Remaining code is mostly in these buckets:

* access / current-user checks: Supabase session lookup and current-user scoping.
* Supabase loading: `user_books`, monthly reading sessions, and monthly saved words.
* private data boundaries: all loaded activity data is scoped through the signed-in user's own `user_books`.
* month/date helpers: current month start, local date formatting, and this-month filtering.
* paginated/chunked loading: reading sessions and words are fetched by book ID chunks.
* session calculations: filler filtering, Curiosity/Fluid/Listening classification, pages read, minutes by mode.
* saved-word calculations: saved words, unique words, active days from words.
* streak calculations: current streak, best streak, engaged days.
* book/month calculations: books finished this month, book-type page movement.
* chart data shaping: time-by-mode pie, book-type pie, palette assignment.
* mood/rhythm derived values: monthly mood selection and average pages per engaged day.
* helper functions: formatting, chunking, book type labels, word identity, page count logic.
* visual JSX still in `page.tsx`: outer page shell and one small two-column layout wrapper around rhythm/mood.
* component composition: the render wires page-owned derived values into extracted visual components.
* legacy or suspicious code: no obvious visual extraction target remains.

The remaining 600 lines are mostly behavior/calculation/data loading rather than easy presentational JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `MonthlyRhythmMoodGrid`

What JSX it owns:

* the small two-column wrapper around `MonthlyRhythmSection` and `MonthlyMoodSection`.

Why it is safe:

* it is visual-only.

Risk level:

* Low.

Do now or defer:

* Defer. It is too small to improve readability meaningfully.

#### `MonthlyStatsPageShell`

What JSX it owns:

* outer `main` max-width wrapper.

Why it is safe:

* visual-only.

Risk level:

* Low.

Do now or defer:

* Defer. It would not reduce meaningful complexity.

No further low-risk visual extraction is needed before marking this pass complete.

### 5. Prop Basket / Over-Extraction Check

The extracted components are not too prop-heavy.

* `MonthlyStatsPageHeader` and `MonthlyStatsErrorBanner` are simple.
* `MonthlyTopStatsGrid` receives a compact list of stat pairs and loading state.
* `MonthlyChartsSection` has several props, but they are chart-ready values and formatter callbacks, which is acceptable for this visual pass.
* `MonthlyRhythmSection` and `MonthlyMoodSection` receive display-ready labels and do not own calculations.
* `PieChart`, `MonthlyChartPanel`, `MonthlyStatCard`, and `MonthlySmallMetricCard` are clean page-local UI pieces.

Keep these components page-local for now. Shared stats components can be considered later across all stats pages, but that should be a separate pass.

### 6. Behavior Boundary Check

The visual pass does not appear to move or blur:

* Supabase auth/session lookup
* current-user scoping
* `user_books` loading
* joined `books` normalization
* paginated/chunked session loading
* paginated/chunked saved-word loading
* filler-session filtering
* month-boundary behavior
* streak calculation
* page movement calculation
* Listening sessions not counting pages
* Curiosity/Fluid/Listening classification
* saved-word and unique-word calculations
* books-finished-this-month calculation
* book-type aggregation
* chart color meanings

No suspicious behavior-boundary issue was found during this audit.

### 7. Architecture Deferred List

Keep these deferred for later:

* shared types: useful later, but not needed for the completed visual pass.
* Supabase DAO/query helpers: chunked loading and pagination should move only with careful tests.
* controller/load orchestration: current-user and no-data behavior should stay stable until an architecture pass.
* monthly stats service: medium-risk because it owns month boundaries, streaks, page movement, mode classification, and unique word counts.
* formatting helpers: small enough to stay local until service/component boundaries are clearer.
* chart data helpers: should move only if a shared stats view-model pattern emerges.
* shared stats UI components: possible later after more stats pages settle.

### 8. Browser Smoke Test Suggestions

Suggested manual smoke test checklist:

* logged-in user can open Monthly Stats.
* logged-out or invalid access behavior still works.
* user with no books gets an acceptable empty stats display.
* monthly sessions load for the current user's books only.
* monthly saved words load for the current user's books only.
* top stat cards show plausible values.
* current/best streak values display correctly.
* Reading Time chart renders.
* Book Mix chart renders.
* Monthly Rhythm panel renders.
* Monthly Mood panel changes appropriately with activity shape.
* mobile-ish check for header, stat grid, charts, rhythm, and mood sections.

Do not run browser tests unless explicitly requested.

### 9. Final Recommendation

Stop visual thinning here.

The first visual pass is complete. Further work should be second-pass architecture planning around data loading, monthly calculation helpers, date/month boundary logic, and possible shared stats components.

