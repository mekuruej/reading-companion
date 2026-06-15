# Find Your Next Book Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/discovery/find-books/page.tsx`

Current observed size: 386 lines as of 2026-06-15.

## Current Page Purpose

This page helps users discover books from anonymous shared reader-fit signals.

It lets a viewer:
* browse public anonymous book recommendation signals
* filter by reader level and book type
* sort by recency, entertainment, ease, or difficulty
* see anonymous per-reader advice and ratings
* see averaged ratings only when at least two readers have shared signals for a book
* open the viewer's own Book Hub when the discovered book is already in their own library

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks if added later
* Supabase queries
* current-user `user_books` matching query
* shared rating / reader-fit logic
* privacy-sensitive anonymous signal logic
* search/filter/sort logic
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `BookMeta`: normalized book metadata shape derived from public recommendation signal rows.
* `RecommendationSignalRow`: row shape read from `public_book_recommendation_signals`.
* `UserBookMatchRow`: current viewer's own `user_books` row shape used only to link already-owned books.
* `BookRatingSignal`: normalized anonymous individual reader-fit signal.
* `RatedBookGroup`: grouped book display model with aggregate rating fields.
* `SortMode`: sort mode union for the sort select.

### 2. Constants

There are no file-level constants.

Implicit constants/copy currently embedded in JSX and helpers:
* sort mode option labels
* reader level descriptions in `formatReaderLevel`
* page title and explanatory copy
* filter labels and empty/loading copy
* rating tone values: `amber` and `sky`

Do not extract these during the first visual pass.

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

Data and formatting helpers:
* `average`
* `formatAverage`
* `firstBook`
* `cleanReaderAdvice`
* `bookTypeLabel`
* `formatReaderLevel`

Presentational helpers currently local:
* `RatingStars`
* `CompactRatingPill`

### 4. State

Loading / messages:
* `loading`
* `errorMsg`

Loaded data:
* `ratingRows`
* `userBookIdsByBookId`

Filters/sort:
* `sortMode`
* `bookTypeFilter`
* `readerLevelFilter`

### 5. Data Loading

Keep all data loading in `page.tsx`.

Anonymous recommendation signals:
* loads from `public_book_recommendation_signals`
* selects public anonymous fields only:
  * public row `id`
  * `book_id`
  * `reader_level`
  * `book_type`
  * `difficulty_rating`
  * `entertainment_rating`
  * `reader_advice`
  * `updated_at`
  * public book metadata fields
* sorts by `updated_at` descending
* limits to 1000 rows

Current viewer library matching:
* calls `supabase.auth.getUser()`
* if no logged-in user, clears `userBookIdsByBookId`
* collects public book IDs from the loaded signals
* queries `user_books` scoped to the current viewer with `.eq("user_id", user.id)`
* maps matching `book_id -> user_book.id`
* this is used only to link to the viewer's own Book Hub

### 6. Access / Full-Access Checks

No explicit access/full-access gate is present in this file.

Current behavior:
* anonymous/public shared signal data can load from `public_book_recommendation_signals`
* if there is a logged-in user, the page additionally checks that user's own library matches
* if no logged-in user, the page can still show discovery signals but will not show personal Book Hub links

Do not add or move access/full-access logic during the visual pass.

### 7. Book Discovery / Rating / Reader-Fit Behavior

Keep all reader-fit behavior in `page.tsx`.

Grouping:
* rows are grouped by `book_id`
* each group becomes a `RatedBookGroup`
* individual rows become anonymous `BookRatingSignal` entries
* signals are sorted newest-first within each book

Averages:
* average entertainment and difficulty are calculated per grouped book
* average rating panel is shown only when a book has at least two signals
* single-reader books show individual signals only, avoiding an overconfident aggregate

Reader advice:
* `reader_advice` is trimmed and truncated to 120 characters by `cleanReaderAdvice`
* advice is displayed per anonymous signal, not as a book-level summary

### 8. Privacy-Sensitive `user_books` or Profile Usage

Current privacy boundary is good and important.

Public/shared data:
* discovery data comes from `public_book_recommendation_signals`
* the public view does not expose source `user_id` or source `user_book_id`
* anonymous reader level comes from the public signal view
* no `profiles` query is used here

Private/current-user data:
* the only `user_books` query is scoped to the logged-in viewer:
  * `.eq("user_id", user.id)`
  * `.in("book_id", bookIds)`
* this query is used only to show “In your library · Open Book Hub”
* the Book Hub link uses the viewer's own `user_books.id`
* the recommender's private `user_book_id` is not used

Do not move or broaden this logic during a visual extraction.

### 9. Search / Filter / Sort Behavior

There is no free-text search input.

Filters:
* `readerLevelFilter`
* `bookTypeFilter`

