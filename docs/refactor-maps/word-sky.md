# Word Sky Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/library-study/word-sky/page.tsx`

Current size: about 787 lines.

## Current Status

First visual extraction pass completed.

Finished:
* extracted `WordSkyLoadingState`
* extracted `WordSkyHeader`
* extracted `WordSkyMessageBanner`
* extracted `WordSkyScene`
* extracted `WordSkyBubble`
* extracted `WordSkySelectedPanel`
* extracted `WordSkyEmptySelectionPanel`

Still intentionally deferred:
* access checks
* full-access checks
* Supabase queries
* claim/add/save logic
* progress/color logic
* study event writes, if added later
* helper functions
* services, DAOs, controllers, hooks, or page-local types

The remaining work is architecture/data behavior cleanup, not first-pass visual JSX.

## Current Page Purpose

Word Sky is a lightweight global/personal word discovery page.

It lets a signed-in user:
* see floating vocabulary candidates
* mix global starter-pool words with some personal library words
* claim a word as ready for a later study path
* keep Word Sky claims separate from real book encounters
* avoid showing words that are already further along in Library Study colors

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks
* full-access checks
* Supabase queries
* claim/add/save logic
* progress/color logic
* study event writes, if added later
* helper functions
* services, DAOs, controllers, hooks, or page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `ClaimedColor`
* `SkyBubbleColor`
* `SkyWord`
* `ClaimRow`
* `WordSkyPoolRow`
* `LibrarySummarySkyRow`
* `LibraryProgressSkyRow`
* `VisibleSkyWord`

### 2. Constants

Keep in `page.tsx` for the first pass.

* `FALLBACK_SKY_WORDS`
* `LANES`
* `VISIBLE_WORD_COUNT`
* `PERSONAL_LIBRARY_WORD_LIMIT`
* `PERSONAL_LIBRARY_SKY_LEVELS`

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

Identity and normalization:
* `normalizeText`
* `normalizeKana`
* `studyIdentityKey`
* `normalizeJlpt`

Display and visual helpers:
* `colorClass`
* `colorLabel`
* `levelForWord`

Sky/deck helpers:
* `shuffleArray`
* `clampPercent`
* `makeVisibleWords`

Library Study color helpers:
* `shouldIncludePersonalLibraryWord`
* `libraryColorForWord`
* `shouldHideFromWordSkyByLibraryColor`

Async helper:
* `withTimeout`

### 4. State

Access/loading state:
* `userId`
* `loading`

Word/pool state:
* `wordPool`
* `visibleWords`

User data state:
* `claims`
* `libraryColors`

UI/action state:
* `selectedWord`
* `savingKey`
* `message`

Derived selected state:
* `selectedKey`
* `claimedCount`

### 5. Data Loading

The main `load()` effect:
* gets the Supabase auth user
* redirects to `/login` when no user is present
* loads the global starter pool through `get_word_sky_pool`
* loads current user learning color settings
* loads current user library word summaries
* loads current user library word progress
* computes Library Study colors for user-library words
* builds a starter pool
* builds a personal pool from harder/later words
* merges starter and personal pools
* removes duplicates by `studyIdentityKey`
* backfills Library Study colors for starter words already in the user's library
* hides words already green/blue/purple by Library Study color
* shuffles and displays the pool
* loads existing `user_library_word_claims`
* stores claims locally by `study_identity_key`

### 6. Access / Full-Access Checks

Current access behavior:
* requires a logged-in Supabase user
* redirects unauthenticated users to `/login`
* all user-specific queries are scoped with `user.id`
* claim save/delete operations are scoped with `user_id`

Current full-access behavior:
* no obvious full-access gate is present in this file

If Word Sky should be full-access-only, add that later as a deliberate access pass.

### 7. Word Sky Claim / Add Behavior

