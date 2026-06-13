# Discovery Hub Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/discovery/page.tsx`

Original size: about 542 lines.

Current observed size after visual extraction pass: 463 lines.

Current status: `Visual pass done / good stopping point`.

The first safe presentational extraction pass has been completed. The page now imports local discovery components from:

`app/(protected)/discovery/components/`

Extracted components:
* `DiscoveryHubHeader`
* `DiscoveryErrorBanner`
* `DiscoveryCardGrid`
* `DiscoveryPreviewState`
* `DiscoveryPreviewBookCard`
* `DiscoveryPreviewSection`

The `DiscoveryNavCard` work appears to be owned internally by the card grid/component layer rather than directly by `page.tsx`.

Data loading, anonymous public signal mapping, grouping/filtering/sorting, route choices, helper functions, and page-local display types remain in `page.tsx`, which is the intended first-pass boundary.

Remaining cleanup candidates:
* `Link` is still imported in `page.tsx`, but navigation is now rendered through extracted components.
* `SortMode`, `sortMode`, `setSortMode`, `bookTypeFilter`, `setBookTypeFilter`, `readerLevelFilter`, and `setReaderLevelFilter` remain even though the hub does not render visible controls for them.
* `bookTypeOptions` and `readerLevelOptions` are derived but not rendered.
* `profileLevelsByUserId` is always reset to `{}`.
* `effectiveReaderLevel` still supports profile fallback even though mapped public signal rows set `user_id: null`.
* `bookSignalSentence` appears unused.
* `PublicRecommendationSignalRow.reader_advice` is selected but not displayed on this hub preview.
* The preview calculates average entertainment and difficulty ratings, but currently displays latest-signal difficulty only.

These are behavior-aware cleanup candidates, not first-pass visual extraction work.

## Current Page Purpose

This page is the Discovery Hub.

It lets users:
* navigate to the main discovery tools
* open Find Your Next Book
* open Dictionary
* open Word History
* preview recently shared anonymous reader-fit book signals

The page now uses the safer anonymous shared-signal boundary through `public_book_recommendation_signals`.

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks if added later
* full-access checks if added later
* Supabase queries
* shared/community/discovery signal logic
* navigation behavior
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `BookMeta`: normalized book metadata used by the preview cards.
* `UserBookRatingRow`: older-compatible row shape used after mapping anonymous public signal rows.
* `PublicRecommendationSignalRow`: direct row shape read from `public_book_recommendation_signals`.
* `BookRatingSignal`: normalized individual anonymous rating signal.
* `RatedBookGroup`: grouped book display model for the preview section.
* `SortMode`: sort mode union used by the derived grouping/sorting logic.

### 2. Constants

Keep in `page.tsx` for the first pass.

File-level constants:
* `discoveryCards`: the three main navigation cards.

Embedded constants/copy:
* reader level descriptions in `formatReaderLevel`
* rating tones: `amber`, `sky`
* page header copy
* loading/error/empty copy
* preview section labels
* sort modes and filter defaults

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

Data and formatting helpers:
* `average`
* `formatAverage`
* `firstBook`
* `effectiveReaderLevel`
* `bookTypeLabel`
* `formatReaderLevel`
* `bookSignalSentence`

Presentational helpers currently local:
* `RatingStars`
* `HubDifficultyRating`

### 4. State

Loading / message state:
* `loading`
* `errorMsg`

Loaded data:
* `ratingRows`
* `profileLevelsByUserId`

Filter/sort state:
* `sortMode`
* `bookTypeFilter`
* `readerLevelFilter`

### 5. Data Loading

Keep all data loading in `page.tsx`.

Current load behavior:
* runs once in `useEffect`
* loads from `public_book_recommendation_signals`
* selects public anonymous signal fields plus public book metadata fields
* orders by `updated_at` descending
* limits to 1000 rows
* maps public signal rows into the older `UserBookRatingRow`-compatible shape
* sets `user_id: null`
* clears `profileLevelsByUserId` to `{}`
* stores mapped rows in `ratingRows`

Current privacy boundary:
* no private `user_books` query is present on this hub page
* no `profiles` query is present
* source user IDs and source user book IDs are not loaded

### 6. Access / Full-Access Checks

No explicit access or full-access checks are present in this file.

Current behavior:
* the page is under the protected route group
* the page reads public anonymous discovery signals
* it does not load private current-user library data
* it does not load other-user private data

Do not add, move, or redesign access/full-access behavior during the visual pass.

### 7. Discovery Navigation / Card Behavior

