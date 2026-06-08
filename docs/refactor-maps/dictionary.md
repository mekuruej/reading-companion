# Dictionary Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/discovery/dictionary/page.tsx`

Current size: about 468 lines.

## Current Page Purpose

This page is the Discovery Dictionary.

It lets users:
* search Japanese words through the local `/api/jisho` route
* view dictionary entries, readings, meanings, JLPT labels, and common-word labels
* see whether searched words already exist in the user's own library color progress
* load basic kanji info for kanji in each result
* load related Jisho words that use the same kanji
* jump from a dictionary result to Word History

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks if added later
* full-access checks if added later
* Supabase queries
* dictionary lookup logic
* Jisho/API calls
* kanji extras loading
* vocabulary/global/cache behavior
* search behavior
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `DictionaryEntry`: normalized Jisho result used by the render.
* `KanjiMeta`: basic kanji info shown in the Kanji Info panel.
* `RelatedWord`: related word shape from extra Jisho lookups.
* `KanjiGroup`: related words grouped by kanji character.
* `LearningSettingsRow`: user learning settings needed for color status calculation.
* `LibraryWordSummaryRow`: current user's library word summary shape.

### 2. Constants

Keep in `page.tsx` for the first pass.

File-level constants:
* `DEFAULT_LEARNING_SETTINGS`

Embedded constants/copy:
* page title and description
* search placeholder
* loading labels
* error copy
* section labels: `Kanji Info`, `Words Using These Kanji`
* Word History link text
* JLPT fallback label: `NON-JLPT`
* Jisho and kanjiapi endpoint URL strings

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

Normalization helpers:
* `normalizeJlpt`
* `normalizeText`
* `normalizeKana`
* `studyIdentityKey`

Kanji helper:
* `getUniqueKanji`

Imported helpers:
* `computeLibraryStudyColorStatus`

### 4. State

Search state:
* `query`
* `results`
* `loading`
* `errorMsg`

Dictionary extras:
* `extraLoadingWord`
* `kanjiMetaByWord`
* `kanjiGroupsByWord`

Personal library color status:
* `learningSettings`
* `summaryCountsByKey`

### 5. Data Loading

Keep all data loading in `page.tsx`.

Initial query loading:
* reads `word` from `useSearchParams`
* sets it as `initialWord`
* initializes `query` from `initialWord`
* runs `runSearch(initialWord)` when an initial word exists

Dictionary search:
* `runSearch` trims the current query
* gets the current Supabase session with `supabase.auth.getSession()`
* calls `/api/jisho?keyword=...`
* sends `Authorization: Bearer <session.access_token>` when available
* maps Jisho response rows into `DictionaryEntry[]`
* stores mapped results
* calls `loadLibraryStatuses(mapped)`
* calls `loadDictionaryExtras(surface)` for each unique surface

Dictionary extras:
* `loadDictionaryExtras(surface)` extracts unique kanji from the surface
* calls `https://kanjiapi.dev/v1/kanji/{kanji}` for stroke count
* calls `/api/jisho?keyword={kanji}` for related words
* sends the Supabase session token to `/api/jisho` when available
* stores results in `kanjiMetaByWord` and `kanjiGroupsByWord`

Personal library color status:
* `loadLibraryStatuses(entries)` builds `surface + reading` identity keys
* gets the logged-in user with `supabase.auth.getUser()`
* loads `user_learning_settings` with `.eq("user_id", user.id)`
* loads `user_library_word_summaries` with `.eq("user_id", user.id)` and `.in("study_identity_key", keys)`
* stores encounter counts by identity key

### 6. Access / Full-Access Checks

No explicit access or full-access gate is present in this file.

Current behavior:
* dictionary lookup can run through `/api/jisho`
* if a Supabase session exists, the session token is sent to `/api/jisho`
* personal library color status is loaded only for the logged-in user from `supabase.auth.getUser()`
* if no user exists, library status loading returns without personal data

Do not add, move, or redesign access/full-access behavior during the visual pass.

### 7. Dictionary / Search / Jisho Behavior

Keep dictionary and search behavior in `page.tsx`.

Search behavior:
* query comes from the input or `word` search param
* pressing Enter runs `runSearch`
* clicking Search runs `runSearch`
* empty searches return early
* each new search clears results and summary counts
* failed searches show an error message
* empty Jisho result sets show `No results found.`

Jisho behavior:
* primary lookup calls the local `/api/jisho` route
* result mapping uses the first Japanese entry for `word` and `reading`
* meanings come from all senses' English definitions
* JLPT value uses the first Jisho JLPT entry if present
* common-word status uses `item.is_common`

