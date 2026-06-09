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

- [✔️] Extracted `BulkMessageBanner`.
- [✔️] Extracted `SaveBar`.
- [✔️] Extracted `BulkDonePanel`.
- [✔️] Extracted `StepIntroCard`.
- [✔️] Extracted `PasteWordsPanel`.
- [✔️] Extracted `BulkColumnPastePanel`.
- [✔️] Extracted `BulkApplyFieldsPanel`.
- [✔️] Extracted `BulkDefinitionReviewItem`.
- [✔️] Extracted `BulkDetailEditItem`.

Current tracker row:

Visual pass done / good stopping point | `app/(protected)/vocab/bulk/page.tsx` | 1034 | 841 | -193

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass done / good stopping point`

This status now fits. The first visual pass extracted the safe shell/panel pieces plus the two controlled item cards: message banner, save bar, done panel, step intro card, paste words panel, column paste panel, bulk apply fields panel, definition review item, and detail edit item.

The page no longer needs to stay paused for visual thinning. The only obvious remaining visual chunk is the header/book context block, and that is optional rather than necessary for readability.

Current line count note:

The tracker row said the page was reduced to `880` lines. The current file is about `841` lines after the item-card extractions.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/vocab/bulk/page.tsx | 1034 | 841 | -193 |`

### 2. Readability Check

The page is easier to scan than before. The step-level panels are named, and the render sections are clearer than the original all-in-one flow.

The remaining page sections are understandable. Step 2 and Step 3 now map to named item components, so the render reads as step composition rather than nested controlled form JSX.

The only visual area that remains inline is the top header/book context block. It is not large enough to block a good stopping point.

### 3. Remaining Code Classification

Remaining code is mostly behavior and form orchestration:

* access / ownership checks: URL `userBookId`, authorized user book ID, current user, and book authorization behavior remain page-owned.
* Supabase loading: book context, current user, existing page-order rows, and `user_book_words` upserts remain in `page.tsx`.
* book/context loading: book title/cover loading remains page-owned.
* Jisho/API behavior: preview requests and parsing remain in `page.tsx`.
* kanji stroke metadata behavior: `getStrokeData` remains page-owned.
* bulk paste behavior: raw input and preview flow remain page-owned.
* definition review behavior: reading edits, definition choice selection, custom meaning textarea, and save definitions remain in `page.tsx`.
* detail edit behavior: page/chapter/chapter-name inputs and hide-kanji checkbox remain in `page.tsx`.
* bulk apply behavior: bulk single-value and column paste handlers remain page-owned.
* page/chapter behavior: localStorage chapter persistence and page ordering logic remain in `page.tsx`.
* save behavior: validation, incomplete labels, payload shaping, and Supabase upsert remain in `page.tsx`.
* UI state: step, input text, item rows, bulk fields, messages, saving/previewing flags, recent action state.
* derived values: word count and incomplete word labels.
* helper functions: parse, normalize, meaning extraction, nullable integer parsing, bulk field handling, column parsing, and reset behavior.
* visual JSX still in `page.tsx`: header/book context block and high-level step composition.
* component composition: extracted panels are wired from page-owned state and handlers.
* legacy or suspicious code: component names in the older map differ slightly from file names (`SaveBar` vs future `BulkSaveBar`, `StepIntroCard` vs `BulkStepIntroCard`, `PasteWordsPanel` vs `BulkPasteWordsPanel`).

### 4. Visual Chunks Still Worth Extracting?

`BulkVocabHeader`

* What JSX it owns: page title, book context card, missing `userBookId` hint, and Book Hub/Vocab List navigation buttons.
* Why it is safe or not safe: mostly presentational, but needs navigation callbacks, authorized user book ID, book title/cover, and current step/reset behavior.
* Risk level: low-medium.
* Recommendation: optional next tiny pass if you want the page shell cleaner.

`BulkDefinitionReviewItem`

