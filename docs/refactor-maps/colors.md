# Reading Colors Refactor Map

## Current Page Purpose

`app/(protected)/community/stats/colors/page.tsx` is the detailed Reading Colors stats page for the signed-in reader.

Current observed size: 331 lines as of 2026-06-15.

It helps the user understand:
* current all-time word counts in each Reading Color
* how those current totals compare with a snapshot from the same day of the previous month
* what Red, Orange, Yellow, Green, Blue, Purple, and Limbo mean
* how extra encounter support loops work before the Reading Gate
* how Limbo differs from repeated Red/Orange/Yellow support
* what kinds of activity can move words through the color system

The page displays private/user vocabulary study data through user-scoped totals loaded by `fetchLibraryStudyColorBreakdown`.

It does not edit data. It only reads the current user's color/limbo totals and renders explanatory UI.

## Current Risks / Do Not Touch Yet

For the first pass, do not move or change:
* Supabase auth/session lookup
* current-user scoping
* `isMounted` guard behavior in the load effect
* `fetchLibraryStudyColorBreakdown` calls
* previous-month comparison window logic
* all-time vs previous snapshot comparison behavior
* color total and limbo total calculations
* `emptyLibraryStudyColorTotals` and `emptyLibraryStudyLimboTotals` fallback behavior
* loading behavior
* error behavior
* color meanings, labels, and explanatory copy unless intentionally requested
* chart/card color semantics, dots, badges, and delta arrows
* Limbo reason keys and labels
* Ability Check / Reading Gate / Meaning Gate app-rule explanations

There are no access/ownership writes, timer controls, reading progress saves, saved-word edits, controlled form inputs, or filtering/sorting controls on this page. The main risks are accidentally changing private user scoping, the previous-month snapshot comparison, or the meaning of color stages.

Keep state, handlers, calculations, helper functions, and data fetching in `page.tsx` for the visual/page-thinning pass.

## Current Code Inventory

### Types

* `ColorKey`
* `MainStage`
* imported `LibraryStudyColorTotals`
* imported `LibraryStudyLimboReason`
* imported `LibraryStudyLimboTotals`

### Constants

There are no top-level page constants besides the imported empty-total/query helpers. The main visual configuration arrays are currently created inside `useMemo`:
* `colorItems`
* `limboItems`

### Helper Functions

* `ymdLocal`
* `previousMonthComparisonEndDate`
* `previousMonthComparisonDateLabel`
* `colorValue`
* `limboValue`
* `colorLabel`
* `stagePill`

### Existing Local Presentational Functions

* `ColorDeltaPill`
* `GroupLabel`
* `ColorStepCard`

### State

* `loading`
* `errorMsg`
* `previousTotals`
* `allTimeTotals`
* `previousLimboTotals`
* `allTimeLimboTotals`

### Data Loading

The page has one `useEffect` load flow that:
* gets the current Supabase session
* resets totals to empty values for signed-out users
* computes the previous-month comparison end date
* loads previous snapshot color/limbo breakdowns
* loads all-time color/limbo breakdowns
* stores color totals and Limbo totals separately
* catches errors and resets to empty totals
* uses `isMounted` to avoid setting state after unmount

### Derived / Calculated Values

Calculated by helpers or render scope:
* previous-month comparison end date
* previous-month comparison date label
* color item display config
* Limbo item display config
* per-color previous value
* per-color current all-time value
* per-color delta
* per-Limbo previous value
* per-Limbo current all-time value
* per-Limbo delta

### Event Handlers

There are no interactive state-changing event handlers besides:
* the page-load effect
* the native `<details>` open/close behavior
* the `Link` back to Stats Home

### Render Sections

* page shell
* Back to Stats Home link
* page header and intro label
* collapsible “Why colors?” instructional guide
* error banner
* main Reading Color total cards
* “Words waiting for support” Limbo/support section
* “When do colors change?” explanatory section

## First Pass: Visual / Page-Thinning Components

This first pass should be presentational only. Components should receive already-computed values and callbacks if needed. Do not move calculations, Supabase logic, state, or helper functions yet.

The suggested components below are ordered from easiest / lowest-risk to more complex: A, B, C, and onward.


### L. Display Row Shaping For Cards

* What JSX it owns:
  * no JSX by itself; this is a possible bridge before extracting card grids
* Expected props:
  * not a component prop directly
* What would move:
  * later, the page could shape `colorDisplayRows` and `limboDisplayRows` in render scope and pass simple rows to card components
* What stays in `page.tsx`:
  * the shaping itself for the visual pass
* Risk level: low-medium
* Why it is safe or risky:
  * Can make components safer by avoiding helper movement. Do not overbuild it during the first pass.
* Recommended order:
  * L, only if `ReadingColorTotalsGrid` or `ReadingColorSupportSection` props feel too wide.
* Helpful comment notes:
  * A useful comment could say display rows are intentionally shaped in `page.tsx` so presentational cards do not own stats rules.

## Later Architecture Refactor

Do not implement these during the first visual pass. Keep them here so the ideas are not lost.

### Shared Types

* Possible file/layer: `types.ts`
* What logic might move later:
  * `ColorKey`
  * `MainStage`
  * display config types for color cards and Limbo cards
  * imported `LibraryStudyColorTotals`, `LibraryStudyLimboReason`, and `LibraryStudyLimboTotals` re-exports if useful