Keep navigation data and `Link` behavior in `page.tsx` for the first visual pass.

Current navigation cards:
* Find Your Next Book -> `/discovery/find-books`
* Dictionary -> `/discovery/dictionary`
* Word History -> `/discovery/word-history`

Additional navigation:
* preview section CTA -> `/discovery/find-books`

The cards are static navigation. They do not save state or trigger data mutations.

### 8. Shared / Community / Discovery Signal Behavior

Keep shared signal behavior in `page.tsx`.

Current behavior:
* reads anonymous book recommendation data from `public_book_recommendation_signals`
* treats each row as a reader-fit signal
* groups rows by public `book_id`
* uses public reader level from the signal row
* uses public book metadata fields from the signal row
* calculates average entertainment and difficulty ratings for each grouped book
* sorts grouped books by the selected `sortMode`
* previews the first four grouped books

Important privacy note:
* this page should continue using the public anonymous signal view
* it should not regress to direct public/community reads from private `user_books`
* it should not query `profiles` for public rating previews

### 9. Event Handlers

Current event handlers are minimal.

Inline handlers / navigation:
* `Link` navigation for the three main cards
* `Link` navigation to Find Your Next Book

State setters exist for filter/sort state, but no visible controls currently call:
* `setSortMode`
* `setBookTypeFilter`
* `setReaderLevelFilter`

Do not introduce new filter controls during the first visual extraction unless that is a separate explicit task.

### 10. Derived Values

Keep derived values in `page.tsx` for the first pass.

* `bookTypeOptions`
* `readerLevelOptions`
* `ratedBookGroups`

Inside `ratedBookGroups`:
* groups rows by book ID
* applies book type filter
* applies reader level filter
* sorts each book's signals newest-first
* calculates latest signal date
* calculates average entertainment rating
* calculates average difficulty rating
* sorts grouped books by `sortMode`

### 11. Render Sections

Current render sections:
* page shell / max-width wrapper
* centered page header
* error banner
* three-card discovery navigation grid
* Find Your Next Book preview panel
* preview panel header and CTA
* loading state
* empty state
* four recent rated book preview cards
* preview card cover / placeholder
* preview card title, author/type, reader level
* preview card difficulty rating

## First-Pass Visual Extractions

Status: completed.

Only extract presentational UI. Keep data loading, derivation, navigation data, helpers, and page-local types in `page.tsx`.

### 1. `DiscoveryHubHeader`

What JSX it owns:
* top centered eyebrow
* `Discovery Hub` title
* description paragraph

What stays in `page.tsx`:
* page shell
* loaded data
* query logic
* routing/navigation data

Expected props:
* `eyebrow: string`
* `title: string`
* `description: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `DiscoveryErrorBanner`

What JSX it owns:
* amber error message banner

What stays in `page.tsx`:
* `errorMsg` state
* load/catch behavior

Expected props:
* `message: string | null`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 2

### 3. `DiscoveryCardGrid`

What JSX it owns:
* grid wrapper for the main discovery navigation cards
* maps `cards` to `DiscoveryNavCard`

What stays in `page.tsx`:
* `discoveryCards` constant
* navigation destinations

Expected props:
* `cards: Array<{ title: string; href: string; eyebrow: string; description: string; className: string }>`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 3

### 4. `DiscoveryNavCard`

What JSX it owns:
* one colored navigation card
* eyebrow
* title
* description
* arrow pill
* `Link` wrapper

What stays in `page.tsx`:
* card data source
* route choices

Expected props:
* `title: string`
* `href: string`
* `eyebrow: string`
* `description: string`
* `className: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 4

### 5. `DiscoveryPreviewSection`

What JSX it owns:
* white rounded preview panel
* preview section header
* CTA link to Find Your Next Book
* grid wrapper for loading/empty/cards

What stays in `page.tsx`:
* `loading`
* `ratedBookGroups`
* `bookTypeLabel`
* `formatReaderLevel`
* all derived grouping/filter/sort logic

Expected props:
* `loading: boolean`
* `books: RatedBookGroup[]`
* `formatReaderLevel: (value: string | null | undefined) => string`
* `bookTypeLabel: (value: string | null | undefined) => string`

Category:
* presentational UI

Risk level:
* Low-medium because it receives derived display models and local formatter callbacks.

Suggested order:
* 5

### 6. `DiscoveryPreviewBookCard`

What JSX it owns:
* one recently rated book preview card
* cover image / placeholder
* title
* author or book type
* latest reader level
* difficulty rating display

