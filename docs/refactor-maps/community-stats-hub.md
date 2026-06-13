# Community Stats Hub Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/community/stats/page.tsx`

Original size: about 536 lines.

Current observed size after visual extraction pass: 426 lines.

Current status: `Visual pass done / good stopping point`.

The first safe presentational extraction pass has been completed. The page now imports local stats components from:

`app/(protected)/community/stats/components/`

Extracted components:
* `CommunityStatsHeader`
* `StatsErrorBanner`
* `MonthlyStatMiniCard`
* `MonthlySnapshotCard`
* `ColorSnapshotMiniCard`
* `ColorSnapshotCard`
* `StatsNavCard`
* `StatsExploreSection`

Data loading, current-user ownership scoping, monthly snapshot calculations, color total loading, helper functions, page-local types, and `statCards` navigation data remain in `page.tsx`, which matches the intended first-pass boundary.

Remaining cleanup candidates:
* `Link` is still imported in `page.tsx`, but navigation is now rendered through extracted components.
* `supabase.auth.getSession()` runs in two separate effects. This is behaviorally fine, but could be consolidated later with care.
* `monthStartYmd()` and `monthStartDate()` calculate the current month start in different formats.
* `SessionRow.minutes_read` is selected but not used in the hub snapshot.
* `WordRow.user_book_id` is selected but not used after filtering by owned book IDs.
* `statCards` has two cards tagged `Snapshot details`, which is not wrong but may be generic.
* If no session user is found, the page silently shows zeroed snapshots. This appears consistent with protected routing, but should be remembered.

These are behavior-aware cleanup candidates, not first-pass visual extraction work.

## Current Page Purpose

This page is the Community Stats Home / Stats Hub.

It lets users:
* see a quick monthly reading snapshot
* see a quick monthly reading-color snapshot
* navigate to focused stats pages
* open Reading Habits
* open Vocabulary Growth
* open Book Difficulty
* open Reading Ability
* open Detailed Monthly Stats
* open Detailed Reading Colors

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks if added later
* full-access checks if added later
* Supabase queries
* stats calculations
* current-user library scoping
* library color total loading
* navigation behavior
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `SessionRow`: reading session row shape loaded from `user_book_reading_sessions`.
* `WordRow`: saved-word row shape loaded from `user_book_words`.
* `SnapshotStats`: monthly snapshot shape for streaks, pages read, and words saved.
* `LibraryStudyColorTotals`: imported type from `@/lib/libraryStudyTotals`.

### 2. Constants

Keep in `page.tsx` for the first pass.

File-level constants:
* `statCards`: static navigation card data for focused stats pages.

Embedded constants/copy:
* page title and description
* monthly snapshot labels
* color snapshot labels and color classes
* error messages
* loading placeholder `"—"`
* route strings inside `statCards`

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

Date helpers:
* `ymdLocal`
* `monthStartYmd`
* `monthStartDate`
* `isThisMonth`

Stats helpers:
* `sessionPages`
* `buildStreakStats`

Imported helper/service:
* `emptyLibraryStudyColorTotals`
* `fetchLibraryStudyColorBreakdown`

### 4. State

Monthly snapshot:
* `loadingSnapshot`
* `snapshotError`
* `snapshot`

Reading colors snapshot:
* `loadingColors`
* `colorError`
* `colorTotals`

### 5. Data Loading

Keep all data loading in `page.tsx`.

Monthly snapshot loading:
* runs once in `useEffect`
* gets current session with `supabase.auth.getSession()`
* if no user, clears snapshot to zero values
* loads current user's `user_books` with `.eq("user_id", user.id)`
* uses the resulting owned `user_book_ids`
* loads `user_book_reading_sessions` with `.in("user_book_id", userBookIds)`
* loads `user_book_words` with `.in("user_book_id", userBookIds)`
* filters out filler sessions
* filters sessions and words to this month
* calculates active days, pages read, streaks, and words saved

