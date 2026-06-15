# Profile Preview Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/community/profile/preview/page.tsx`

Current observed size: 280 lines as of 2026-06-15.

## Current Page Purpose

This page shows the current user a preview of their public reader profile.

It helps the user verify:
* which public name will show
* username display
* target language display
* reading level display
* public JLPT/level display
* favorite genres
* public bio
* current reading preview
* public-facing ability color totals
* which private/account details are not shown publicly

## Important User Flows

* User opens Public Profile Preview from the profile area.
* Page loads the current Supabase user.
* Page loads the current user's profile row.
* Page loads the current user's `user_public_profile` row.
* Page loads public-safe counts and current reading preview data.
* Page shows a public-reader-style preview.
* User can navigate to `/community/profile/settings` to edit public details.

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* auth checks
* current-user ownership assumptions
* Supabase queries
* profile loading logic
* public profile loading logic
* current reading query logic
* color totals loading logic
* profile visibility decisions
* public/private display behavior
* helper functions
* page-local types
* services, DAOs, controllers, or hooks

Do not change:
* public/private profile display behavior
* username/display-name selection behavior
* profile ownership/current-user assumptions
* navigation links
* copy unless required for component extraction

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### Types / Interfaces

Keep in `page.tsx` for the first pass.

* `ProfileRow`: private/current profile basics loaded from `profiles`.
* `PublicProfileRow`: public profile fields loaded from `user_public_profile`.
* `CurrentBookPreview`: normalized current reading card data.
* `LibraryStudyColorTotals`: imported color totals shape.

### Constants

Keep in `page.tsx` for the first pass.

* `publicAbilityColors`: three public-facing color cards:
  * Green / Reading Gate
  * Blue / Meaning Gate
  * Purple / Mastered

### Helper Functions

Keep in `page.tsx` for the first pass.

* `firstInitial`
* `displayValue`
* `formatCount`

Imported helpers/services to leave alone:
* `findMekuruReadingLevel`
* `emptyLibraryStudyColorTotals`
* `fetchLibraryStudyColorTotals`

### State

Keep all state in `page.tsx`.

Loading / messages:
* `loading`
* `errorMsg`

Loaded profile data:
* `profile`
* `publicProfile`
* `bookCount`
* `libraryWordCount`
* `currentBooks`
* `colorTotals`

### Data Loading / Supabase / Auth Behavior

Keep all data loading in `page.tsx`.

Current behavior:
* calls `supabase.auth.getUser()`
* if no user, shows `Please sign in again.`
* loads `profiles` by current `user.id`
* loads `user_public_profile` by current `user.id`
* counts current user's `user_books`
* counts current user's `user_library_word_summaries`
* loads up to three current reading books from current user's `user_books`
* excludes teacher-prep books from current reading preview
* loads library study color totals for current user
* uses a cancellation flag to avoid setting state after unmount

Important privacy boundary:
* this page loads only the logged-in user's own profile and library data
* it does not load another user's profile by route param
* it does not expose email/login/native language in the preview card

### Event Handlers

Current event behavior is minimal.

Navigation:
* `Link` to `/community/profile/settings`

No form input, save, update, or delete handlers are present.

### Derived Values

Keep derived values in `page.tsx` for the first pass.

* `displayName`
* `username`
* `publicNameChoice`
* `publicName`
* `favoriteGenres`
* `publicStats`
* `readingLevel`
* fallback display labels from `displayValue`
* first initial from `firstInitial`
* public ability color counts from `formatCount(colorTotals[color.key])`

### Render Sections

Current render sections:
* `ProfileShell` wrapper
* max-width content wrapper
* error banner
* main public profile preview card
* decorative top band
* avatar initial
* public name / username / target language line
* public stats grid
* Japanese level card
* public ability color cards
* public bio panel
* currently reading section
* public level / role / favorite genres section
* privacy note / actions card
* Edit public details link

## Recommended First-Pass Visual Extractions

Only extract presentational UI. Keep all loading, data, privacy decisions, derived display values, helpers, and page-local types in `page.tsx`.

### 1. `ProfilePreviewErrorState`

What JSX it owns:
* red error banner

What stays in `page.tsx`:
* `errorMsg` state
* auth/load error logic

Expected props:
* `message: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `ProfilePreviewHeader`

What JSX it owns:
* decorative top band
* avatar initial
* `Public Reader Profile` eyebrow
* public name heading
* username / target language line

What stays in `page.tsx`:
* public name choice logic
* username fallback logic
* target language fallback logic
* first initial helper

Expected props:
* `loading: boolean`
* `initial: string`
* `publicName: string`
* `usernameLabel: string`
* `targetLanguageLabel: string`

Category:
* presentational UI

Risk level:
* Low-medium because username/display-name visibility decisions must stay in the page.

Suggested order:
* 2

### 3. `ProfilePreviewStatsGrid`

What JSX it owns:
* public stat mini cards
* Japanese level card

What stays in `page.tsx`:
* `publicStats` derivation
* `readingLevel` derivation
* fallback level label

Expected props:
* `loading: boolean`
* `publicStats: Array<{ label: string; value: string }>`
* `readingLevel: { value: string; plain: string; cefr: string; jlpt: string } | null`
* `fallbackLevelLabel: string`

Category:
* presentational UI

Risk level:
* Low-medium

Suggested order:
* 3

### 4. `ProfilePreviewAbilityColors`

What JSX it owns:
* green/blue/purple public ability color cards

What stays in `page.tsx`:
* `publicAbilityColors` constant
* color count formatting
* color totals loading

Expected props:
* `loading: boolean`
* `items: Array<{ key: string; label: string; description: string; dotClass: string; value: string }>`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 4

### 5. `ProfilePreviewBio`

What JSX it owns:
* public bio panel

What stays in `page.tsx`:
* bio fallback behavior

Expected props:
* `bio: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 5