Extra Jisho behavior:
* per-kanji related-word lookup also calls `/api/jisho`
* related words use the first Japanese entry and first sense
* related words exclude the current surface
* related words are limited to three per kanji

### 8. Vocabulary / Global / Cache Behavior

No direct `vocabulary_cache` or global vocabulary table query is present in this page.

Vocabulary-adjacent behavior:
* personal library color status is based on `user_library_word_summaries`
* identity matching uses `studyIdentityKey(surface, reading)`
* color status is calculated with `computeLibraryStudyColorStatus`
* `LibraryColorBadge` is shown only when the current user has an encounter count for that identity

Important current identity behavior:
* dictionary status lookup uses surface + normalized reading
* this is safer than surface-only matching for same-kanji/different-reading entries

### 9. Event Handlers

Keep handlers in `page.tsx`.

Inline handlers:
* search input `onChange` updates `query`
* search input `onKeyDown` runs `runSearch` on Enter
* Search button `onClick` runs `runSearch`

Navigation:
* `Link` to `/discovery/word-history?word=...`

No save/update/delete handlers are present.

### 10. Derived Values

Keep derived values in `page.tsx` for the first pass.

Per result render:
* `key = studyIdentityKey(entry.word, entry.reading)`
* `encounterCount = summaryCountsByKey[key] ?? 0`
* `status = computeLibraryStudyColorStatus(...)`
* `showBadge = encounterCount > 0`
* normalized JLPT label from `normalizeJlpt(entry.jlpt)`
* current word's kanji metadata from `kanjiMetaByWord[entry.word]`
* current word's related kanji groups from `kanjiGroupsByWord[entry.word]`

### 11. Render Sections

Current render sections:
* page shell / max-width wrapper
* page title and description
* search input and Search button
* error message
* results list
* result card header with word and optional color badge
* reading line
* meanings list
* JLPT/common labels
* Kanji Info panel
* Words Using These Kanji panel
* Word History link

## Recommended First-Pass Visual Extractions

Only extract presentational UI. Keep data loading, search behavior, API calls, helper functions, and page-local types in `page.tsx`.

### 1. `DictionaryHeader`

What JSX it owns:
* `Dictionary` title
* description paragraph

What stays in `page.tsx`:
* search params
* query state
* search/load behavior

Expected props:
* `title: string`
* `description: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `DictionarySearchForm`

What JSX it owns:
* search input
* Search button
* loading button label

What stays in `page.tsx`:
* `query` state
* `setQuery`
* `runSearch`
* Enter-key behavior decision

Expected props:
* `query: string`
* `loading: boolean`
* `onQueryChange: (value: string) => void`
* `onSearch: () => void`

Category:
* presentational UI

Risk level:
* Low-medium because it receives search callbacks but does not own search logic.

Suggested order:
* 2

### 3. `DictionaryErrorMessage`

What JSX it owns:
* small red error message

What stays in `page.tsx`:
* `errorMsg` state
* search/catch behavior

Expected props:
* `message: string | null`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 3

### 4. `DictionaryResultsList`

What JSX it owns:
* results spacing wrapper
* maps entries to result cards

What stays in `page.tsx`:
* result loading
* search behavior
* per-entry derived status if keeping derivation in page

Expected props:
* `results: DictionaryEntry[]`
* `query: string`
* `summaryCountsByKey: Record<string, number>`
* `learningSettings: LearningSettingsRow`
* `extraLoadingWord: string | null`
* `kanjiMetaByWord: Record<string, KanjiMeta[]>`
* `kanjiGroupsByWord: Record<string, KanjiGroup[]>`

Category:
* presentational UI

Risk level:
* Medium. It touches several local types and display-only derived values, so it should come after smaller extractions.

Suggested order:
* 4

### 5. `DictionaryResultCard`

What JSX it owns:
* one result card
* word header
* optional library color badge
* reading line
* meanings section
* JLPT/common labels
* Kanji Info panel
* Words Using These Kanji panel
* Word History link

What stays in `page.tsx`:
* Jisho mapping
* library status query
* extras query
* helper functions
* status derivation can either stay in page and be passed in, or remain page-local until a second pass

Expected props:
* `entry: DictionaryEntry`
* `query: string`
* `encounterCount: number`
* `learningSettings: LearningSettingsRow`
* `extraLoadingWord: string | null`
* `kanjiMeta: KanjiMeta[]`
* `kanjiGroups: KanjiGroup[]`

Category:
* presentational UI

Risk level:
* Medium because it is a large JSX extraction and uses several local helpers/components.

Suggested order:
* 5

### 6. `DictionaryMeaningsList`

What JSX it owns:
* meaning card list
* meaning number labels

What stays in `page.tsx`:
* meaning extraction/mapping from Jisho response

Expected props:
* `word: string`
* `reading: string`
* `meanings: string[]`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 6

### 7. `DictionaryEntryBadges`

What JSX it owns:
* JLPT pill
* Common pill

What stays in `page.tsx`:
* `normalizeJlpt`
* entry data

Expected props:
* `jlpt: string | null | undefined`
* `isCommon: boolean | null | undefined`
* `normalizeJlpt: (value: string | null | undefined) => string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 7