Color snapshot loading:
* runs once in a separate `useEffect`
* gets current session with `supabase.auth.getSession()`
* if no user, clears color totals
* calls `fetchLibraryStudyColorBreakdown(user.id, null, { since })`
* stores `breakdown.colorTotals`

Current privacy boundary:
* the page uses the logged-in user's own `user.id`
* `user_books` are scoped with `.eq("user_id", user.id)`
* reading sessions and saved words are loaded only through the current user's owned `user_book_ids`
* color totals are loaded for the current user ID

### 6. Access / Full-Access Checks

No explicit full-access gate is present in this file.

Current behavior:
* if there is no Supabase session user, snapshots show zeroed/empty values
* no route username, query param, or other-user ID is used
* all private stats data is scoped to the current logged-in user

Do not add, move, or redesign access/full-access behavior during the visual pass.

### 7. Stats Hub Navigation / Card Behavior

Keep navigation data and `Link` behavior in `page.tsx` for the first visual pass.

Current navigation cards:
* Reading Habits -> `/community/stats/reading-habits`
* Vocabulary Growth -> `/community/stats/vocabulary`
* Book Difficulty -> `/community/stats/book-difficulty`
* Reading Ability -> `/community/stats/reading-ability`
* Detailed Monthly Stats -> `/community/stats/monthly`
* Detailed Reading Colors -> `/community/stats/colors`

The cards are static navigation. They do not save state or trigger data mutations.

### 8. Stats Summary Behavior

Keep summary calculations in `page.tsx`.

Monthly Snapshot:
* current streak
* best streak
* pages read this month
* words saved this month

Color Snapshot:
* red count
* orange count
* yellow count
* green count
* blue count
* purple count

Important current behavior:
* monthly snapshot is calculated from this month's sessions and saved words
* listening sessions do not contribute to pages read
* filler sessions are excluded
* color snapshot uses `fetchLibraryStudyColorBreakdown` with a month-start `since` date

### 9. Event Handlers

Current event handlers are minimal.

Navigation:
* `Link` navigation for each stats card

There are no form inputs, save handlers, delete handlers, or filter controls on this page.

### 10. Derived Values

Keep derived values in `page.tsx` for the first pass.

* `monthlyStats`: label/value pairs derived from `snapshot`.
* `colorSnapshotItems`: display items derived from `colorTotals`, including color classes.

### 11. Render Sections

Current render sections:
* page shell / max-width wrapper
* page header
* snapshot error banner
* color error banner
* two-column snapshot grid
* Monthly Snapshot card
* monthly stat mini cards
* Colors Snapshot card
* color count mini cards
* colors explanatory footnote
* Explore more stats heading
* stats navigation card grid

## First-Pass Visual Extractions

Status: completed.

Only extract presentational UI. Keep data loading, stats calculations, navigation data, helpers, and page-local types in `page.tsx`.

### 1. `CommunityStatsHeader`

What JSX it owns:
* top eyebrow
* `Stats Home` title
* description paragraph

What stays in `page.tsx`:
* page shell
* data loading
* stats state

