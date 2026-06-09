# Read Along Refactor Map

## Current Page Purpose

`app/(protected)/books/[userBookId]/readalong/page.tsx` is the Fluid Reading / Read Along page for one user book.

It lets the user:
* read forward with saved-word support instead of stopping for new lookups
* see saved words grouped by page, or chunked into sections when page numbers are missing
* filter the reading support by chapter
* jump to a page from the URL or page input
* move between pages/sections with buttons or arrow keys
* tap words to fade them and auto-scroll to the next support word
* switch support mode between full support, reading support, and meaning support
* see Library Study color/stage badges for saved words
* time a fluid reading session
* save a timed reading session to the book's reading history
* navigate back to the Book Hub or the book vocabulary list

The page displays and edits private/user-book data:
* `user_books` ownership and book context
* joined `books` title and cover
* visible `user_book_words` for the selected book
* Library Study color/stage lookup data for the current user
* `user_book_reading_sessions` rows created when saving a timed session
* teacher/student access context through `profiles` and `teacher_students`

## Current Risks / Do Not Touch Yet

Do not move or change these in the first pass:
* owner, linked-teacher, and super-teacher access checks
* Supabase auth, profile, `user_books`, `books`, `user_book_words`, and `user_book_reading_sessions` reads/writes
* `fetchLibraryStudyColorInfoByWord` behavior and color lookup keys
* chapter key/label behavior
* chapter filtering and selected-chapter reset behavior
* page grouping, section chunking, page URL handling, and jump behavior
* `pageIndex`, `jumpPageInput`, `selectedChapterKey`, and `fadedThroughIndex` state behavior
* tap-to-fade and animated scroll behavior
* keyboard left/right navigation behavior
* timer start/pause/resume/finish behavior
* timed session default start/end page lookup
* timed session validation and save behavior
* before-unload warning while timer is active or paused
* controlled inputs in the timed session form
* routing behavior for Book Hub and Vocab List buttons

The first code changes should only move visual JSX into components. Keep state, handlers, calculations, data loading, access/security logic, and Supabase logic in `page.tsx`.

## First Pass: Visual / Page-Thinning Components

## Recommended First Extraction

Start with `ReadAlongLoadingState`.

It is the smallest and clearest low-risk visual extraction because it only owns the repeated loading shell. It does not touch access checks, Supabase queries, routing, timer/session behavior, support mode, page navigation, refs, saved-word filtering, Library Study color lookups, or reading progress behavior.

After that, extract `ReadAlongPageHeader`, `ReadAlongSupportIntroCard`, and `ReadAlongEmptyState`. Those are safe static visual pieces and should give early page-thinning value without disturbing the sensitive reading/session flow.

## Later Architecture Refactor

### Access And Ownership Loading

* Possible file/layer: `dao.ts`, `service.ts`, `controller.ts`.
* What logic might move later:
  * current user loading
  * profile role loading
  * `user_books` ownership check
  * linked-teacher access check
  * super-teacher access check
  * book title/cover context loading
* Why it should wait: access checks are security-sensitive and currently interleaved with loading state and UI state.
* Risks to check before moving it:
  * owner-only vs teacher-visible data rules
  * whether Library Study color lookup should use viewer id or owner id
  * error messaging for signed-out, missing book, and no-access states

### Supabase Query Organization

* Possible file/layer: `dao.ts` or `repository.ts`.
* What logic might move later:
  * load visible words for a user book
  * load latest reading session
  * save a fluid reading session
  * load book title/cover
* Why it should wait: first pass should avoid changing data loading and save behavior.
* Risks to check before moving it:
  * exact ordering of words by page, page order, and created date
  * hidden-word filtering
  * preserving error behavior and console diagnostics

### Timer And Session Save Orchestration

* Possible file/layer: `controller.ts` and `service.ts`.
* What logic might move later:
  * start/pause/resume/finish transitions
  * default session page lookup orchestration
  * elapsed-to-minutes calculation
  * session validation
  * save success/reset behavior
