# Dashboard Refactor Map

No-code refactor map for:

`app/dashboard/page.tsx`

Current observed size: 394 lines as of 2026-06-15.

## Current Page Purpose

This page is the app dashboard / student entrance.

It handles:
* Supabase auth UI for signed-out users
* OAuth callback/session exchange
* profile setup enforcement
* post-login routing to the library
* signed-in dashboard welcome state
* Word Sky warm-up words and claim toggles
* public-facing reader-role cards for signed-out visitors
* navigation back to the public MEKURU site

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks
* profile setup checks
* app access checks if added later
* Supabase auth/session queries
* Supabase profile queries
* Word Sky pool query
* warm-up claim read/write/delete logic
* redirects
* navigation logic
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `WarmupWord`: normalized dashboard warm-up word shape.
* `WordSkyPoolRow`: raw-ish row shape returned from `get_word_sky_pool`.
* `ProfileBasics`: profile fields required for setup readiness.

### 2. Constants

Keep in `page.tsx` for the first pass.

Routing/auth:
* `POST_LOGIN_TARGET`
* `POST_LOGIN_PARAM`
* `POST_LOGIN_VALUE`
* `PROFILE_SETUP_TARGET`

Warm-up:
* `WARMUP_WORD_COUNT`
* `FALLBACK_WARMUP_WORDS`

Implicit render constants:
* warm-up bubble positions
* reader-role card content
* beta waiting-list URL
* dashboard background image paths
* reader-role icon paths

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

Warm-up identity / daily selection:
* `normalizeText`
* `normalizeKana`
* `studyIdentityKey`
* `dashboardWarmupSeed`
* `seededScore`
* `dailyWarmupWords`

Profile readiness:
* `isProfileReady`

### 4. State

Auth/session:
* `checkingSession`
* `isLoggedIn`
* `userId`

Warm-up:
* `warmupWords`
* `warmupClaimKeys`

There is no explicit loading state for warm-up words. The page starts with fallback words and replaces them after the pool/claims load.

### 5. Data Loading

Keep all data loading in `page.tsx`.

Session/profile routing effect:
* reads URL params for auth callback and post-login destination
* exchanges `code` for a Supabase session
* gets current Supabase session
* loads `profiles` fields required for setup readiness
* redirects incomplete profiles to `/community/profile/setup`
* redirects post-login library flow to `/books`
* subscribes to `supabase.auth.onAuthStateChange`

Warm-up effect:
* falls back to `FALLBACK_WARMUP_WORDS` when no user is present
* calls `get_word_sky_pool` RPC when signed in
* normalizes rows into `WarmupWord`
* chooses daily deterministic warm-up words
* loads matching `user_library_word_claims`
* stores claimed identity keys

### 6. Access / Profile / App-Access Checks

Keep in `page.tsx`.

Current checks:
* signed-out users see the login/landing dashboard
* signed-in users are checked for profile setup readiness
* incomplete profiles redirect to `/community/profile/setup`
* post-login query param can redirect signed-in users to `/books`

App-access note:
* The page displays “App access is for enrolled students & beta readers only.”
* There is no explicit app-access query or full-access gate in this file right now.
* Do not add/move app-access logic during the visual pass.

### 7. Navigation / Dashboard Card Behavior

Keep navigation behavior in `page.tsx`.

Signed-in:
* `Go to My Library` routes to `/books`
* warm-up word buttons call `claimWarmupWord`

Signed-out:
* Supabase Auth sign-in redirects back to `/dashboard`
* beta waiting-list link opens Google Forms in a new tab

Global:
* `Back to MEKURU site` routes to `/`

### 8. Event Handlers

Keep handlers in `page.tsx`.

Main handler:
* `claimWarmupWord`

Inline handlers:
* warm-up word button `onClick`
* `Go to My Library` button
* `Back to MEKURU site` button

Auth callbacks:
* `routeSignedInUser`
* `loadSession`
* `onAuthStateChange` callback