Expected props:
* `eyebrow: string`
* `title: string`
* `description: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `StatsErrorBanner`

What JSX it owns:
* one rounded error banner
* color/tone classes based on error type

What stays in `page.tsx`:
* `snapshotError`
* `colorError`
* load/catch behavior

Expected props:
* `message: string`
* `tone: "red" | "purple"`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 2

### 3. `MonthlySnapshotCard`

What JSX it owns:
* Monthly Snapshot panel
* eyebrow/title
* description
* mini stat grid

What stays in `page.tsx`:
* `snapshot` state
* `monthlyStats` derivation
* monthly snapshot loading query and calculations

Expected props:
* `items: Array<[string, number]>`
* `loading: boolean`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 3

### 4. `MonthlyStatMiniCard`

What JSX it owns:
* one small label/value stat card
* loading placeholder display

What stays in `page.tsx`:
* item derivation
* loading state

Expected props:
* `label: string`
* `value: number`
* `loading: boolean`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 4

### 5. `ColorSnapshotCard`

What JSX it owns:
* Colors Snapshot panel
* eyebrow/title
* description
* color item grid
* explanatory footnote

What stays in `page.tsx`:
* `colorTotals` state
* `colorSnapshotItems` derivation
* color totals loading query/helper call

Expected props:
* `items: Array<{ label: string; value: number; cardClasses: string; dotClass: string; valueClass: string }>`
* `loading: boolean`

Category:
* presentational UI

Risk level:
* Low-medium because it receives Tailwind class strings from page-local derived values.

Suggested order:
* 5

### 6. `ColorSnapshotMiniCard`

What JSX it owns:
* one color count mini card
* color dot
* label
* value/loading placeholder
* `This month` pill

What stays in `page.tsx`:
* color totals
* item derivation
* loading state

Expected props:
* `label: string`
* `value: number`
* `cardClasses: string`
* `dotClass: string`
* `valueClass: string`
* `loading: boolean`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 6

### 7. `StatsExploreSection`

What JSX it owns:
* Explore more stats heading
* subtitle
* grid wrapper for navigation cards

What stays in `page.tsx`:
* `statCards` data
* navigation destinations

Expected props:
* `cards: Array<{ title: string; description: string; href: string; tag: string }>`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 7

### 8. `StatsNavCard`

What JSX it owns:
* one focused stats navigation card
* tag pill
* title
* description
* `Open ->` text
* `Link` wrapper

What stays in `page.tsx`:
* `statCards` data
* route choices

Expected props:
* `title: string`
* `description: string`
* `href: string`
* `tag: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 8

## Suggested Component Location

Use page-local stats components for the first pass:

`app/(protected)/community/stats/components/`

Possible files:
* `CommunityStatsHeader.tsx`
* `StatsErrorBanner.tsx`
* `MonthlySnapshotCard.tsx`
* `MonthlyStatMiniCard.tsx`
* `ColorSnapshotCard.tsx`
* `ColorSnapshotMiniCard.tsx`
* `StatsExploreSection.tsx`
* `StatsNavCard.tsx`

Keep helper functions, types, data loading, and calculations in `page.tsx`.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* The page uses `supabase.auth.getSession()` in two separate effects. This is behaviorally fine, but later it could be consolidated after visual thinning.
* `monthStartYmd()` and `monthStartDate()` both calculate the current month start in different formats. This is understandable, but could be cleaned up later with care.
* `SessionRow.minutes_read` is selected but not used in the current Monthly Snapshot. It may be useful for future snapshot cards, but it is currently unused here.
* `SessionRow.session_mode` is used only to exclude listening sessions from pages read.
* `WordRow.user_book_id` is selected but not used after the query returns. It is harmless, but possibly unnecessary for this page.
* `statCards` includes two cards tagged `Snapshot details`. This is fine, but those tags may be better clarified later if the hub card language is revised.
* The page has no explicit full-access gate. That appears consistent with the protected user stats area, but should not be changed during visual extraction.

## Completed First Pass

Completed extraction order:

1. Extracted `CommunityStatsHeader`.
2. Extracted `StatsErrorBanner`.
3. Extracted `MonthlyStatMiniCard`.
4. Extracted `MonthlySnapshotCard`.
5. Extracted `ColorSnapshotMiniCard`.
6. Extracted `ColorSnapshotCard`.
7. Extracted `StatsNavCard`.
8. Extracted `StatsExploreSection`.

Good stopping point reached for the first visual pass.

Do not move:
* Supabase session loading
* user book ownership scoping
* session/word queries
* color totals helper call
* monthly snapshot calculations
* color snapshot derivation
* helper functions
* types
* `statCards` navigation data

After the visual pass, the page can be revisited for small cleanup of duplicate session loading and unused selected fields, but that should be a separate behavior-aware cleanup pass.

## Current Tracker Row

`- [x] Visual pass done / good stopping point | app/(protected)/community/stats/page.tsx | 536 | 426 | -110 |`