* Why it should wait: the timer has multiple related state flags and browser lifecycle behavior.
* Risks to check before moving it:
  * paused elapsed calculation
  * before-unload warning behavior
  * save form defaults after latest session lookup
  * active timer state after cancel/save

### Reading Progress And Navigation Helpers

* Possible file/layer: `helpers.ts` or `service.ts`.
* What logic might move later:
  * page chunking
  * chapter key/label helpers
  * selected chapter label calculation
  * page jump lookup
  * current page view-model shaping
* Why it should wait: page grouping and URL page behavior are central to the reading experience.
* Risks to check before moving it:
  * words without page numbers
  * missing chapter metadata
  * URL `?page=` behavior
  * selected chapter reset behavior when words change

### Tap-To-Fade And Scroll Behavior

* Possible file/layer: `controller.ts` or a page-local hook later.
* What logic might move later:
  * `animateScrollTo`
  * `handleProgressTap`
  * word refs management
  * scroll reset on page change
  * animation-frame cleanup
* Why it should wait: this behavior relies on DOM refs and page-local scroll timing.
* Risks to check before moving it:
  * mobile scroll behavior
  * animation cancellation
  * faded state reset on page/chapter change
  * clicking the last word on a page

### Library Study Color Support

* Possible file/layer: `service.ts`, `dao.ts`, or a shared Library Study helper.
* What logic might move later:
  * building `wordsToCheck`
  * checking lookup eligibility
  * fetching color info
  * mapping color info to word card display props
* Why it should wait: the page currently includes duplicate-looking color load effects; fix or consolidate only in a behavior-focused pass, not during visual extraction.
* Risks to check before moving it:
  * viewer-vs-owner user id rules
  * color key normalization
  * words missing readings
  * loading behavior when `canAccessBook` changes

### Shared Types

* Possible file/layer: `types.ts`.
* What logic might move later:
  * `ReadAlongWord`
  * `SupportMode`
  * `PageChunk`
  * chapter option/view-model types
  * timer form prop/view-model types if useful
* Why it should wait: types can stay page-local until components or services need shared contracts.
* Risks to check before moving it:
  * whether the same word/page types are reusable by Just Reading, Curiosity Reading, or Vocab List
  * avoiding over-broad shared types too early

### Row / Card View-Model Shaping

* Possible file/layer: `service.ts` or `helpers.ts`.
* What logic might move later:
  * display surface choice when `hide_kanji_in_reading_support` is true
  * whether reading/meaning should show for each `SupportMode`
  * word count labels
  * current page labels
* Why it should wait: visual components can first receive existing raw values and callbacks.
* Risks to check before moving it:
  * support mode display expectations
  * Library Study badge placement/data
  * fallback text for missing surface, reading, or meaning

### Reusable Components Across Reading Pages

* Possible file/layer: shared `components/` under reading pages or app-level components.
* What logic might move later:
  * book context navigation card
  * timer/session panel
  * support mode tabs
  * reader page navigator
  * empty/loading shells
* Why it should wait: extract page-local components first, then promote shared components only after patterns are stable across Read Along, Just Reading, Curiosity Reading, and Listening.
* Risks to check before moving it:
  * each page's session mode and save behavior
  * wording differences
  * access rules and destination routes
  * controlled inputs and callbacks

## Suggested Status Labels

Use these labels for this page:
* Not started
* Visual pass in progress
* Visual pass mostly done
* Visual pass done / architecture deferred
* Architecture pass later
* Architecture pass in progress
* Architecture pass done

Recommended current status: `Visual pass done / good stopping point`.

When all safe presentational extractions are complete, use `Visual pass done / good stopping point`. That should mean the page-thinning layer is complete and the deeper controller/service/DAO/helper cleanup is intentionally saved for later, not that the visual work is unfinished.

## Finished