`saveClaim(word, color)`:
* requires `userId`
* builds a `studyIdentityKey`
* sets `savingKey`
* upserts into `user_library_word_claims`
* stores `user_id`, identity key, surface, reading, meaning, claimed color, source, and updated timestamp
* uses `onConflict: "user_id,study_identity_key"`
* updates local `claims`
* clears `selectedWord`

`clearClaim(word)`:
* requires `userId`
* deletes from `user_library_word_claims`
* scopes delete by `user_id` and `study_identity_key`
* removes local claim state
* clears `selectedWord`

Only `green` is currently exposed in the UI, even though `ClaimedColor` supports `green`, `blue`, and `purple`.

### 8. Study / Color / Progress Behavior

Word Sky uses Library Study color information to decide what appears.

Personal library words:
* only include later/harder levels from `PERSONAL_LIBRARY_SKY_LEVELS`
* only include words currently computed as red/orange/yellow

Starter/global words:
* are loaded from the global Word Sky pool
* may receive a current-user library color if already present in the user's library summaries

Hidden words:
* words with green/blue/purple Library Study color are hidden from Word Sky

Claims:
* existing claim colors override the displayed bubble color
* claims do not appear to write Library Study progress directly

Study events:
* no study event writes are visible in this page right now

### 9. Event Handlers

UI handlers:
* select/deselect a floating word
* close selected word
* save selected word as green claim
* clear/leave a selected word unclaimed
* navigate back to `/library-study`

Effects:
* initial data load
* interval refreshes the visible sky words every 55 seconds when no word is selected

### 10. Derived Values

Derived in render/load:
* `selectedKey`
* `claimedCount`
* `starterPool`
* `colorSettings`
* `progressByKey`
* `libraryColorByKey`
* `personalPool`
* `loadedPool`
* `starterKeysWithoutColor`
* `finalPool`
* `shuffledPool`
* per-word `claim`
* per-word `bubbleColor`
* per-word `isSelected`

### 11. Render Sections

Top-level render sections:
* loading state
* page shell
* header/stat/action panel
* message banner
* animated sky scene
* floating word buttons
* selected-word action panel
* empty selected-word prompt
* local animation CSS

## First-Pass Visual Extractions

Status: completed.

These were extracted as page-local presentational components. Do not promote shared components yet.

### 1. `WordSkyLoadingState` - Done

Owns:
* loading-state JSX

Stays in `page.tsx`:
* `loading` state and branch decision

Expected props:
* optional `message`

Category:
* presentational UI

Risk:
* very low

Suggested order:
* 1

### 2. `WordSkyHeader` - Done

Owns:
* title
* description
* claimed count badge
* word-pool count badge
* Ability Check navigation button

Stays in `page.tsx`:
* `claimedCount`
* `wordPool.length`
* router navigation handler

Expected props:
* `claimedCount`
* `wordPoolCount`
* `onBackToStudy`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 2

### 3. `WordSkyMessageBanner` - Done

Owns:
* amber message banner JSX

Stays in `page.tsx`:
* message state
* error/notice text decisions

Expected props:
* `message`

Category:
* presentational UI

Risk:
* very low

Suggested order:
* 3

### 4. `WordSkyScene` - Done

Owns:
* sky section wrapper
* background layers
* scene sizing
* local animation style block, if kept local

Stays in `page.tsx`:
* visible word data
* selected-word state
* claim/color calculations
* selected panel branch

Expected props:
* `children`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 4

### 5. `WordSkyBubble` - Done

Owns:
* individual floating word button
* absolute positioning
* animation style props
* bubble visual styling

Stays in `page.tsx`:
* `bubbleColor` derivation
* selected state derivation
* click handler
* identity key calculation

Expected props:
* `word`
* `bubbleColor`
* `isSelected`
* `onClick`

Category:
* presentational UI

Risk:
* medium-low

Suggested order:
* 5

### 6. `WordSkySelectedPanel` - Done

Owns:
* selected-word details panel
* selected word display
* close button
* claim button
* clear/leave button