### 9. Derived Values

Derived values are mostly local inside effects/render.

Effect-derived:
* `shouldOpenLibraryAfterLogin`
* daily warm-up selection from fallback or Word Sky pool
* warm-up claim keys

Render-derived:
* warm-up word `key`
* `claimed`
* bubble `top` / `left` positions
* Auth `redirectTo` URL

No memoized derived values are currently present.

### 10. Render Sections

Current render order:
* full-page background image overlay
* slate overlay
* left gradient overlay
* centered page content wrapper
* checking-session signed-in loading card
* signed-in welcome card
* Word warm-up panel
* My Library button
* signed-out hero/login section
* Mekuru banner image
* Supabase Auth sign-in card
* beta waiting-list copy/link
* reader-role section
* Alchemist role card
* Sage role card
* Magician role card
* Back to MEKURU site button
* `dashboard-word-bob` keyframe styles

## Recommended First-Pass Visual Extractions

Only extract presentational JSX. Keep auth, profile checks, Supabase queries, redirects, warm-up claim logic, helper functions, and navigation logic in `page.tsx`.

### 1. `DashboardBackground`

What JSX it owns:
* three absolute background layers:
  * photo background
  * slate overlay
  * left gradient overlay

What stays in `page.tsx`:
* page shell
* choice of whether to render the background

Expected props:
* none, or optional `imageUrl?: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `DashboardLoadingCard`

What JSX it owns:
* checking-session loading card
* “Welcome to Mekuru” / “Signing you in...” copy

What stays in `page.tsx`:
* `checkingSession` branch

Expected props:
* optional `title?: string`
* optional `message?: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 2

### 3. `DashboardWarmupPanel`

What JSX it owns:
* Word warm-up panel shell
* title and explanatory copy
* bubble area
* individual warm-up word buttons
* footer note

What stays in `page.tsx`:
* `warmupWords`
* `warmupClaimKeys`
* `studyIdentityKey`
* `claimWarmupWord`
* bubble position array if keeping behavior extra conservative

Expected props:
* `words: WarmupWord[]`
* `claimedKeys: Set<string>`
* `getKey: (word: WarmupWord) => string`
* `onToggleWord: (word: WarmupWord) => void`

Category:
* presentational UI

Risk level:
* Low-Medium

Suggested order:
* 3

Why slightly higher than the others:
* It renders interactive buttons and animation timing.
* Keep identity and claim behavior in `page.tsx`.

### 4. `SignedInDashboardCard`

What JSX it owns:
* signed-in welcome card
* welcome title and copy
* slot for warm-up panel
* My Library button

What stays in `page.tsx`:
* signed-in branch
* `router.push("/books")`
* warm-up data and claim handler

Expected props:
* `onOpenLibrary: () => void`
* `children?: React.ReactNode`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 4

### 5. `SignedOutLoginSection`

What JSX it owns:
* banner/login two-column section
* Mekuru banner image
* student entrance card shell
* sign-in explanatory copy
* beta waiting-list copy/link
* slot for `Auth`

What stays in `page.tsx`:
* Supabase `Auth` configuration can either stay directly in `page.tsx` as children or be passed in as a child
* `redirectTo` calculation

Expected props:
* `children: React.ReactNode`

Category:
* presentational UI

Risk level:
* Low-Medium

Suggested order:
* 5

Why slightly higher than the others:
* Supabase `Auth` is a third-party UI component.
* Keep Auth config in `page.tsx` during the first pass and pass it as children.

### 6. `ReaderRolesSection`

What JSX it owns:
* reader roles heading and intro copy
* three role cards

What stays in `page.tsx`:
* signed-out branch
* no logic

Expected props:
* none for first pass

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 6

### 7. `ReaderRoleCard`

What JSX it owns:
* individual role card layout
* circular icon holder
* role title/subtitle
* bullet list

What stays in `page.tsx`:
* role content can stay in `ReaderRolesSection` initially