- [✔️] Extracted `ReadAlongLoadingState`.
- [✔️] Extracted `ReadAlongPageHeader`.
- [✔️] Removed due to Redundancy `ReadAlongSupportIntroCard`.
- [✔️] Extracted `ReadAlongBookContextCard`.
- [✔️] Extracted `ReadAlongEmptyState`.
- [✔️] Extracted `ReadAlongSupportModeTabs`.
- [✔️] Extracted `ReadAlongCurrentPageSummary`
- [✔️] Extracted `ReadAlongPageNavigator`.
- [✔️] Extracted `ReadAlongChapterSelector`.
- [✔️] Extracted `ReadAlongTimerPanel`.
- [✔️] Extracted `ReadAlongReaderShell`.
- [✔️] Extracted `ReadAlongWordCard`.
- [✔️] Extracted `ReadAlongWordList`.
- [✔️] Extracted `ReadAlongAccessDeniedState`.


## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass done / good stopping point`

This status fits because the main Read Along visual surfaces have been extracted: loading state, page header, book context card, empty state, support mode tabs, current page summary, page navigator, chapter selector, timer panel, reader shell, word cards/list, and access-denied state.

The remaining page is mostly access checks, Supabase loading, reading support state, page/chapter navigation, timer/session behavior, keyboard/scroll behavior, Library Study color lookup, and page-owned handler wiring.

Current line count note:

