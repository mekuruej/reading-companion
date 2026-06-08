# Profile Settings Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/community/profile/settings/page.tsx`

Current size: about 541 lines.

## Current Page Purpose

This page lets the current user edit profile, reading setup, and public reader profile details.

It handles:
* display name
* username
* native language
* target language
* Mekuru reading level
* public name choice
* public JLPT/reading level display
* favorite genres
* public bio
* saving to `profiles`
* saving to `user_public_profile`
* redirecting after save

## Important User Flows

* User opens Edit Profile.
* Page loads the current Supabase user.
* Page loads existing `profiles` row.
* Page loads existing `user_public_profile` row.
* User edits account basics.
* User chooses a Mekuru reading level.
* User edits optional public reader profile details.
* User adds/removes favorite genre pills.
* User saves.
* Page validates required fields and username format.
* Page upserts `profiles` and `user_public_profile`.
* Page redirects to `/community/profile` and refreshes.

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* auth checks
* Supabase queries
* profile loading logic
* public profile loading logic
* save/update handlers
* validation
* form state
* username/display-name rules
* native language custom/other behavior
* public/private toggle/name behavior
* profile completion/onboarding behavior if added later
* redirect behavior after save
* role/teacher/admin behavior
* helper functions
* page-local types
* services, DAOs, controllers, or hooks

Do not change:
* username validation
* role preservation
* public name choice behavior
* reading level selection behavior
* save payloads
* redirect target
* copy unless required for component extraction

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### Types / Interfaces

Keep in `page.tsx` for the first pass.

* `ProfileRole`: allowed role union.
* `PublicProfileRow`: current user's public profile row shape.

### Constants

Keep in `page.tsx` for the first pass.

* `NATIVE_LANGUAGE_OPTIONS`
* `NATIVE_LANGUAGE_OTHER`
* `PROFILE_LEVEL_OPTIONS` import

### Helper Functions

Keep in `page.tsx` for the first pass.

Current local presentational helper:
* `SectionLabel`

`SectionLabel` is technically presentational and could be extracted later, but leave it during the first tiny prep pass unless extracting section wrappers.

### State

Keep all state in `page.tsx`.

Loading / messages:
* `loading`
* `saving`
* `errorMsg`
* `successMsg`

Core profile form state:
* `displayName`
* `username`
* `nativeLanguageChoice`
* `customNativeLanguage`
* `targetLanguage`
* `level`
* `existingRole`

Public profile form state:
* `publicNameChoice`
* `publicLevel`
* `favoriteGenres`
* `favoriteGenreInput`
* `bio`

### Data Loading / Supabase / Auth Behavior

Keep all data loading in `page.tsx`.

Current load behavior:
* calls `supabase.auth.getUser()`
* shows an error if no user is logged in
* loads current user's `profiles` row with `.eq("id", user.id)`
* loads current user's `user_public_profile` row with `.eq("user_id", user.id)`
* maps saved native language into either known option or `Other`
* preserves existing role in `existingRole`
* loads public name choice, public level, favorite genres, and bio
* uses an `active` flag to avoid setting state after unmount

### Save / Update Behavior

Keep save behavior in `page.tsx`.

Current save flow:
* `handleSave` gets the current Supabase user
* validates display name
* validates username exists
* validates username pattern: lowercase letters, numbers, underscores
* resolves custom native language when `Other` is selected
* validates native language
* validates target language
* validates reading level
* cleans favorite genres and removes duplicates case-insensitively
* upserts `profiles`
* upserts `user_public_profile`
* preserves existing role or falls back to `member`
* stores public JLPT level as `null` when `None`
* sets success message
* redirects to `/community/profile`
* refreshes the router

### Event Handlers

Keep all handlers in `page.tsx`.

Handlers:
* `addFavoriteGenresFromInput`
* `removeFavoriteGenre`
* `handleSave`
* input `onChange` setters
* native language select `onChange`
* target language select `onChange`
* public name select `onChange`
* public level select `onChange`
* favorite genre input Enter key handler
* save button `onClick`
* `MekuruReadingLevelGuide` `onSelect={setLevel}`

### Derived Values

Keep derived values in `page.tsx` for the first pass.

* `chosenPublicName`
* `selectedNativeLanguage` inside save handler
* `cleanUsername` inside save handler
* `cleanedGenres` inside save handler
* known-vs-other native language loading decision
* role fallback: `existingRole ?? "member"`
* public level save fallback: `publicLevel === "None" ? null : publicLevel`

### Render Sections

Current render sections:
* loading state inside `ProfileShell`
* `ProfileShell` edit wrapper
* core profile card
* account basics section label
* display name input
* username input and username rules
* native language select
* custom native language input
* target language select
* `MekuruReadingLevelGuide`
* public reader profile card
* public name choice select
* public chosen-name preview line
* public reading level select
* favorite genres input/add button
* favorite genre removable pills
* bio textarea
* error message
* success message
* sticky save bar
* save button

## Recommended First-Pass Visual Extractions

Only extract presentational UI. Keep all form state, handlers, validation, save logic, data loading, helper functions, and page-local types in `page.tsx`.

