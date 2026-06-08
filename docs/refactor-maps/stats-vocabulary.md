# Vocabulary Stats Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/community/stats/vocabulary/page.tsx`

Current size: 1464 lines.

## Current Page Purpose

This page shows the current user's vocabulary growth and study rhythm.

It lets a signed-in user:
* view all-time saved vocabulary totals
* compare unique words, monthly words, pages counted, and words per page
* filter vocabulary stats by broad book category
* see saved-word and study-event rhythm over the recent 90 days or full past year
* see book-linked study signals and sticky study words
* compare vocabulary by book type, word volume, and words per page
* view recently saved words

Important current behavior:
* the page is scoped to the logged-in user
* private vocabulary data is loaded through the current user's own `user_books`
* study-event rows are loaded only through the current user's own `user_book_ids`
* this page currently focuses on book categories, word volume, study rhythm, and density, not JLPT/common-word/color-stage breakdowns

## Current Risks / Do Not Touch Yet

For visual/status work, do not move or change:
* access/current-user checks
* Supabase queries
* private vocabulary data boundaries
* saved-word loading
* reading-session loading
* study-event loading
* book/category filter behavior
* stats calculations
* rhythm/day bucket calculations
* chart data calculations
* helper functions
* services, DAOs, controllers, hooks, or page-local types

## Current Structure Map

### Types

Keep in `page.tsx` for now:
* `SessionMode`
* `SessionRow`
* `WordRow`
* `StudyEventRow`
* `RawUserBookRow`
* `UserBookRow`
* `VocabularyBookMetric`
* `TypeMetric`
* `BookCategoryFilter`

### Constants

Keep in `page.tsx` for now:
* `BOOK_CATEGORY_FILTERS`
* `STATS_QUERY_PAGE_SIZE`
* `USER_BOOK_ID_CHUNK_SIZE`
* `VOCABULARY_RHYTHM_DAY_COUNT`
* `COLLAPSED_VOCABULARY_RHYTHM_DAY_COUNT`
* `STUDY_EVENT_TABLE`

### Helper Functions

Keep in `page.tsx` for now:
* date helpers: `ymdLocal`, `startOfToday`, `addDays`, `monthStartYmd`, `isThisMonth`
* reading/session helpers: `sessionPages`
* vocabulary identity helper: `wordKey`
* book category helpers: `bookTypeLabel`, `bookCategoryForBookType`
* theme helper: `vocabularyGrowthTheme`
* formatting helpers: `formatDecimal`, `formatPercent`
* study-event helpers: `isCorrectStudyEvent`, `isIncorrectStudyEvent`, `isSkippedStudyEvent`, `isKanjiStudyEvent`
* query helpers: `chunkArray`, `fetchAllReadingSessionsForBooks`, `fetchAllWordsForBooks`, `fetchAllStudyEventsForBooks`

### State

Current state:
* `loading`
* `errorMsg`
* `rows`
* `sessions`
* `words`
* `studyEvents`
* `bookCategoryFilter`
* `showFullVocabularyRhythm`

### Data Loading

Current load behavior:
* gets the current Supabase session
* redirects to `/login` when no user is present
* loads the logged-in user's own `user_books` joined to `books`
* derives `userBookIds` from those owned rows
* loads reading sessions, saved words, and study events through those `userBookIds`
* filters filler sessions out
* stores loaded rows in page state

Do not move this in a visual pass.

### Derived Values

Current derived values include:
* `vocabularyBookMetrics`
* `filteredVocabularyBookMetrics`
* `filteredVocabularyBookIds`
* `filteredWords`
* `filteredStudyEvents`
* `monthlyWords`
* selected filter/theme labels
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

## Extracted Visual Components

Current page-local components:
* `VocabularyHeader`
* `BookCategoryFilterSelector`
* `StatCard`
* `SmallMetricCard`
* `SectionBand`
* `BarStrip`
* `PieChart`
* `RecentWordsGrid`

These are intentionally local to:

`app/(protected)/community/stats/vocabulary/components/`

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status label:

`Visual pass done / good stopping point`

This status fits because the first visual pass already extracted the page header, stat cards, section shell, bar strip, pie chart, category filter selector, small metric cards, and recent words grid. The remaining 1464 lines are mostly current-user data loading, private saved-word/study-event loading, book-category filtering, rhythm calculations, study-signal calculations, chart data derivation, and a few complex section-specific render branches.

