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