Filter option generation:
* `bookTypeOptions` derives unique types from `ratingRows`
* `readerLevelOptions` derives unique reader levels from `ratingRows`

Sort modes:
* `recent`
* `rating`
* `rating_low`
* `ease`
* `difficulty`

Sort behavior:
* `recent`: latest signal date descending
* `rating`: entertainment high to low
* `rating_low`: entertainment low to high
* `ease`: difficulty low to high
* `difficulty`: difficulty high to low

### 10. Event Handlers

Keep handlers in `page.tsx`.

Inline event handlers:
* reader level select `onChange`
* book type select `onChange`
* sort select `onChange`

Navigation:
* Discovery Hub `Link`
* owned-book Book Hub `Link`

No save/update/delete handlers are present.

### 11. Derived Values

Keep derived values in `page.tsx` for the first pass.

* `bookTypeOptions`
* `readerLevelOptions`
* `ratedBookGroups`

Inside group derivation:
* normalized `BookMeta`
* filtered row inclusion
* sorted signals
* `latestSignalAt`
* `averageEntertainmentRating`
* `averageDifficultyRating`

Inside render:
* `shouldShowAverageRatings`
* `readerCountLabel`
* viewer-owned `userBookId`

### 12. Render Sections

Current render order:
* page shell
* Discovery Hub back link
* page eyebrow, title, description
* error banner
* Reader-fit filters section
* reader level select
* book type select
* sort select
* results section
* loading state
* empty state
* book result cards
* cover/no-cover display
* book metadata
* in-your-library link, conditional
* average ratings card, conditional
* anonymous reader signal list
* reader advice panel, conditional
* compact per-signal rating pills

## Recommended First-Pass Visual Extractions

Only extract presentational JSX. Keep access, Supabase queries, privacy-sensitive current-user matching, shared rating logic, grouping, filtering, sorting, helper functions, and navigation logic in `page.tsx`.

### 1. `FindBooksPageHeader`

What JSX it owns:
* Discovery Hub back link
* page eyebrow
* page title
* explanatory copy

What stays in `page.tsx`:
* no data behavior

Expected props:
* none, or optional `title` / `description`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `FindBooksErrorBanner`

What JSX it owns:
* amber error/message banner

What stays in `page.tsx`:
* `errorMsg` state
* decision to show the banner

Expected props:
* `message: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 2

### 3. `FindBooksFilterPanel`

What JSX it owns:
* Reader-fit filters card
* section title and helper copy
* reader level select
* book type select
* sort select

What stays in `page.tsx`:
* filter/sort state
* option derivation
* `formatReaderLevel`
* `bookTypeLabel`
* all `onChange` handlers

Expected props:
* `readerLevelFilter: string`
* `bookTypeFilter: string`
* `sortMode: SortMode`
* `readerLevelOptions: string[]`
* `bookTypeOptions: string[]`
* `formatReaderLevel: (value: string | null | undefined) => string`
* `bookTypeLabel: (value: string | null | undefined) => string`
* `onReaderLevelChange: (value: string) => void`
* `onBookTypeChange: (value: string) => void`
* `onSortModeChange: (value: SortMode) => void`

Category:
* presentational UI

Risk level:
* Low-Medium

Suggested order:
* 3

Why slightly higher:
* It contains several controls that drive filter/sort behavior.
* Keep the actual filter/sort logic in `page.tsx`.

### 4. `FindBooksResultsState`

What JSX it owns:
* loading state card
* empty state card

What stays in `page.tsx`:
* `loading`
* `ratedBookGroups.length`
* decision to render result cards

Expected props:
* `type: "loading" | "empty"`
* optional `message?: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 4

### 5. `RatingStars`

What JSX it owns:
* existing average rating star card

What stays in `page.tsx`:
* `formatAverage` helper for first pass, or pass formatted value later
* rating values

Expected props:
* `label: string`
* `value: number | null`
* `tone: "amber" | "sky"`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 5

Note:
* This component already exists inside `page.tsx`. Moving it to a local component file is low risk.

### 6. `CompactRatingPill`

What JSX it owns:
* existing per-signal compact rating pill

What stays in `page.tsx`:
* `formatAverage` helper for first pass, or pass formatted value later
* rating values

Expected props:
* `label: string`
* `value: number | null`
* `tone: "amber" | "sky"`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 6

Note:
* This component already exists inside `page.tsx`. Moving it to a local component file is low risk.

### 7. `BookRecommendationCard`

What JSX it owns:
* full book result card
* cover/no-cover display
* book type/title/author
* in-your-library link, conditional
* average ratings panel, conditional
* signal list shell