The current tracker row can change from `Visual pass done / architecture deferred` to `Visual pass done / good stopping point`.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/community/stats/vocabulary/page.tsx | 1765 | 1464 | -301 |`

### 2. Readability Check

The page is easier to scan than before. The extracted components make the render output read as sections and data views rather than repeated card/chart markup.

The extracted components are helping readability. `SectionBand`, `StatCard`, `SmallMetricCard`, `BarStrip`, `PieChart`, `BookCategoryFilterSelector`, and `RecentWordsGrid` are all useful visual boundaries.

The remaining page sections are understandable, but the vocabulary rhythm section is still visually dense because it renders the day-grid heatmap, legend, summary cards, narrative copy, study-signal metrics, answer mix, and sticky-book list in one section.

The areas that still feel visually overwhelming are the vocabulary rhythm grid and the "Books with sticky study words" cards. Those are display-heavy, but they are coupled to derived activity/study-signal data and should not be extracted just to reduce line count.

### 3. Remaining Code Classification

Access / current-user checks:
* Supabase session lookup.
* redirect to `/login` when missing a user.
* all private data is scoped through the current user's own `user_books`.

Supabase loading:
* `user_books` joined to `books`.
* reading sessions through owned `user_book_ids`.
* saved words through owned `user_book_ids`.
* study events through owned `user_book_ids`.

Vocabulary summary loading:
* saved words are loaded directly from `user_book_words`.
* vocabulary metrics are derived from saved words, sessions, and owned books.
* no separate vocabulary summary/cache table appears to be used by this page.

Book/category filter behavior:
* broad category filter groups book types into all, image-supported, bridge books, and text-dense.
* the selected category filters book metrics, words, study events, charts, and recent words.

JLPT/common-word calculations:
* no JLPT breakdown is currently present.
* no common/uncommon breakdown is currently present.
* if those are desired later, they should be a feature pass rather than part of this visual wrap-up.

Color/stage calculations:
* no Library Study color/stage breakdown is currently present.
* the only color behavior here is chart/section visual theming and study-rhythm heatmap colors.

Recent word display behavior:
* recent words are derived from filtered saved words and passed to `RecentWordsGrid`.

Chart/stat calculations:
* totals, unique words, monthly words, words per page.
* study signal counts, accuracy, answer mix, sticky-book list.
* rhythm day buckets and summary counts.
* book type pie data.
* wordiest and densest book lists.

Derived values:
* many derived values remain in `page.tsx`, which is appropriate for now because they encode page behavior and chart meaning.

Helper functions:
* date helpers, category helpers, study-event helpers, formatting helpers, and fetch helpers remain local.

Visual JSX still in `page.tsx`:
* loading shell.
* error banner.
* category section wrapper.
* stat-card grid composition.
* vocabulary rhythm heatmap.
* study rhythm narrative card.
* answer mix mini cards.
* sticky study words book cards.
* word-density custom bars.
* vocabulary category table.

Component composition:
* the active render path now composes local visual components clearly.
* remaining inline JSX is section-specific and data-driven.

Legacy or suspicious code:
* `STUDY_EVENT_TABLE` comment says to change it if needed; this is fine, but it is a little manual/config-like.
* JLPT/common-word/color-stage concepts are absent from the current page despite being common vocabulary-stat topics.
* `wordsSaved` uses total saved word rows while `uniqueWords` uses `surface::reading::meaning`; this is intentional-looking but should be remembered when interpreting the page.

Overall, the remaining 1464 lines are mostly calculations/data loading/architecture rather than easy visual JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `VocabularyRhythmHeatmap`

What JSX it owns:
* the 90-day/year day-grid heatmap.
* month labels.
* day cell colors and tooltips.
* saved/studied legend.

Why it is safe or not safe:
* It is visually coherent, but it contains several inline display calculations for intensity, month starts, title text, and color class. Extracting it would require passing activity arrays, labels, and possibly calculation helpers.

Expected risk level:
* Medium.

Do now or defer:
* Defer. It is the biggest visual candidate, but not needed for the first pass.

#### `VocabularyRhythmSummaryPanel`

What JSX it owns:
* the "Study rhythm" card.
* narrative copy.
* unique words/books/accuracy cards.
* answer mix mini cards.

Why it is safe or not safe:
* Mostly presentational, but it receives several derived model shapes and embeds narrative conditions. It is a reasonable future visual extraction, but not required now.

Expected risk level:
* Medium.

Do now or defer:
* Defer.

#### `StickyStudyBooksPanel`

What JSX it owns:
* "Books with sticky study words" section.
* empty state.
* sticky book cards and metric cards.

Why it is safe or not safe:
* It is a clean visual chunk, but it depends on `studySignals.bookStudyItems`, accuracy formatting, and sticky-percent calculation.

Expected risk level:
* Low-medium.

Do now or defer:
* Defer unless this section becomes visually harder to work with.

#### `WordsPerPagePanel`

What JSX it owns:
* densest-book list.
* empty state.
* inline progress bars.

Why it is safe or not safe:
* Low-risk visually, but small enough that extraction would mainly move a local section into another file.

Expected risk level:
* Low.

Do now or defer:
* Defer.

#### `VocabularyTypeTable`

What JSX it owns:
* book type table.
* empty row.

Why it is safe or not safe:
* This is likely the safest remaining visual extraction. It receives `vocabularyTypeMetrics` and `formatDecimal`.

Expected risk level:
* Low.

Do now or defer:
* Defer. The existing page is already readable enough, and this would not materially improve the architecture.

### 5. Prop Basket / Over-Extraction Check

No extracted component appears too prop-heavy. The current components have healthy visual boundaries and small prop surfaces.

The extraction did not make the page harder to understand. `SectionBand`, `StatCard`, `SmallMetricCard`, `BarStrip`, and `PieChart` make the stats layout easier to scan.

Components that should stay local and page-specific:
* `VocabularyHeader`
* `BookCategoryFilterSelector`
* `RecentWordsGrid`

Components that might eventually become shared, but should stay local for now:
* `StatCard`
* `SmallMetricCard`
* `SectionBand`
* `BarStrip`
* `PieChart`

Do not move shared stats components yet. Several stats pages have similar local components, but shared stats UI should be a separate coordinated pass after more pages finish first-pass thinning.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred:
* access/current-user checks.
* Supabase queries.
* private vocabulary data boundaries.
* saved-word summary loading.
* book/category filters.
* recent word selection.
* chart/stat calculation behavior.

There are no current JLPT/common-word/color-stage calculations in this page to protect from visual extraction. If they are added later, they should be implemented as feature work with their own data and privacy review.

The extracted components are presentational. They do not own Supabase loading, current-user scoping, private word selection, or stats calculations.

### 7. Architecture Deferred List

Shared types:
* Defer because the row shapes match this page's Supabase selects and may differ from other stats pages.

Helper functions:
* Defer because the helpers encode page-specific time windows, study-event meaning, and category grouping.

Stats calculation helpers:
* Defer because totals, unique words, rhythm summaries, and study signals are the core behavior of the page and need test examples before movement.

Chart data helpers:
* Defer until there is a shared stats chart/data-view model pattern.

Filter helpers:
* Defer because the category grouping is product-language specific and may change with future book-type cleanup.

Services / DAOs / controllers:
* Defer because current-user scoped private data loading should remain easy to audit until a broader stats data layer exists.

Repeated Supabase loading:
* Defer because this page deliberately loads sessions, words, and study events through owned `user_book_ids`; extracting query helpers should preserve that boundary.

Shared stats UI components:
* Defer. Shared stats components should be a separate pass across stats pages, not done inside this page's wrap-up.

### 8. Browser Smoke Test Suggestions

Manual smoke checklist:
* Log in and open `/community/stats/vocabulary`.
* Confirm logged-out behavior redirects to `/login`.
* Confirm vocabulary totals load for the current user only.
* Confirm the book category filter changes totals, rhythm, charts, book examples, and recent words.
* Confirm the current absence of JLPT/common-word/color-stage sections is intentional or captured as future feature work.
* Confirm saved/studied rhythm cells display and the 90-day/year toggle works.
* Confirm study signal cards and answer mix appear when study events exist.
* Confirm sticky study books display correctly when study events exist.
* Confirm book type pie chart displays correctly.
* Confirm vocabulary-heavy books bar chart displays correctly.
* Confirm words-per-page density list displays correctly.
* Confirm vocabulary category table displays correctly.
* Confirm recent words display correctly.
* Confirm empty states work for a user with no saved words or no data in a selected category.
* Check mobile-ish layout for header, filters, stat cards, rhythm grid, charts, table, and recent words.

Do not run this smoke test during this doc-only audit unless specifically requested.

### 9. Final Recommendation

Recommendation:

Stop visual thinning here.

The first visual pass reached a good stopping point. The next useful work is either a second-pass stats architecture plan or a feature-specific pass if you want JLPT, common/uncommon, or Library Study color/stage breakdowns added to this page. Do not do another visual extraction just to reduce line count.
