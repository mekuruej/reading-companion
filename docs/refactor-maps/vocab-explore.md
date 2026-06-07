# Vocab Explore Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/vocab/explore/page.tsx`

Current size: about 699 lines.

## Current Page Purpose

This page explores word history inside one private book.

It lets an authorized owner:
* open a book-scoped word-history view from a `userBookId`
* browse recurring saved words in that book
* search for a word in the book's saved vocabulary
* see where the word appeared, including page/chapter and saved definition
* fall back to a Jisho dictionary lookup when the word is not found in the book
* navigate back to the Book Hub or Vocab List

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks
* full-access checks if added later
* Supabase queries
* search/filter logic
* vocabulary/global/cache behavior
* save/update/delete behavior if added later
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `SeenInstance`: normalized saved `user_book_words` row used in the local word-history result.
* `DictionaryEntry`: normalized Jisho result used when a word is not found in the private book.
* `HistoryPatternItem`: grouped recurring-word item for the browse state.

### 2. Constants

There are no file-level constants.

Implicit constants/copy currently embedded in JSX and handlers:
* page title and description
* recurring-words section copy
* result section headings
* Jisho fallback section labels
* query param names: `userBookId`, `word`
* route paths for Book Hub, Vocab List, and `/api/jisho`

Do not extract these during the first visual pass.

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

* `normalizeJlpt`
* `chapterDisplay`
* `asStringArray`
* `uniqueStrings`

These helpers are used directly by render and search normalization.

### 4. State

Search/input:
* `query`
* `loading`
* `browseLoading`
* `errorMsg`

Authorized book display:
* `bookTitle`
* `bookCover`
* `authorizedUserBookId`

Active local result:
* `surface`
* `reading`
* `definitions`
* `jlpt`
* `isCommon`
* `seenInstances`
* `totalLookupCount`

Jisho fallback result:
* `notFoundEntry`
* `otherMatches`

Browse state:
* `oftenLookedUp`

### 5. Data Loading

Keep all data loading in `page.tsx`.

Authorized book load:
* reads `userBookId` from search params
* requires logged-in user
* loads `user_books` with `.eq("id", userBookId)` and `.eq("user_id", user.id)`
* sets `authorizedUserBookId` only after ownership is verified
* loads joined book title and cover

Initial search:
* if both `initialWord` and `authorizedUserBookId` exist, runs `runSearch(initialWord)`

Browse / recurring words:
* loads visible `user_book_words` for `authorizedUserBookId`
* groups by `surface + reading`
* counts appearances and tracks most recent seen date
* sorts by appearance count, then latest seen
* stores top 10 recurring words

Search:
* loads local `user_book_words` for `authorizedUserBookId` and exact `.eq("surface", q)`
* if local rows exist, uses saved definitions and appearances
* if no local rows exist, gets current session and calls `/api/jisho`
* normalizes Jisho results into `DictionaryEntry`

### 6. Access / Full-Access Checks

Keep in `page.tsx`.

Current access flow:
* route may include `userBookId`
* page does not trust the route param directly
* page calls `supabase.auth.getUser()`
* page verifies the `user_books` row belongs to the logged-in user
* private queries use `authorizedUserBookId`, not raw `userBookId`
* unauthorized users see an error message

No explicit app/full-access feature gate is present in this file.

Do not add or move full-access logic during the visual pass.

### 7. Vocabulary Explore / Search / Filter Behavior

Keep in `page.tsx`.

Explore/browse:
* `shouldShowBrowse` is true when there is no active result and no search text
* recurring words are grouped by exact surface plus reading
* clicking a recurring word routes to `/vocab/explore?userBookId=...&word=...`

Search:
* search input updates `query`
* Enter key runs `runSearch`
* Search button runs `runSearch`
* `runSearch` resets active result state before loading
* local search is exact-surface match against this book's saved words

Clear:
* resets query, error, active local result, fallback result, and other matches
* replaces the URL with only the authorized `userBookId`

### 8. Global Vocabulary / Cache Behavior