* What JSX it owns: one Step 2 definition review card with surface, reading input, definition selector, and meaning textarea.
* Why it is safe or not safe: visually valuable, but controlled-input-heavy and directly tied to meaning-choice behavior.
* Risk level: medium.
* Recommendation: done. Keep behavior in `page.tsx`; test definition selection after any future changes.

`BulkDetailEditItem`

* What JSX it owns: one Step 3 detail card with surface, reading/meaning preview, page/chapter/chapter-name inputs, and hide-kanji checkbox.
* Why it is safe or not safe: visually valuable, but controlled-input-heavy and tied to page/chapter/save payload behavior.
* Risk level: medium.
* Recommendation: done. Keep page/chapter/save behavior in `page.tsx`; test row edits after any future changes.

`BulkStepSection`

* What JSX it owns: a full step wrapper with intro card, save bars, and content.
* Why it is safe or not safe: would mostly reorganize composition and could obscure step flow.
* Risk level: medium.
* Recommendation: defer.

### 5. Prop Basket / Over-Extraction Check

The extracted panels have reasonable prop boundaries. `BulkApplyFieldsPanel` and `BulkColumnPastePanel` receive several values and callbacks, but their behavior remains in the page.

The item-card extractions have reasonable prop surfaces for controlled form components. Keeping step composition in `page.tsx` remains clearer than extracting a large “step” component.

All bulk components should stay page-local. This flow is different from single Add Word and Teacher Global Word Entry, so do not promote shared components yet.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred these boundaries:

* access checks remain in `page.tsx`.
* ownership checks remain in `page.tsx`.
* authorized user book ID behavior remains in `page.tsx`.
* Supabase queries remain in `page.tsx`.
* Jisho/API preview behavior remains in `page.tsx`.
* kanji stroke lookup remains in `page.tsx`.
* definition choice behavior remains in `page.tsx`.
* bulk field and column paste behavior remains in `page.tsx`.
* page/chapter/localStorage behavior remains in `page.tsx`.
* save/upsert behavior remains in `page.tsx`.
* validation/confirmation behavior remains in `page.tsx`.
* private saved-word data boundaries remain page-owned.

Nothing suspicious needs an immediate fix during this audit.

### 7. Architecture Deferred List

* shared types: defer because `BulkItem` and `BulkStep` are tightly tied to this page's step flow.
* helper functions: defer until parsing, meaning choices, page/chapter defaults, and payload shaping are stable.
* access helpers: defer until private book access checks are centralized across book routes.
* services/DAOs/controllers: defer because preview/save orchestration is behavior-sensitive.
* Jisho preview service: defer because parsing and meaning choice behavior need focused testing.
* kanji stroke lookup service: defer because it is optional metadata and external API behavior.
* saved-word upsert service: defer because save payload/page ordering behavior is delicate.
* page/chapter helper: defer until Add Word, Curiosity Reading, Vocab List, and Bulk Add chapter behavior are reviewed together.
* bulk column parsing helper: defer until the teacher prep/bulk workflows settle.

### 8. Browser Smoke Test Suggestions

Manual smoke test checklist:

* owner can open Bulk Add with an authorized `userBookId`.
* unauthorized/raw other-user `userBookId` does not expose or save private data.
* missing `userBookId` hint displays.
* book context displays correctly.
* pasted words parse correctly.
* Jisho preview works.
* kanji stroke metadata fetch does not block the flow if unavailable.
* reading edits work in Step 2.
* definition selection works.
* custom meaning/Other works.
* save definitions advances to details.
* bulk page/chapter fields apply correctly.
* column paste applies correctly.
* per-row page/chapter edits work.
* hide-kanji checkbox saves correctly.
* incomplete validation works.
* save all writes expected `user_book_words` rows.
* done panel displays.
* navigation back to Book Hub/Vocab List works.
* mobile-ish visual check for Step 2 and Step 3 item cards.

### 9. Final Recommendation

Stop visual thinning here.

The visual pass has reached a good stopping point. The remaining header/book context block could become `BulkVocabHeader`, but it is optional and not worth another pass unless doing polish.

Do not move parsing, preview, save, validation, Supabase writes, page ordering, or chapter persistence yet.
