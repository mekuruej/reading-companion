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

### F. `ReadAlongTimerPanel`

* What JSX it owns: timer copy, Start/Pause/Resume/Finish buttons, formatted timer display, timed session form, active warning, and save message.
* Expected props:
  * `isRunning`
  * `isPaused`
  * `elapsedLabel`
  * `showTimedSessionForm`
  * `sessionStartPage`
  * `setSessionStartPage`
  * `sessionEndPage`
  * `setSessionEndPage`
  * `timerSaveMessage`
  * `onStart`
  * `onPause`
  * `onResume`
  * `onFinish`
  * `onSaveTimedSession`
  * `onCancelTimedSession`
* What stays in `page.tsx`:
  * timer state
  * `formatTimer`
  * `todayYmdAppTimeZone`
  * default session lookup
  * validation
  * Supabase insert
  * before-unload warning
  * all start/pause/resume/finish orchestration
* Risk level: medium.
* Why it is safe or risky: visually contained, but it touches many state transitions and controlled inputs. Extract only after smaller components, and keep every behavior as callbacks from `page.tsx`.
* Recommended order: 9.
* Helpful comment notes: strongly recommended. Explain that timer/session orchestration remains page-owned and this component only displays controls and calls callbacks.

### H. `ReadAlongReaderShell`

* What JSX it owns: the outer rounded reader container, sticky header area, and scroll body wrapper.
* Expected props:
  * `children`
  * `header`
  * `scrollAreaRef`
* What stays in `page.tsx`:
  * current page calculation
  * refs
  * navigation handlers
  * empty state decision
  * word mapping
* Risk level: medium.
* Why it is safe or risky: mostly layout, but it wraps ref-driven scroll behavior. Use only after smaller pieces are extracted and keep the actual ref in `page.tsx`.
* Recommended order: 10.
* Helpful comment notes: mention that the scroll ref belongs to `page.tsx` because tap-to-scroll behavior is still page-owned.

### J. 

* What JSX it owns: the saved-word count, current page/section label, and "Tap the words..." helper text in the sticky reader header.
* Expected props:
  * `currentPageLabel`
  * `wordCount`
  * `hasCurrentPage`
* What stays in `page.tsx`:
  * `currentPage`
  * pluralization can either stay in `page.tsx` as an already-computed label or move if kept purely visual
* Risk level: low.
* Why it is safe or risky: display-only summary.
* Recommended order: 7.
* Helpful comment notes: no comment needed.

### K. `ReadAlongEmptyState`

### L. `ReadAlongWordCard`

* What JSX it owns: one saved-word card, including faded styling, Library Study badge position, surface/reading/meaning display, and click area.
* Expected props:
  * `word`
  * `supportMode`
  * `isFaded`
  * `colorInfo`
  * `setWordRef`
  * `onProgressTap`
* What stays in `page.tsx`:
  * `currentPage.words.map`
  * `fadedThroughIndex`
  * `wordRefs`
  * `handleProgressTap`
  * `makeLibraryStudyColorKey`
  * `libraryColorByWordKey`
* Risk level: medium-high.
* Why it is safe or risky: visually obvious but connected to refs, tap-to-scroll behavior, support mode, and color lookup display. Do not extract first.
* Recommended order: 11.
* Helpful comment notes: explain that the ref callback is passed in because scroll orchestration remains in `page.tsx`.

### M. `ReadAlongWordList`

* What JSX it owns: the list wrapper around all word cards.
* Expected props:
  * `words`
  * `supportMode`
  * `fadedThroughIndex`
  * `libraryColorByWordKey`
  * `setWordRef`
  * `onProgressTap`
* What stays in `page.tsx`:
  * page/word derivation
  * color lookup map creation
  * tap/scroll logic
* Risk level: high for first pass, medium later.
* Why it is safe or risky: this would reduce line count, but it starts to move mapping plus display conditions. It should wait until `ReadAlongWordCard` is stable.
* Recommended order: 12.
* Helpful comment notes: if extracted, comment that it remains presentational and receives already-derived words and color info.

### N. `ReadAlongAccessDeniedState`

* What JSX it owns: possibly a thin wrapper around `AccessDeniedMessage`.
* Expected props:
  * `message`
* What stays in `page.tsx`:
  * all access decisions
  * `canAccessBook`, `accessChecked`, and `accessMessage` state
* Risk level: low-medium.
* Why it is safe or risky: the visual wrapper is easy, but access-denied semantics are security-sensitive. It may not be worth extracting unless loading/error states are grouped later.
* Recommended order: optional, after the first few static pieces.
* Helpful comment notes: access/security checks must remain in `page.tsx`.

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

Recommended current status: `Not started`.

When all safe presentational extractions are complete, use `Visual pass done / architecture deferred`. That should mean the page-thinning layer is complete and the deeper controller/service/DAO/helper cleanup is intentionally saved for later, not that the visual work is unfinished.

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


- [✔️] Extracted 