### 1. `ProfileSettingsLoadingState`

What JSX it owns:
* loading `ProfileShell`
* centered loading card

What stays in `page.tsx`:
* `loading` state
* profile load behavior

Expected props:
* none, or `message: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `ProfileSettingsMessage`

What JSX it owns:
* error message line
* success message line

What stays in `page.tsx`:
* `errorMsg`
* `successMsg`
* save/load error behavior

Expected props:
* `type: "error" | "success"`
* `message: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 2

### 3. `ProfileSettingsSectionLabel`

What JSX it owns:
* section eyebrow
* title
* detail text

What stays in `page.tsx`:
* section copy choices

Expected props:
* `title: string`
* `detail: string`
* `eyebrow?: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 3

### 4. `ProfileSettingsCoreCard`

What JSX it owns:
* core profile card wrapper
* account basics label
* display name field
* username field
* native language field
* custom native language field
* target language field

What stays in `page.tsx`:
* all form state
* all setters
* native language other decision
* username validation
* constants for native language options

Expected props:
* `displayName: string`
* `username: string`
* `nativeLanguageChoice: string`
* `customNativeLanguage: string`
* `targetLanguage: string`
* `nativeLanguageOptions: readonly string[]`
* `nativeLanguageOther: string`
* setter callbacks for each field

Category:
* presentational UI

Risk level:
* Medium because it receives many controlled form props. Keep behavior in the page.

Suggested order:
* 4

### 5. `ProfileSettingsPublicCard`

What JSX it owns:
* public reader profile card wrapper
* public name choice select
* chosen public name preview
* public reading level select
* favorite genres input and Add button
* favorite genre pills
* bio textarea

What stays in `page.tsx`:
* all public profile form state
* all setter callbacks
* add/remove genre handlers
* Enter key behavior callback
* level option constants

Expected props:
* `publicNameChoice: "display_name" | "username"`
* `displayName: string`
* `username: string`
* `chosenPublicName: string`
* `publicLevel: string`
* `favoriteGenres: string[]`
* `favoriteGenreInput: string`
* `bio: string`
* setter callbacks
* `onAddFavoriteGenres: () => void`
* `onRemoveFavoriteGenre: (genre: string) => void`

Category:
* presentational UI

Risk level:
* Medium because it receives controlled form props and handlers.

Suggested order:
* 5

### 6. `FavoriteGenreEditor`

What JSX it owns:
* favorite genres label/copy
* input
* Add button
* removable genre pills

What stays in `page.tsx`:
* `favoriteGenres` state
* `favoriteGenreInput` state
* add/remove handlers
* Enter-key behavior callback

Expected props:
* `favoriteGenres: string[]`
* `favoriteGenreInput: string`
* `onFavoriteGenreInputChange: (value: string) => void`
* `onAdd: () => void`
* `onRemove: (genre: string) => void`

Category:
* presentational UI

Risk level:
* Low-medium

Suggested order:
* 6

### 7. `ProfileSettingsSaveBar`

What JSX it owns:
* sticky save bar
* save button
* saving label

What stays in `page.tsx`:
* `saving` state
* `handleSave`

Expected props:
* `saving: boolean`
* `onSave: () => void`

Category:
* presentational UI

Risk level:
* Low-medium because it receives the save callback but does not own save behavior.

Suggested order:
* 7

## Suggested Component Folder

Use page-local components:

`app/(protected)/community/profile/settings/components/`

Suggested files:
* `ProfileSettingsLoadingState.tsx`
* `ProfileSettingsMessage.tsx`
* `ProfileSettingsSectionLabel.tsx`
* `ProfileSettingsCoreCard.tsx`
* `ProfileSettingsPublicCard.tsx`
* `FavoriteGenreEditor.tsx`
* `ProfileSettingsSaveBar.tsx`

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `SectionLabel` is a local presentational helper inside `page.tsx`; it is a safe later extraction.
* `successMsg` is set before `router.replace("/community/profile")`, so the success message may barely be visible before navigation.
* Username validation says lowercase only, and `cleanUsername` lowercases before validation. That means uppercase input is silently converted instead of rejected.
* `existingRole` is preserved on save and falls back to `member`; this is important and should not be moved casually.
* `PublicProfileRow.user_id` is selected but only used as part of the row shape, not directly in render.
* There is no explicit max length validation for `bio`, `displayName`, `username`, custom language, or favorite genres in the page.
* Public/private profile visibility is controlled through field choices here, but there is no obvious `is_public` toggle in this page.
* The page mixes core profile fields, reading-level selection, and public profile fields in one file.

## Recommended Stopping Point

For the first visual pass, stop after extracting:
* loading state
* message line
* section label
* core profile card
* public profile card
* favorite genre editor if useful
* sticky save bar

Do not move:
* `handleSave`
* `addFavoriteGenresFromInput`
* `removeFavoriteGenre`
* form state
* validation
* auth loading
* Supabase queries
* upsert payloads
* role preservation
* redirect/refresh behavior
* `MekuruReadingLevelGuide` behavior
