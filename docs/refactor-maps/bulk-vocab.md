# Bulk Vocab Refactor Map

Extraction Tasks

## Current Page Purpose

`app/(protected)/vocab/bulk/page.tsx` is a step-based bulk vocabulary import flow for a single user book.

It currently lets the user:
* open the page with a `userBookId`
* load the target book title and cover
* paste many Japanese words
* preview words through the Jisho API
* fetch kanji stroke metadata
* choose or edit definitions
* add page/chapter metadata in bulk or row by row
* save the final words to Supabase with page ordering
* return to the book hub or vocab list

## Current Risks / Do Not Touch Yet

Do not move or change these in the first pass:
* `getStrokeData`
* `normalizeJlpt`
* `parseWords`
* `extractMeaningChoices`
* `toNullableInt`
* URL `userBookId` loading
* book info Supabase load
* localStorage chapter persistence
* `handlePreview`
* `handleSaveDefinitions`
* `handleSaveAll`
* `applyBulkField`
* `applyBulkColumnList`
* `parseColumnLines`
* `getIncompleteWordLabels`
* `resetForMore`
* `updateItem`
* `chooseMeaning`
* page ordering logic
* Supabase/API/database logic
* validation and confirmation behavior

The first code changes should only move visual JSX into components and keep all state, handlers, validation, and data flow in `page.tsx`.

## Remaining

- [ ] A. Page header and book context card
1. Move: the top `<h1>`, the conditional book card, and the missing-`userBookId` hint.
2. Stay in `page.tsx`: `router.push` calls, `resetForMore`, `step`, `userBookId`, `bookTitle`, `bookCover`.
3. Props needed:
    * userBookId
    * bookTitle
    * bookCover
    * step
    * onOpenBookHub
    * onOpenVocabList
    * onResetForMore
4. Type: presentational UI with navigation/action callbacks.
5. Risk: low-medium.
Good early extraction, but keep navigation functions in `page.tsx` so the component only calls callbacks.

- [ ] B. Message banner
1. Move: the `message ? (...) : null` block that renders success/error text.
2. Stay in `page.tsx`: all message setting and message text creation.
3. Props needed:
    * message
4. Type: presentational UI.
5. Risk: low.
Good first extraction because it is small and behavior-free.

- [ ] C. Save button bar
1. Move: `SaveBar`.
2. Stay in `page.tsx`: `handleSaveDefinitions`, `handleSaveAll`, `isSaving`.
3. Props needed:
    * label
    * onClick
    * disabled
4. Type: presentational UI with callback.
5. Risk: low.
This is already a local UI helper and is one of the safest first moves.

- [ ] D. Paste words panel
1. Move: the Step 1 card, instructions, textarea, and preview button.
2. Stay in `page.tsx`: `rawInput`, `setRawInput`, `wordCount`, `isPreviewing`, and `handlePreview`.
3. Props needed:
    * rawInput
    * wordCount
    * isPreviewing
    * onRawInputChange
    * onPreview
4. Type: presentational UI with callback.
5. Risk: low-medium.
The form submit behavior must stay exactly the same; pass `handlePreview` in unchanged.

- [ ] E. Step intro card
1. Move: repeated step heading/instruction cards for Step 2 and Step 3 into a small `BulkStepIntroCard`.
2. Stay in `page.tsx`: conditional step rendering and step labels/copy.
3. Props needed:
    * title
    * description
4. Type: presentational UI.
5. Risk: low.
This removes repeated visual markup without touching step logic.

- [ ] F. Definition review item
1. Move: one Step 2 `<li>` card for reading/definition selection.
2. Stay in `page.tsx`: `items.map`, `updateItem`, `chooseMeaning`, `BulkItem` state.
3. Props needed:
    * item
    * index
    * onUpdateItem
    * onChooseMeaning
4. Type: presentational UI with callbacks.
5. Risk: medium.
Use after smaller extractions. It touches controlled inputs and definition-choice behavior, so the callback wiring must be careful.

- [ ] G. Bulk apply fields panel
1. Move: the Step 3 bulk single-value page/chapter form card.
2. Stay in `page.tsx`: bulk field state, setters, `applyBulkField`, `recentAction`.
3. Props needed:
    * bulkPageNumber
    * bulkChapterNumber
    * bulkChapterName
    * recentAction
    * onBulkPageNumberChange
    * onBulkChapterNumberChange
    * onBulkChapterNameChange
    * onApplyBulkField
4. Type: presentational UI with callbacks.
5. Risk: medium.
Keep `applyBulkField` in `page.tsx`; this component should only render inputs/buttons.

- [ ] H. Bulk column paste panel
1. Move: the Step 3 row-by-row paste card.
2. Stay in `page.tsx`: column list state, setters, `applyBulkColumnList`, `recentAction`.
3. Props needed:
    * bulkPageList
    * bulkChapterNumberList
    * bulkChapterNameList
    * recentAction
    * onBulkPageListChange
    * onBulkChapterNumberListChange
    * onBulkChapterNameListChange
    * onApplyBulkColumnList
4. Type: presentational UI with callbacks.
5. Risk: medium.
Do after `BulkApplyFieldsPanel`; the pattern is similar but has more textarea state.