* Why it should wait:
  * The page is still small enough to keep types local until component prop contracts settle.
* Risks to check before moving it:
  * avoiding duplicate color-stage types with library study logic
  * keeping Limbo reason keys aligned with `libraryStudyTotals`

### Supabase / DAO Layer

* Possible file/layer: `dao.ts`
* What logic might move later:
  * current session/user lookup if this page gets a shared stats loader pattern
  * calls to `fetchLibraryStudyColorBreakdown`
* Why it should wait:
  * The current load effect is simple and user-scoped. Moving it during visual thinning would increase risk without much immediate benefit.
* Risks to check before moving it:
  * signed-out behavior
  * user ID scoping
  * previous snapshot `before` option
  * error propagation
  * empty total fallbacks

### Controller / Load Orchestration

* Possible file/layer: `controller.ts`
* What logic might move later:
  * `loadReadingColorStatsForCurrentUser`
  * auth/session handling
  * previous and all-time breakdown orchestration
  * no-user reset behavior
  * error reset behavior
* Why it should wait:
  * Loading state, `isMounted`, and reset behavior should remain visible until the UI is safely thinned.
* Risks to check before moving it:
  * cancellation behavior after unmount
  * preserving loading/error transitions
  * avoiding stale totals after a failed load

### Service / App-Rule Helpers

* Possible file/layer: `service.ts`
* What logic might move later:
  * `ymdLocal`
  * `previousMonthComparisonEndDate`
  * `previousMonthComparisonDateLabel`
  * `colorValue`
  * `limboValue`
  * display row shaping for color totals
  * display row shaping for Limbo totals
* Why it should wait:
  * The previous-month comparison is user-facing and recently tuned. Move it only with tests or fixtures.
* Risks to check before moving it:
  * month-end behavior
  * February/short-month behavior
  * “snapshot on previous month day” meaning
  * off-by-one behavior caused by the `before` date

### Visual Theme Helpers

* Possible file/layer: page-local `components/`, `theme.ts`, or shared stats theme later
* What logic might move later:
  * `colorLabel`
  * `stagePill`
  * `colorItems`
  * `limboItems`
* Why it should wait:
  * These strings/classes encode visual meaning and should stabilize locally before becoming shared.
* Risks to check before moving it:
  * color labels vs app-rule labels
  * Limbo wording consistency across Stats Hub and Ability Check
  * not accidentally changing chart/card colors that carry meaning

### Shared Stats Components

* Possible file/layer: page-local `components/` first, shared stats components later
* What logic might move later:
  * snapshot/current total card pattern
  * section shell
  * explanatory info card
  * delta pill
* Why it should wait:
  * Page-local extraction should come first. Promote shared components only after monthly, vocabulary, reading ability, and other stats pages show stable common needs.
* Risks to check before moving it:
  * not flattening distinct color meanings into generic stat cards too early
  * preserving white card backgrounds and meaningful border colors
  * keeping chart/legend/color semantics intact

## Suggested Target Structure

Use this only as a planning guide:

```text
app/(protected)/community/stats/colors/
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

Recommended current status: `Not started`.

A future status of `Visual pass done / architecture deferred` should mean the safe presentational extraction pass is complete and deeper architecture work is intentionally saved for later.


- [✔️] Extracted `ReadingColorsHeader`.
- [✔️] Extracted `ReadingColorsErrorBanner`.
- [✔️] Extracted `ColorDeltaPill`.
- [✔️] Extracted `ColorGuideStepCard`.
- [✔️] Extracted `ColorGuideGroupLabel`.
- [✔️] Extracted `ReadingColorsGuide`.
- [✔️] Extracted `ReadingColorTotalsGrid`.
- [✔️] Extracted `SupportLoopCard`.
- [✔️] Extracted `LimboSupportCard`.
- [✔️] Extracted `ReadingColorSupportSection`.
- [✔️] Extracted `ColorMovementInfoSection`.

## Current Refactor Audit, 2026-06-15

Current observed line count:

* `app/(protected)/community/stats/colors/page.tsx`: 331 lines

Extracted visual components:

* `ReadingColorsHeader`
* `ReadingColorsErrorBanner`
* `ColorDeltaPill`
* `ColorGuideStepCard`
* `ColorGuideGroupLabel`
* `ReadingColorsGuide`
* `ReadingColorTotalsGrid`
* `SupportLoopCard`
* `LimboSupportCard`
* `ReadingColorSupportSection`
* `ColorMovementInfoSection`

Suggested components intentionally left in the page:

* No major visual sections remain page-local.
* Display row shaping and helper functions remain page-local.

Risk-boundary check:

The page still owns Supabase session lookup, current-user scoping, `fetchLibraryStudyColorBreakdown` calls, previous-month comparison logic, empty-total fallbacks, color/limbo value helpers, display row shaping, and all state. No extraction appears to have moved private user data loading, stats rules, or color-stage semantics into visual components.

Current status:

Visual pass done. Good stopping point. Architecture deferred.

Updated tracker row:

```md
- [x] | Visual pass done / good stopping point / architecture deferred | `app/(protected)/community/stats/colors/page.tsx` | 642 | 331 | -311 |
```