The tracker row said the page was reduced to `945` lines. The current file is about `1043` lines, likely because later full-access/timer/access work added code after the visual pass.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/books/[userBookId]/readalong/page.tsx | 1242 | 1043 | -199 |`

### 2. Readability Check

The page is easier to scan than before. The normal loaded UI now reads as a sequence of named components: header, book context, chapter selector, timer panel, support mode tabs, reader shell, page navigation, current page summary, empty state, and word list.

The remaining page sections are understandable. Most of the code above the render is behavior and data orchestration, and the render body is now mostly composition.

The only visually heavy leftover is the full-access locked branch. It is isolated and not part of the normal reader UI, so it does not block this page from being a good visual stopping point.

### 3. Remaining Code Classification

Remaining code is mostly behavior and architecture:

* access / ownership checks: owner, no-access, and access message behavior remain page-owned.
* linked-teacher / super-teacher checks: teacher access context remains in `page.tsx`.
* full-access checks: full-access locked branch remains in `page.tsx`.
* Supabase loading: auth, profile, user book, book context, words, latest session, and session save behavior remain page-owned.
* book/context loading: book title/cover and user book context remain in the page.
* saved-word loading: visible `user_book_words` load remains in `page.tsx`.
* page/chapter grouping behavior: chapter options, selected chapter, page grouping, chunking, and URL page behavior remain in the page.
* support mode behavior: full/reading/meaning support state remains page-owned.
* tap-to-fade behavior: faded index, word refs, and animated scroll behavior remain in `page.tsx`.
* keyboard behavior: left/right navigation behavior remains page-owned.
* timer/session behavior: start, pause, resume, finish, defaults, validation, save, and before-unload warning remain in `page.tsx`.
* Library Study color/status behavior: color lookup and key mapping remain in the page.
* UI state: loading, access checked, selected chapter, page index, support mode, timer form state, elapsed state, refs, and messages.
* derived values: chapter options, selected chapter label, pages, current page, URL page target, color lookup keys, and timer labels.
* helper functions: page/chapter helpers, timer helpers, scroll helpers, and support display helpers remain in the page.
* visual JSX still in `page.tsx`: full-access locked branch and high-level composition.
* component composition: extracted components are wired from page-owned state and handlers.
* legacy or suspicious code: full-access locked JSX could become a small component later, but it is not urgent.

### 4. Visual Chunks Still Worth Extracting?

`ReadAlongFullAccessLockedState`

* What JSX it owns: the full-access locked card, current-book mini card, and Book Hub / Just Reading buttons.
* Why it is safe or not safe: visually safe, but it needs copy, `bookTitle`, `userBookId`, and router callbacks. The gain is modest because this branch is isolated and not the normal page.
* Risk level: low-medium.
* Recommendation: defer. It is not worth another extraction pass unless doing a lock-state cleanup across multiple pages.

`ReadAlongTimerHandlers`

* What JSX it owns: none.
* Why it is safe or not safe: this is behavior, not visual extraction.
* Risk level: high for this pass.
* Recommendation: defer to timer/session architecture cleanup.

`ReadAlongReaderComposition`

* What JSX it owns: reader shell header, navigator, summary, empty state, and word list wiring.
* Why it is safe or not safe: not worth extracting visually because it would bundle navigation state, current page data, refs, color lookup, and progress handlers.
* Risk level: medium-high.
* Recommendation: defer.

### 5. Prop Basket / Over-Extraction Check

The extracted components have reasonable page-local boundaries. `ReadAlongTimerPanel`, `ReadAlongReaderShell`, and `ReadAlongWordList` naturally receive several props, but they keep timer/session saves, page navigation, color lookup, and tap-to-fade behavior in the page.

No extraction appears to make the page harder to understand. These components should remain page-local for now.

Some components may eventually become shared with Just Reading, Curiosity Reading, or Listening, especially loading/access shells, book context cards, and timer panels. Do not promote them yet; reading pages still have different session modes and save behavior.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred these boundaries:

* access checks remain in `page.tsx`.
* owner/private book checks remain in `page.tsx`.
* linked-teacher checks remain in `page.tsx`.
* super-teacher checks remain in `page.tsx`.
* full-access checks remain in `page.tsx`.
* Supabase queries remain in `page.tsx`.
* saved-word loading remains in `page.tsx`.
* page/chapter grouping remains in `page.tsx`.
* support mode state remains in `page.tsx`.
* tap-to-fade/scroll behavior remains in `page.tsx`.
* keyboard navigation remains in `page.tsx`.
* timer/session save behavior remains in `page.tsx`.
* Library Study color/status lookup remains in `page.tsx`.
* private saved-word and reading-session data boundaries remain page-owned.

Nothing suspicious needs an immediate fix during this audit.

### 7. Architecture Deferred List

* shared types: defer because `ReadAlongWord`, `PageChunk`, and support mode types are still page-local and tied to this reader.
* helper functions: defer because page/chapter, timer, and scroll helpers affect visible behavior.
* access helpers: defer until private book access checks are centralized across book routes.
* services/DAOs/controllers: defer because moving Supabase reads/writes and timer saves is behavior-sensitive.
* repeated Supabase loading: defer to a broader private-book data-loading pass.
* saved-word list service: defer because it touches hidden filtering, sorting, and Library Study status.
* timer/session service: defer because active/paused/finished states and before-unload behavior need focused testing.
* page/chapter grouping helper: defer until Add Word, Curiosity Reading, Vocab List, and Read Along chapter behavior are reviewed together.
* tap-to-fade hook/helper: defer because DOM refs and animation timing are easy to regress.
* Library Study color/status helper: defer because viewer-vs-owner user ID rules need care.
* shared reading UI components: defer until Read Along, Just Reading, Curiosity Reading, and Listening have stable boundaries.

### 8. Browser Smoke Test Suggestions

Manual smoke test checklist:

* owner can open their own Read Along page.
* unauthorized user is blocked from another user's private Read Along page.
* linked teacher/super-teacher access works if intended.
* full-access locked behavior still works if applicable.
* saved words load for the selected book only.
* empty state works for a book with no visible saved words.
* chapter selector filters support words correctly.
* page navigator previous/next works.
* page jump input works.
* URL `?page=` behavior works if present.
* support mode tabs change word display.
* tap-to-fade and auto-scroll behavior works.
* keyboard left/right navigation works.
* timer start/pause/resume/finish works.
* timed session defaults and save behavior work.
* before-unload warning works while timer is active or paused.
* Library Study color/status badges display correctly.
* navigation to Book Hub and Vocab List works.
* mobile-ish visual check for reader shell, word cards, controls, and timer panel.

### 9. Final Recommendation

Stop visual thinning here.

This page has reached a good first-pass stopping point. Further work should be behavior-aware architecture cleanup around access loading, saved-word loading, page/chapter grouping, timer/session save behavior, tap-to-fade scrolling, and Library Study color lookup.