What stays in `page.tsx`:
* grouping/sorting
* decision to show only first four books
* helper functions

Expected props:
* `book: RatedBookGroup`
* `bookTypeLabel: (value: string | null | undefined) => string`
* `formatReaderLevel: (value: string | null | undefined) => string`

Category:
* presentational UI

Risk level:
* Low-medium because it depends on the local `RatedBookGroup` type and `HubDifficultyRating`.

Suggested order:
* 6

### 7. `DiscoveryPreviewState`

What JSX it owns:
* loading copy
* empty-state copy

What stays in `page.tsx`:
* actual loading state
* actual empty-state condition

Expected props:
* `loading: boolean`
* `isEmpty: boolean`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 7

### 8. `RatingStars`

What JSX it owns:
* compact star rating panel
* label
* numeric rating
* filled star overlay

What stays in `page.tsx`:
* `formatAverage`
* rating derivation
* actual rating values

Expected props:
* `label: string`
* `value: number | null`
* `tone: "amber" | "sky"`
* optionally `formatAverage: (value: number | null) => string`

Category:
* presentational UI

Risk level:
* Low-medium. It is presentational, but moving it before deciding whether it should be shared with `/discovery/find-books` could create duplication churn.

Suggested order:
* 8

### 9. `HubDifficultyRating`

What JSX it owns:
* wrapper around `RatingStars` for a latest signal's difficulty rating
* null render when no difficulty rating exists

What stays in `page.tsx`:
* latest-signal selection
* `bookTypeLabel`

Expected props:
* `signal: BookRatingSignal`
* `bookType: string | null`
* optionally `bookTypeLabel: (value: string | null | undefined) => string`

Category:
* presentational UI

Risk level:
* Low-medium. It is small, so it may not be worth extracting until the preview card is extracted.

Suggested order:
* 9

## Suggested Component Location

Use page-local discovery components for the first pass:

`app/(protected)/discovery/components/`

Possible files:
* `DiscoveryHubHeader.tsx`
* `DiscoveryErrorBanner.tsx`
* `DiscoveryCardGrid.tsx`
* `DiscoveryNavCard.tsx`
* `DiscoveryPreviewSection.tsx`
* `DiscoveryPreviewBookCard.tsx`
* `DiscoveryPreviewState.tsx`

Keep `RatingStars` and `HubDifficultyRating` local until it is clear whether they should be shared with `/discovery/find-books`.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `UserBookRatingRow` is an older name now that this page maps anonymous public signals into that shape. It may be clearer later as `DiscoverySignalDisplayRow`.
* `profileLevelsByUserId` is always reset to `{}` and there is no longer a `profiles` query. It appears to be leftover from the older direct/private rating pattern.
* `effectiveReaderLevel` still supports profile fallback, but because `user_id` is now always `null`, the fallback path is probably no longer used.
* `bookTypeOptions` is derived but there are no visible book type filter controls in this hub page.
* `readerLevelOptions` is derived but there are no visible reader level filter controls in this hub page.
* `sortMode`, `bookTypeFilter`, and `readerLevelFilter` still affect `ratedBookGroups`, but there are no visible controls to change them.
* `setSortMode`, `setBookTypeFilter`, and `setReaderLevelFilter` are created but not used by rendered controls.
* `bookSignalSentence` appears unused in the current render.
* `RatingStars` uses literal `*` characters for stars. That is fine for now, but it may be visually inconsistent with future icon-based discovery cards.
* `PublicRecommendationSignalRow.reader_advice` is loaded but not shown on the hub preview. This may be intentional because advice belongs on the full Find Your Next Book page.
* The preview currently shows latest-signal difficulty only. It calculates average entertainment and average difficulty, but the hub preview does not display those averages.

## Completed First Pass

Completed extraction order:

1. Extracted `DiscoveryHubHeader`.
2. Extracted `DiscoveryErrorBanner`.
3. Extracted `DiscoveryCardGrid`.
4. Extracted `DiscoveryPreviewState`.
5. Extracted `DiscoveryPreviewBookCard`.
6. Extracted `DiscoveryPreviewSection`.

Good stopping point reached for the first visual pass.

Do not move:
* anonymous signal loading
* grouping/filtering/sorting
* public signal privacy logic
* helper functions
* types
* navigation card data

After the visual pass, the page can be revisited for cleanup of unused filter/profile remnants, but that should be a separate behavior-aware cleanup pass.

## Current Tracker Row

`- [x] Visual pass done / good stopping point | app/(protected)/discovery/page.tsx | 542 | 463 | -79 |`