- [ ] I. Detail edit item
1. Move: one Step 3 `<li>` row for per-word page/chapter edits and reading support checkbox.
2. Stay in `page.tsx`: `items.map`, `updateItem`, `BulkItem` state.
3. Props needed:
    * item
    * index
    * onUpdateItem
4. Type: presentational UI with callback.
5. Risk: medium.
This is controlled-input-heavy, so it should not be the first extraction.

- [ ] J. Done panel
1. Move: the final Step Done card.
2. Stay in `page.tsx`: `step === "done"` conditional.
3. Props: none.
4. Type: presentational UI.
5. Risk: low.
Very safe, but small. Good companion to another first-pass extraction.

## Recommended First Extraction

Start with:
1. `BulkMessageBanner`
2. `BulkSaveBar`
3. `BulkStepIntroCard`
4. `BulkDonePanel`

These are the safest because they do not own data loading, validation, API calls, Supabase writes, parsing, preview generation, bulk application logic, or item mutation logic.

After that, extract `BulkPasteWordsPanel`, then the more input-heavy item/panel components.

Target Architecture Placement
page.tsx
* all state
* effects
* URL/userBookId loading
* book info loading
* localStorage persistence
* preview/import flow
* save flow
* validation and confirmations
* all handlers for now
* high-level step composition

components/
* BulkVocabHeader
* BulkMessageBanner
* BulkSaveBar
* BulkStepIntroCard
* BulkPasteWordsPanel
* BulkDefinitionReviewItem
* BulkApplyFieldsPanel
* BulkColumnPastePanel
* BulkDetailEditItem
* BulkDonePanel

controller.ts
* future orchestration only, not first:
    * preview words
    * save definitions step transition
    * save all words
    * reset flow

service.ts
* future app/helper logic only, not first:
    * parse words
    * normalize JLPT
    * extract meanings
    * incomplete word detection
    * page/chapter bulk application
    * payload shaping

dao.ts
* future query/API logic only, not first:
    * load book info
    * get current user
    * fetch Jisho API if kept page-local API boundary
    * fetch kanji stroke data if moved
    * query existing page order rows
    * upsert words

types.ts
* BulkItem
* BulkStep
* later component prop/view-model types if needed.


Old Map
1. types
    * BulkItem
    * BulkStep
Future home: `types.ts`

1. constants
    * KANJI_REGEX
Future home:
* likely `service.ts` or `dao.ts`, depending whether kanji stroke lookup stays treated as fetch/query behavior.

1. helper functions
    * `getStrokeData`
    * `normalizeJlpt`
    * `parseWords`
    * `extractMeaningChoices`
    * `toNullableInt`
    * `flashAction`
    * `updateItem`
    * `chooseMeaning`
    * `applyBulkField`
    * `parseColumnLines`
    * `applyBulkColumnList`
    * `getIncompleteWordLabels`
    * `resetForMore`
Future home:
* keep all in `page.tsx` for now.
* later, pure helpers can move to `service.ts`.
* data/API helpers can move to `dao.ts`.
* action orchestration can move to `controller.ts`.

1. presentational components/helpers already inside page
    * SaveBar
Future home: `components/BulkSaveBar.tsx`

1. state inside `BulkVocabPage`
    * userBookId
    * bookTitle
    * bookCover
    * step
    * bulkPageNumber
    * bulkChapterNumber
    * bulkChapterName
    * bulkPageList
    * bulkChapterNumberList
    * bulkChapterNameList
    * rawInput
    * items
    * message
    * isPreviewing
    * isSaving
    * recentAction
Future home:
* stays in `page.tsx` for now.

1. data loading
The effects and handlers:
    * read `userBookId` from URL
    * load saved chapter info from localStorage
    * load book title/cover from Supabase
    * persist chapter info to localStorage
    * preview words through `/api/jisho`
    * fetch kanji stroke data from kanjiapi
    * get current Supabase user
    * query existing page order rows
    * upsert `user_book_words`
Future home:
* keep in `page.tsx` for now.
* later Supabase/API boundaries can move to `dao.ts`.
* orchestration can move to `controller.ts`.

1. derived/calculated values
    * wordCount
Future home:
* stays in `page.tsx`; no reason to move early.

1. event handlers
    * book hub navigation
    * vocab list navigation
    * raw input change
    * preview submit
    * reading/meaning item updates
    * meaning choice selection
    * save definitions
    * bulk field apply
    * bulk column list apply
    * detail item updates
    * hide-kanji checkbox updates
    * save all
    * reset for more
Future home:
* keep in `page.tsx` for now.
* pass callbacks into visual components.

1. render sections
    * page shell
    * title/header
    * book context card and navigation
    * message banner
    * Step 1 paste words panel
    * Step 2 intro card
    * Step 2 save bars
    * Step 2 definition review list
    * Step 3 intro card
    * Step 3 save bars
    * bulk single-value apply panel
    * bulk row-by-row paste panel
    * Step 3 detail edit list
    * done panel
Future home:
* presentational chunks into `components/`
* page should keep step composition and all behavior.

## Finished

- [ ] Nothing extracted yet.