No `vocabulary_cache` query or global vocabulary write behavior is present.

Global-ish behavior:
* `/api/jisho` is called only as a fallback when a searched word is not found in this private book.
* The Jisho request sends the Supabase session token when available.

The page does not:
* write to `vocabulary_cache`
* call `/api/vocabulary-kanji-map/generate`
* update global vocabulary data
* save/delete/update `user_book_words`

### 9. Event Handlers

Keep handlers in `page.tsx`.

Main handlers:
* `runSearch`
* `clearSearch`

Inline handlers:
* book summary opens Book Hub
* Vocab List button
* Book Hub button
* search input `onChange`
* search input Enter key
* Search button
* recurring-word browse item click
* Back button
* Clear button

### 10. Derived Values

Keep derived values in `page.tsx` for the first pass.

Search/render state:
* `userBookId`
* `initialWord`
* `hasActiveResult`
* `hasSearchText`
* `shouldShowBrowse`

Local per-instance render:
* `choices`
* `defIndex`
* `chapterDisplay(instance.chapter_number, instance.chapter_name)`

Jisho mapping:
* `mapped`
* `notFoundEntry`
* `otherMatches`

### 11. Render Sections

Current render order:
* page title and description
* optional book summary/nav card
* search input and Search button
* error message
* recurring browse panel, conditional
* local Word History summary, conditional
* local Seen In list, conditional
* Not Found in This Book dictionary fallback, conditional
* Other Possible Matches, conditional
* bottom Back and Clear buttons

## Recommended First-Pass Visual Extractions

Only extract presentational JSX. Keep access, Supabase queries, Jisho lookup, search/filter logic, helper functions, and navigation handlers in `page.tsx`.

### 1. `VocabExplorePageHeader`

What JSX it owns:
* page title
* explanatory subtitle

What stays in `page.tsx`:
* no behavior

Expected props:
* none, or optional `title` / `description`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `VocabExploreBookCard`

What JSX it owns:
* optional book summary/nav card
* cover image
* book title
* “Word history inside this book” copy
* Vocab List and Book Hub buttons

What stays in `page.tsx`:
* `bookTitle`
* `bookCover`
* `authorizedUserBookId`
* router navigation callbacks

Expected props:
* `bookTitle: string`
* `bookCover?: string | null`
* `onOpenBookHub: () => void`
* `onOpenVocabList: () => void`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 2

### 3. `VocabExploreSearchBar`

What JSX it owns:
* search input
* Search button

What stays in `page.tsx`:
* `query`
* `setQuery`
* `runSearch`
* Enter-key behavior can stay in callback props
* `loading`

Expected props:
* `query: string`
* `loading: boolean`
* `onQueryChange: (value: string) => void`
* `onSearch: () => void`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 3

### 4. `RecurringWordsPanel`

What JSX it owns:
* Words I Often Look Up panel
* loading/empty states
* recurring-word list items

What stays in `page.tsx`:
* `shouldShowBrowse`
* `browseLoading`
* `oftenLookedUp`
* route construction and navigation handler

Expected props:
* `loading: boolean`
* `items: HistoryPatternItem[]`
* `onSelectWord: (surface: string) => void`

Category:
* presentational UI

Risk level:
* Low-Medium

Suggested order:
* 4

Why slightly higher than the first three:
* It renders clickable navigation rows with encoded route behavior. Keep route construction in `page.tsx` via `onSelectWord`.

### 5. `WordHistorySummaryCard`

What JSX it owns:
* Word History summary card
* word, reading, JLPT, common tag, appearance count

What stays in `page.tsx`:
* active-result branch
* `normalizeJlpt`