Stays in `page.tsx`:
* `saveClaim`
* `clearClaim`
* selected-word state
* saving state
* claim existence decision

Expected props:
* `selectedWord`
* `selectedKey`
* `hasClaim`
* `savingKey`
* `onSaveGreen`
* `onClearOrClose`
* `onClose`

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 6

### 7. `WordSkyEmptySelectionPanel` - Done

Owns:
* "Tap a floating word" placeholder panel

Stays in `page.tsx`:
* selected-word branch

Expected props:
* none

Category:
* presentational UI

Risk:
* very low

Suggested order:
* 7

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `ClaimedColor` supports `blue` and `purple`, but the UI only exposes `green`.
* `colorLabel("blue")` and `colorLabel("purple")` are effectively unused unless future buttons return.
* No obvious full-access gate is present in this file.
* No study event writes are visible in this file.
* `FALLBACK_SKY_WORDS` is both loading fallback and initial visible data, which can make fallback words appear before real data finishes loading.
* `Date.now()` inside `makeVisibleWords` intentionally remounts visible bubbles on each refresh; useful for animation, but worth noting.
* The decorative sky background is visually heavy and could be simplified or extracted later.

## Recommended Next Step

The first visual extraction pass is complete.

Next pass should stay architecture-aware:
* keep all state, effects, handlers, Supabase queries, claim logic, color/progress logic, and helper functions in `page.tsx` unless the task is explicitly to move behavior
* consider suspicious/unused code cleanup only after verifying behavior
* only revisit access/full-access behavior as a deliberate access pass

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass done / good stopping point`

The first visual pass reached a good stopping point. The render is now short and mostly composed from page-local presentational components:

* `WordSkyLoadingState`
* `WordSkyHeader`
* `WordSkyMessageBanner`
* `WordSkyScene`
* `WordSkyBubble`
* `WordSkySelectedPanel`
* `WordSkyEmptySelectionPanel`

The remaining code is dominated by Word Sky pool loading, current-user scoping, claim behavior, Library Study color/progress filtering, animation identity, and helper functions. Those are not low-risk visual extractions.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/library-study/word-sky/page.tsx | 787 | 702 | -85 |`

### 2. Readability Check

The page is easier to scan than before. The visual pieces now have clear names, and the render section shows the app shape without burying it in repeated JSX.

The extracted components help readability:

* the loading state is isolated
* the header and message banner are easy to recognize
* the animated scene wrapper is separate from the data decisions
* each floating word bubble is presentational
* the selected/empty panels are easier to read as branches

The remaining page sections are understandable. The visually heaviest part still in `page.tsx` is the `visibleWords.map()` block plus selected-panel branch, but it is tied to identity, claim, color, and selected-state decisions. Extracting it further would probably create a prop-heavy component.

### 3. Remaining Code Classification

Remaining code is mostly in these buckets:

* access / full-access checks: logged-in-user check and redirect to `/login`; no full-access gate is currently obvious.
* Supabase loading: global Word Sky pool, current user learning settings, library summaries, library progress, and claims.
* Word Sky pool behavior: fallback words, starter pool, personal pool, duplicate removal, shuffling, and visible-word rotation.
* claim/add/save behavior: `saveClaim`, `clearClaim`, local claim state updates, and `user_library_word_claims` writes.
* study/color/progress behavior: Library Study color computation and hiding words already further along.
* animation/identity behavior: `studyIdentityKey`, `skyId`, lanes, and refresh timing.
* UI state: selected word, saving key, message, visible words, loading state.
* derived values: selected key, claimed count, bubble color, selected state.
* helper functions: normalization, color labels/classes, library color logic, shuffling, clamping, timeout handling.
* visual JSX still in `page.tsx`: page shell, `visibleWords.map()`, selected panel branch, and animation CSS.
* component composition: the render mainly wires derived values into extracted visual components.
* legacy or suspicious code: `ClaimedColor` supports blue/purple but only green is exposed; no study event writes are present.

