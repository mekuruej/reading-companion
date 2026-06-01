# Reading Colors Refactor Map

## Current Page Purpose

`app/(protected)/community/stats/colors/page.tsx` is the detailed Reading Colors stats page for the signed-in reader.

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



### B. `ReadingColorsErrorBanner`

* What JSX it owns:
  * the conditional red error banner
* Expected props:
  * `message: string`
* What stays in `page.tsx`:
  * `errorMsg` state
  * error handling inside the load effect
* Risk level: low
* Why it is safe or risky:
  * Safe because it only displays an already-computed error message.
* Recommended order:
  * B
* Helpful comment notes:
  * No comment needed.

### C. `ColorDeltaPill`

* What JSX it owns:
  * already exists as a local presentational function
  * can move into `components/ColorDeltaPill.tsx`
* Expected props:
  * `value: number | null`
  * `className: string`
* What stays in `page.tsx`:
  * delta calculation
  * color-specific class strings for now
* Risk level: low
* Why it is safe or risky:
  * Safe because it already has a clean prop boundary and no app logic beyond display formatting.
* Recommended order:
  * C
* Helpful comment notes:
  * If extracted, note that `className` carries color meaning from the page config.

### D. `ColorGuideStepCard`

* What JSX it owns:
  * existing `ColorStepCard`
  * visual card for each explanatory color step
* Expected props:
  * `stage: MainStage`
  * `title: string`
  * `detail: string`
  * `note: string`
* What stays in `page.tsx`:
  * guide copy
  * `MainStage` type for now, or pass it through once types are shared
* Risk level: low
* Why it is safe or risky:
  * Safe because it is already a pure visual helper. Slightly more sensitive than the header because color stage labels carry app meaning.
* Recommended order:
  * D
* Helpful comment notes:
  * A short component comment could say this card is explanatory only and does not calculate color state.

### E. `ColorGuideGroupLabel`

* What JSX it owns:
  * existing `GroupLabel`
  * divider label and detail text inside the guide
* Expected props:
  * `title: string`
  * `detail: string`
* What stays in `page.tsx`:
  * group copy
  * grouping order
* Risk level: low
* Why it is safe or risky:
  * Safe because it is static presentational UI.
* Recommended order:
  * E
* Helpful comment notes:
  * No comment needed.

### F. `ReadingColorsGuide`

* What JSX it owns:
  * full `<details>` “Why colors?” panel
  * parrot image block
  * introductory explanatory paragraphs
  * “Based on encounters” group
  * “Based on ability” group
  * `ColorGuideGroupLabel` and `ColorGuideStepCard` children
* Expected props:
  * likely none at first
  * optional future props for copy or image path if reused
* What stays in `page.tsx`:
  * data loading
  * color totals
  * stats card rendering
  * error/loading state
* Risk level: low-medium
* Why it is safe or risky:
  * Mostly safe because it is static instructional UI. Risk comes from accidentally changing important app-rule wording about Red/Orange/Yellow loops, gates, and Limbo.
* Recommended order:
  * F
* Helpful comment notes:
  * Add a short boundary comment in the page or component: “Instructional copy only; color movement rules stay in the study logic and totals helpers.”

### G. `ReadingColorTotalsGrid`

* What JSX it owns:
  * the main grid of six Red/Orange/Yellow/Green/Blue/Purple cards
  * mapping over `colorItems`
  * rendering `ColorDeltaPill`
  * previous snapshot and current total mini-cards
* Expected props:
  * `items`
  * `loading: boolean`
  * `previousTotals: LibraryStudyColorTotals | null`
  * `allTimeTotals: LibraryStudyColorTotals`
  * `comparisonDateLabel: string`
* What stays in `page.tsx`:
  * `colorItems` config at first
  * `colorValue`
  * previous/current/delta calculation can stay in page for the first extraction, or be passed as already-shaped display rows