Expected props:
* `surface: string`
* `reading?: string | null`
* `jlpt?: string | null`
* `isCommon?: boolean | null`
* `totalLookupCount: number`
* `normalizeJlpt: (value: string | null | undefined) => string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 5

### 6. `SeenInstancesPanel`

What JSX it owns:
* Seen In section
* empty state
* seen instance cards
* page/chapter display
* saved definition display

What stays in `page.tsx`:
* `seenInstances`
* `asStringArray`
* `chapterDisplay`
* definition-index calculation can either stay as render-local logic or be passed as prepared values later

Expected props:
* `instances: SeenInstance[]`
* `getMeaningChoices: (value: any) => string[]`
* `chapterDisplay: (chapterNumber: number | null, chapterName: string | null) => string`

Category:
* presentational UI

Risk level:
* Low-Medium

Suggested order:
* 6

Why slightly higher:
* It has small definition-index display logic.
* Keep helper functions in `page.tsx` for the first pass.

### 7. `DictionaryFallbackCard`

What JSX it owns:
* Not Found in This Book section
* fallback word/reading display
* definitions list

What stays in `page.tsx`:
* `notFoundEntry` branch

Expected props:
* `entry: DictionaryEntry`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 7

### 8. `OtherMatchesPanel`

What JSX it owns:
* Other Possible Matches section
* match cards

What stays in `page.tsx`:
* `otherMatches.length > 0` branch

Expected props:
* `matches: DictionaryEntry[]`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 8

### 9. `VocabExploreFooterActions`

What JSX it owns:
* bottom Back and Clear buttons

What stays in `page.tsx`:
* `router.back`
* `clearSearch`

Expected props:
* `onBack: () => void`
* `onClear: () => void`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 9

## Suggested Component Location

Keep components local for the first pass:

`app/(protected)/vocab/explore/components/`

Suggested files:
* `VocabExplorePageHeader.tsx`
* `VocabExploreBookCard.tsx`
* `VocabExploreSearchBar.tsx`
* `RecurringWordsPanel.tsx`
* `WordHistorySummaryCard.tsx`
* `SeenInstancesPanel.tsx`
* `DictionaryFallbackCard.tsx`
* `OtherMatchesPanel.tsx`
* `VocabExploreFooterActions.tsx`

Do not promote shared components yet.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `definitions` is set for local results but does not appear to be rendered directly. The page renders saved instance meanings instead.
* Local search uses exact `.eq("surface", q)`. This is probably intentional for book history, but it means reading-only or partial searches are not supported here.
* `isCommon` is shown as plain text while JLPT is shown as a badge; this may be visually inconsistent but is behavior-light.
* `hidden = false` is used for browse recurring words, but `runSearch` does not filter hidden rows. Confirm whether hidden words should appear when searched directly.
* `initialWord` search only runs when `authorizedUserBookId` exists. This is correct for privacy, but raw URL `word` does nothing until authorization completes.
* `clearSearch` uses `authorizedUserBookId` in the replacement URL. If unauthorized or empty, this could produce `userBookId=`; current render still shows the error state.
* `chapterDisplay` is called twice in the same render expression for each seen instance. This is harmless but could be simplified in a visual pass.
* Jisho fallback uses the first Japanese spelling/reading from each result. This matches the current lightweight dictionary preview but may not preserve all Jisho variants.

## Recommended First Pass

1. Extract `VocabExplorePageHeader`.
2. Extract `VocabExploreBookCard`.
3. Extract `VocabExploreSearchBar`.
4. Extract `VocabExploreFooterActions`.
5. Extract `DictionaryFallbackCard`.
6. Extract `OtherMatchesPanel`.
7. Extract `WordHistorySummaryCard`.
8. Extract `RecurringWordsPanel`.
9. Extract `SeenInstancesPanel` last.

Stop there for the first pass.

Leave access checks, Supabase queries, search/filter logic, Jisho/global lookup behavior, helper functions, and navigation logic in `page.tsx`.

* Extracted `VocabExplorePageHeader`
* Extracted `VocabExploreBookCard`
* Extracted `VocabExploreSearchBar`
* Extracted `VocabExploreFooterActions`
* Extracted `DictionaryFallbackCard`
* Extracted `OtherMatchesPanel`
* Extracted `WordHistorySummaryCard`
* Extracted `SeenInstancesPanel`
* Extracted `RecurringWordsPanel`