### 6. `ProfilePreviewCurrentBooks`

What JSX it owns:
* Currently reading heading
* current book cards
* cover placeholders
* title/author display
* null render when no current books

What stays in `page.tsx`:
* Supabase query for current books
* teacher-prep exclusion logic
* normalization of joined book rows

Expected props:
* `books: CurrentBookPreview[]`

Category:
* presentational UI

Risk level:
* Low-medium because it uses page-local current book data shape.

Suggested order:
* 6

### 7. `ProfilePreviewDetailsGrid`

What JSX it owns:
* public level card
* role card
* favorite genres card
* favorite genre pills
* empty favorite genre copy

What stays in `page.tsx`:
* public level fallback
* role fallback
* favorite genres derivation

Expected props:
* `publicLevelLabel: string`
* `roleLabel: string`
* `favoriteGenres: string[]`

Category:
* presentational UI

Risk level:
* Low-medium because role display should not be reinterpreted.

Suggested order:
* 7

### 8. `ProfilePreviewCard`

What JSX it owns:
* main outer preview card wrapper
* layout composition of header, stats, ability colors, bio, current books, and details grid

What stays in `page.tsx`:
* all data loading
* all public/private display decisions
* all derived display values

Expected props:
* display-ready props from the smaller sections above

Category:
* presentational UI

Risk level:
* Medium. Extract after smaller subcomponents are stable.

Suggested order:
* 8

### 9. `ProfilePreviewActions`

What JSX it owns:
* `Not public here` privacy note
* private data explanatory copy
* link to `/community/profile/settings`

What stays in `page.tsx`:
* route choice
* profile/privacy rules

Expected props:
* optionally `settingsHref: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 9

## Suggested Component Folder

Use page-local components:

`app/(protected)/community/profile/preview/components/`

Suggested files:
* `ProfilePreviewErrorState.tsx`
* `ProfilePreviewHeader.tsx`
* `ProfilePreviewStatsGrid.tsx`
* `ProfilePreviewAbilityColors.tsx`
* `ProfilePreviewBio.tsx`
* `ProfilePreviewCurrentBooks.tsx`
* `ProfilePreviewDetailsGrid.tsx`
* `ProfilePreviewCard.tsx`
* `ProfilePreviewActions.tsx`

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `PublicProfileRow` does not include an `is_public` field. If profile visibility exists elsewhere, this page currently previews public-facing fields without checking that field.
* `role` is shown in the preview details grid. That may be intentional, but it is worth confirming whether role should be public.
* `formatCount` is used only for the public ability color cards.
* `bookCount` counts all current user's `user_books`; current reading preview excludes teacher-prep books, but the total book count does not.
* Current reading preview depends on joined `books` metadata and normalizes with `any[]`.
* `fetchLibraryStudyColorTotals` errors are swallowed into empty totals while other Supabase errors are shown.

## Recommended Stopping Point

For the first visual pass, stop after extracting:
* error state
* header
* stat grid
* ability color cards
* bio panel
* current books panel
* details grid
* actions/privacy note

Do not move:
* auth checks
* Supabase queries
* current-user profile loading
* public profile behavior
* username/display-name choice logic
* helper functions
* page-local types
* route links

## Current Refactor Audit, 2026-06-15

Current observed line count:

* `app/(protected)/community/profile/preview/page.tsx`: 280 lines

Extracted visual components:

* `ProfilePreviewErrorState`
* `ProfilePreviewHeader`
* `ProfilePreviewStatsGrid`
* `ProfilePreviewAbilityColors`
* `ProfilePreviewBio`
* `ProfilePreviewCurrentBooks`
* `ProfilePreviewDetailsGrid`
* `ProfilePreviewActions`

Suggested components intentionally left in the page:

* `ProfilePreviewCard`

The full-card wrapper was not extracted. This is acceptable because the page is already small and the remaining wrapper keeps the privacy-sensitive derived display values close to the data that produces them.

Risk-boundary check:

The page still owns Supabase auth, current-user profile loading, `user_public_profile` loading, current reading preview loading, color totals loading, derived display-name/privacy choices, and route links. No extraction appears to have moved current-user ownership assumptions or public/private display decisions into a data-owning component.

Current status:

Visual pass mostly done. Good stopping point. Architecture deferred.

Updated tracker row:

```md
- [x] | Visual pass mostly done / good stopping point / architecture deferred | `app/(protected)/community/profile/preview/page.tsx` | 418 | 280 | -138 |
```