* Risk level: medium
* Why it is safe or risky:
  * Visually straightforward, but it touches the most important numbers on the page. Safest version passes already-computed display rows instead of moving calculations.
* Recommended order:
  * G
* Helpful comment notes:
  * Comment that the component should not decide what counts as current/previous; it only displays already-scoped totals.

### H. `SupportLoopCard`

* What JSX it owns:
  * the Red 2 / Orange 2 / Yellow 2 extra encounter support card
* Expected props:
  * none at first
* What stays in `page.tsx`:
  * section layout until `ReadingColorSupportSection` is extracted
* Risk level: low-medium
* Why it is safe or risky:
  * Mostly static UI. Risk is app-rule wording around repeated encounter loops.
* Recommended order:
  * H
* Helpful comment notes:
  * Note that this describes behavior that should match Ability Check/support-loop implementation.

### I. `LimboSupportCard`

* What JSX it owns:
  * one Limbo/support card rendered from `limboItems`
  * dot, label, delta pill, snapshot/current values, detail copy
* Expected props:
  * item display config
  * `loading: boolean`
  * `previousValue: number | null`
  * `allTimeValue: number`
  * `delta: number | null`
  * `comparisonDateLabel: string`
* What stays in `page.tsx`:
  * Limbo totals
  * `limboItems`
  * value/delta calculation at first
* Risk level: medium
* Why it is safe or risky:
  * Similar to the color total card. It is display-only, but the Limbo distinction is easy to confuse if logic or labels move too early.
* Recommended order:
  * I
* Helpful comment notes:
  * Comment that Limbo reason keys are app-rule data and should remain page/service-owned until architecture refactor.

### J. `ReadingColorSupportSection`

* What JSX it owns:
  * “Between gates” eyebrow
  * “Words waiting for support” title/copy
  * `SupportLoopCard`
  * mapped `LimboSupportCard` cards
* Expected props:
  * `limboItems`
  * `loading`
  * `previousLimboTotals`
  * `allTimeLimboTotals`
  * `comparisonDateLabel`
* What stays in `page.tsx`:
  * data loading
  * totals state
  * value/delta helpers at first
* Risk level: medium
* Why it is safe or risky:
  * Useful page-thinning extraction, but it combines several app-rule explanations and live private totals.
* Recommended order:
  * J
* Helpful comment notes:
  * Note that this section only presents support states; it should not decide movement rules.

### K. `ColorMovementInfoSection`

* What JSX it owns:
  * “When do colors change?” section
  * three explanatory cards for reading encounters, Ability Check gates, and Limbo/support
* Expected props:
  * none at first
* What stays in `page.tsx`:
  * nothing from this static copy, aside from page composition
* Risk level: low-medium
* Why it is safe or risky:
  * Static visual section. Risk is wording drift around what activities move colors.
* Recommended order:
  * K
* Helpful comment notes:
  * No noisy comments needed; a section-level comment can mention this copy must match study behavior.

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

## Recommended First Extraction

Start with `ReadingColorsHeader`.

It is the smallest and clearest low-risk extraction because it owns static navigation and heading markup only. It does not depend on Supabase data, loading state, color totals, Limbo totals, comparison dates, or app-rule calculations.

After that, extract `ReadingColorsErrorBanner`, then the already-local `ColorDeltaPill`, `ColorGuideStepCard`, and `ColorGuideGroupLabel`.

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


### A. `ReadingColorsHeader`

* What JSX it owns:
  * Back to Stats Home link
  * small “Study colors” eyebrow
  * `Reading Colors` page title
* Expected props:
  * none, unless the back href or title needs to be configurable later
* What stays in `page.tsx`:
  * page shell
  * data loading
  * state
  * all color totals
* Risk level: low
* Why it is safe or risky:
  * Safe because it is static navigation/header markup with no data dependencies.
* Recommended order:
  * A
* Helpful comment notes:
  * No comment needed unless the page keeps the header inline for a while.