Expected props:
* `iconSrc: string`
* `iconAlt: string`
* `title: string`
* `subtitle: string`
* `points: string[]`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 7

### 8. `DashboardBackButton`

What JSX it owns:
* bottom “Back to MEKURU site” button

What stays in `page.tsx`:
* `router.push("/")` callback

Expected props:
* `onBack: () => void`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 8

## Suggested Component Location

Keep components local for the first pass:

`app/dashboard/components/`

Suggested files:
* `DashboardBackground.tsx`
* `DashboardLoadingCard.tsx`
* `DashboardWarmupPanel.tsx`
* `SignedInDashboardCard.tsx`
* `SignedOutLoginSection.tsx`
* `ReaderRolesSection.tsx`
* `ReaderRoleCard.tsx`
* `DashboardBackButton.tsx`

Do not promote shared components yet.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* The file imports and renders Supabase `Auth` directly. This is fine, but it makes signed-out visual extraction slightly more delicate.
* There is visible app-access copy, but no explicit app-access check/query in this page. Access may be handled elsewhere, but this page itself only checks auth/profile setup.
* `routeSignedInUser` returns `true` for profile query errors after showing the signed-in dashboard. The boolean means “stop the caller from continuing,” but the name could be clearer later.
* `checkingSession` can remain true during redirects. This is okay, but the loading card may briefly show while routing.
* `normalizeText` and `studyIdentityKey` can produce `||` for empty values, but warm-up words are filtered before use in the Word Sky pool path. Fallback words are valid.
* Bubble positions are hardcoded for `WARMUP_WORD_COUNT = 4`. If the count changes, the fallback position behavior should be revisited.
* The reader-role section is large static JSX and is a strong candidate for visual extraction.
* Some JSX indentation in the reader-role signed-out section is uneven. A visual extraction or formatting pass would clean this up without behavior changes.

## Recommended First Pass

1. Extract `DashboardBackground`.
2. Extract `DashboardLoadingCard`.
3. Extract `ReaderRoleCard` and `ReaderRolesSection`.
4. Extract `DashboardBackButton`.
5. Extract `DashboardWarmupPanel`.
6. Extract `SignedInDashboardCard`.
7. Extract `SignedOutLoginSection` last, passing the configured `Auth` component as children.

Stop there for the first pass.

Leave auth/session/profile setup checks, Supabase queries, redirects, warm-up identity helpers, warm-up claim writes, and navigation logic in `page.tsx`.

* Extracted `DashboardBackground`
* Extracted `DashboardLoadingCard`
* Extracted `DashboardBackButton`
* Extracted `ReaderRoleCard`
* Extracted `ReaderRolesSection`
* Extracted `DashboardWarmupPanel`
* Extracted `SignedInDashboardCard`
* Extracted `SignedOutLoginSection`

## Current Refactor Audit, 2026-06-15

Current observed line count:

* `app/dashboard/page.tsx`: 394 lines

Extracted visual components:

* `DashboardBackground`
* `DashboardLoadingCard`
* `DashboardBackButton`
* `ReaderRoleCard`
* `ReaderRolesSection`
* `DashboardWarmupPanel`
* `SignedInDashboardCard`
* `SignedOutLoginSection`

These match the recommended first visual pass.

Suggested components intentionally left in the page:

* No major suggested visual components remain page-local.
* Auth/session/profile/warm-up helpers remain page-local.

Risk-boundary check:

The page still owns Supabase auth/session handling, OAuth callback exchange, profile setup readiness checks, redirects, Word Sky pool loading, warm-up daily selection, claim loading, claim insert/delete behavior, and navigation callbacks. No extraction appears to have moved auth/profile routing or warm-up claim writes into visual components.

Current status:

Visual pass mostly done. Good stopping point. Architecture deferred.

Updated tracker row:

```md
- [x] | Visual pass mostly done / good stopping point / architecture deferred | `app/dashboard/page.tsx` | 636 | 394 | -242 |
```