The remaining 702 lines are mostly behavior/data orchestration rather than easy presentational JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `WordSkyBubbleLayer`

What JSX it owns:

* the absolute bubble layer
* `visibleWords.map()`
* each `WordSkyBubble`

Why it is safe or not safe:

* visually it is tempting, but it would need claim lookup, library color lookup, selected-key comparison, identity-key generation, and click behavior.

Risk level:

* Medium.

Do now or defer:

* Defer. This would likely create a prop basket and blur behavior/visual boundaries.

#### `WordSkyDockPanel`

What JSX it owns:

* the bottom selected/empty panel wrapper
* selected vs empty branch

Why it is safe or not safe:

* the wrapper is presentational, but the branch depends on selected word, claim state, save state, and clear/save handlers.

Risk level:

* Medium.

Do now or defer:

* Defer. The current branch is readable and still close to the behavior it controls.

#### `WordSkyAnimationStyles`

What JSX it owns:

* the local `style jsx` animation block.

Why it is safe:

* the CSS is visual-only.

Risk level:

* Low.

Do now or defer:

* Defer. It is not worth a separate extraction unless the scene/background styling is being redesigned.

### 5. Prop Basket / Over-Extraction Check

The extracted components are not too prop-heavy for this pass.

* `WordSkyHeader` has a clean count/action API.
* `WordSkyMessageBanner` and `WordSkyEmptySelectionPanel` are very small and clear.
* `WordSkyScene` is a good wrapper boundary.
* `WordSkyBubble` stays presentational while the page keeps color/selection decisions.
* `WordSkySelectedPanel` has the most behavior-adjacent props, but it still avoids owning save/clear logic.

These components should stay local to Word Sky for now. Nothing here needs to become shared until there is another sky-like or claim-like interface.

### 6. Behavior Boundary Check

The visual pass does not appear to move or blur:

* logged-in-user check and redirect behavior
* Supabase queries
* current-user scoped learning settings
* current-user scoped library summaries/progress
* current-user scoped claim loading
* claim save/delete behavior
* Word Sky pool generation
* personal-library filtering
* Library Study color/progress behavior
* hidden green/blue/purple behavior
* selected-word state
* visible-word rotation behavior

No suspicious behavior-boundary issue was found during this wrap-up audit.

### 7. Architecture Deferred List

Keep these deferred for later:

* shared/page-local types: useful only after a service/helper split is planned.
* helper functions: many are behavior-sensitive identity/color helpers and should move together carefully.
* access/full-access checks: add or change only in a deliberate access pass.
* services/DAOs/controllers: pool loading and claim writes are stable and should not move during visual cleanup.
* Word Sky pool service: useful later, but it owns product rules about starter/personal words.
* claim service: save/delete behavior is user-scoped and should be extracted only with tests or careful smoke testing.
* Library Study color helper: shared with broader study behavior, so extraction should align with Library Study architecture.
* animation/view model helper: possible later if bubble generation becomes more complex.

### 8. Browser Smoke Test Suggestions

Suggested manual smoke test checklist:

* logged-in user can open Word Sky.
* logged-out user redirects to `/login`.
* global starter-pool words appear.
* personal library words appear only when eligible.
* words already green/blue/purple in Library Study are hidden.
* floating bubbles animate and remain clickable.
* selecting a bubble opens the selected-word panel.
* saving a word as green claim works.
* clearing an existing claim works.
* saved claim state changes the visible bubble color.
* visible words refresh after the interval when no word is selected.
* selected word prevents disruptive refresh behavior.
* empty/fallback pool state still looks acceptable.
* mobile-ish check for bubbles, selected panel, and header stats.

Do not run browser tests unless explicitly requested.

### 9. Final Recommendation

Stop visual thinning here.

The first visual pass is complete. The next useful work should be behavior-aware architecture planning around pool loading, claim handling, Library Study color rules, and possible access/full-access decisions.