### 8. `DictionaryKanjiInfoPanel`

What JSX it owns:
* Kanji Info panel
* loading state
* empty state
* kanji/stroke pills

What stays in `page.tsx`:
* kanjiapi fetch behavior
* `kanjiMetaByWord` state

Expected props:
* `isLoading: boolean`
* `kanjiMeta: KanjiMeta[]`

Category:
* presentational UI

Risk level:
* Low-medium because it depends on async extra-loading state.

Suggested order:
* 8

### 9. `DictionaryRelatedKanjiWordsPanel`

What JSX it owns:
* Words Using These Kanji panel
* empty state
* group headings
* related word rows

What stays in `page.tsx`:
* related-word Jisho lookup behavior
* `kanjiGroupsByWord` state

Expected props:
* `groups: KanjiGroup[]`

Category:
* presentational UI

Risk level:
* Low-medium

Suggested order:
* 9

### 10. `DictionaryWordHistoryLink`

What JSX it owns:
* Word History link wrapper

What stays in `page.tsx`:
* choice of fallback query value

Expected props:
* `word: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 10

## Suggested Component Location

Use page-local dictionary components for the first pass:

`app/(protected)/discovery/dictionary/components/`

Possible files:
* `DictionaryHeader.tsx`
* `DictionarySearchForm.tsx`
* `DictionaryErrorMessage.tsx`
* `DictionaryResultsList.tsx`
* `DictionaryResultCard.tsx`
* `DictionaryMeaningsList.tsx`
* `DictionaryEntryBadges.tsx`
* `DictionaryKanjiInfoPanel.tsx`
* `DictionaryRelatedKanjiWordsPanel.tsx`
* `DictionaryWordHistoryLink.tsx`

Keep helper functions, types, API calls, data loading, and search behavior in `page.tsx`.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `KanjiMeta.radical` is always set to `null`, so the radical display path currently never appears.
* `kanjiapi.dev` is called directly from the client, unlike Jisho, which goes through `/api/jisho`. That may be fine for now, but it is a different API boundary.
* `loadDictionaryExtras` calls `supabase.auth.getSession()` inside the loop for each kanji. This works, but it may be unnecessarily repeated.
* Extra lookups run for every unique result surface immediately after a search. For broad searches, this can create many client-side requests.
* `extraLoadingWord` tracks only one word, but multiple `loadDictionaryExtras` calls can run at the same time. The loading label may not represent all pending extras accurately.
* `kanjiMetaByWord` and `kanjiGroupsByWord` are not cleared at the start of a new search. Old entries are keyed by surface, so this is not obviously wrong, but stale cache behavior should be intentional.
* Result keys include `idx`, which is stable enough for current display but not ideal if result ordering changes within the same search.
* `normalizeJlpt(entry.jlpt)` is called more than once per render for each entry.
* The page does not show an explicit empty pre-search state. That may be fine because the search form is the primary UI.

## Recommended First Pass

Suggested safest order:

1. Extract `DictionaryHeader`.
2. Extract `DictionaryErrorMessage`.
3. Extract `DictionarySearchForm`.
4. Extract `DictionaryMeaningsList`.
5. Extract `DictionaryEntryBadges`.
6. Extract `DictionaryKanjiInfoPanel`.
7. Extract `DictionaryRelatedKanjiWordsPanel`.
8. Extract `DictionaryWordHistoryLink`.
9. Extract `DictionaryResultCard`.
10. Extract `DictionaryResultsList`.

Stop there for the first visual pass.

Do not move:
* `/api/jisho` calls
* kanjiapi calls
* Supabase session/user loading
* user learning settings query
* user library summary query
* search behavior
* dictionary result mapping
* kanji extras loading
* helper functions
* types

After the visual pass, the page can be revisited for API-boundary cleanup, repeated session loading, and extra-lookup throttling/caching. Those should be separate behavior-aware passes.