What stays in `page.tsx`:
* `ratedBookGroups` derivation
* `userBookIdsByBookId`
* `bookTypeLabel`
* `formatReaderLevel`
* `shouldShowAverageRatings`
* `readerCountLabel`

Expected props:
* `book: RatedBookGroup`
* `userBookId?: string`
* `bookTypeLabel: (value: string | null | undefined) => string`
* `formatReaderLevel: (value: string | null | undefined) => string`

Category:
* presentational UI

Risk level:
* Low-Medium

Suggested order:
* 7

Why slightly higher:
* It is the largest extraction and contains conditional average/privacy-sensitive display choices.
* Keep the data grouping and owned-book matching in `page.tsx`.

### 8. `ReaderSignalCard`

What JSX it owns:
* individual anonymous reader signal row
* formatted reader level
* advice block
* compact rating pills

What stays in `page.tsx`:
* signal data
* `formatReaderLevel`
* `bookTypeLabel`

Expected props:
* `signal: BookRatingSignal`
* `bookType: string | null`
* `bookTypeLabel: (value: string | null | undefined) => string`
* `formatReaderLevel: (value: string | null | undefined) => string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 8

## Suggested Component Location

Keep components local for the first pass:

`app/(protected)/discovery/find-books/components/`

Suggested files:
* `FindBooksPageHeader.tsx`
* `FindBooksErrorBanner.tsx`
* `FindBooksFilterPanel.tsx`
* `FindBooksResultsState.tsx`
* `RatingStars.tsx`
* `CompactRatingPill.tsx`
* `BookRecommendationCard.tsx`
* `ReaderSignalCard.tsx`

Do not promote shared discovery/stats components yet.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `BookMeta` is a normalized shape created by `firstBook`, not a direct joined row. The name is fine but could be clearer later.
* `firstBook` returns `book_metadata_type ?? book_type`, while filter grouping uses `row.book_type ?? book.book_type`. This preserves row-level type first, then public book metadata type.
* `cleanReaderAdvice` truncates advice to 120 characters. This is a product choice worth confirming, since advice may be more useful if expandable later.
* The page has no free-text search despite the request category often being called search/filter/sort. Current behavior is filter/sort only.
* Ratings use text star characters instead of icons. This is simple and stable, but visual extraction could make it easier to replace later.
* `userBookIdsByBookId` only maps one current-user `user_books` row per global `book_id`. If a user has duplicate library copies of the same book, the last reduced row wins.
* There is no explicit app/full-access gate in this file. That may be intentional for discovery, but it should remain a conscious privacy/product decision.
* The page depends on `public_book_recommendation_signals` retaining the safe anonymous boundary. Do not regress this to direct private `user_books` / `profiles` queries.

## Recommended First Pass

1. Extract `FindBooksPageHeader`.
2. Extract `FindBooksErrorBanner`.
3. Extract `FindBooksResultsState`.
4. Extract `RatingStars`.
5. Extract `CompactRatingPill`.
6. Extract `FindBooksFilterPanel`.
7. Extract `ReaderSignalCard`.
8. Extract `BookRecommendationCard` last.

Stop there for the first pass.

Leave Supabase queries, anonymous/shared signal logic, current-user library matching, privacy-sensitive boundaries, filter/sort derivation, helpers, and page-local types in `page.tsx`.

* Extracted `FindBooksPageHeader`
* Extracted `FindBooksErrorBanner`
* Extracted `FindBooksResultsState`
* Extracted `RatingStars`
* Extracted `CompactRatingPill`
* Extracted `FindBooksFilterPanel`
* Extracted `ReaderSignalCard`
* Extracted `BookRecommendationCard`

## Current Refactor Audit, 2026-06-15

Current observed line count:

* `app/(protected)/discovery/find-books/page.tsx`: 386 lines

Extracted visual components:

* `FindBooksPageHeader`
* `FindBooksErrorBanner`
* `FindBooksResultsState`
* `RatingStars`
* `CompactRatingPill`
* `FindBooksFilterPanel`
* `ReaderSignalCard`
* `BookRecommendationCard`

These match the recommended first visual pass.

Suggested components intentionally left in the page:

* No major suggested visual components remain page-local.
* Helper functions and grouping/filter/sort derivations remain page-local.

Risk-boundary check:

The page still owns Supabase reads from `public_book_recommendation_signals`, the current-viewer `user_books` matching query, anonymous signal grouping, average calculations, advice truncation, filter/sort logic, and privacy-sensitive Book Hub link selection. No extraction appears to have moved private/current-user matching or public-signal logic into visual components.

Current status:

Visual pass mostly done. Good stopping point. Architecture deferred.

Updated tracker row:

```md
- [x] | Visual pass mostly done / good stopping point / architecture deferred | `app/(protected)/discovery/find-books/page.tsx` | 618 | 386 | -232 |
```
