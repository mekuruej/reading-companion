# Library Practice Refactor Map

No-code refactor map for:

`app/(protected)/library-study/practice/page.tsx`

Current size: about 3,304 lines.

## Current Page Purpose

This page currently contains both Library Practice and Ability Check behavior.

It lets a signed-in full-access user:
* load their saved vocabulary across books
* compute Library Study colors and gates
* run daily Ability Check sessions
* run free Library Practice sessions
* filter Library Practice by JLPT and color
* study cards in reveal or typing practice modes
* save Ability Check gate progress
* record study events
* manage missed purple meaning reviews
* hide cards from study

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks
* full-access checks
* Supabase queries
* card loading and selection logic
* daily Ability Check selection logic
* Library Practice filtering logic
* answer checking logic
* study result, progress, log, and event writes
* previous, next, retry, shuffle, and finish behavior
* auto-forward timers
* focus timers
* keyboard event behavior
* helper functions
* services, DAOs, controllers, hooks, or page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `UserBookJoinRow`
* `UserBookWordRow`
* `LearningSettingsRow`
* `LibraryWordProgressRow`
* `LibraryWordSummaryRow`
* `LibraryWordClaimRow`
* `LibraryCheckGate`
* `StudyCard`
* `MeaningReviewItem`
* `LibraryCheckDebug`
* `StudyMode`
* `LibraryStudyMode`
* `ProfileRole`
* `PracticeRevealStep`
* `PracticeStudyMode`
* `PracticeTypingStep`
* `PracticeColorFilter`
* `DailyCheckLevel`
* `DailyCheckLimit`
* `DailyCheckPlan`

### 2. Constants

Keep in `page.tsx` for the first pass.

* `STORAGE_KEY`
* `MASTERED_MAINTENANCE_INTERVAL_DAYS`
* `REGULAR_GATE_RECHECK_MIN_DAYS`
* `REGULAR_GATE_RECHECK_WINDOW_DAYS`
* `MISSED_GATE_RECHECK_MIN_DAYS`
* `MISSED_GATE_RECHECK_WINDOW_DAYS`
* `LIBRARY_PROGRESS_KEY_BATCH_SIZE`
* `PRE_READING_WAIT_RECHECK_DAYS`
* `DEFAULT_LEARNING_SETTINGS`
* `LIBRARY_CHECK_WORD_PAGE_SIZE`
* `DAILY_CHECK_PLAN_STORAGE_KEY`
* `DAILY_CHECK_JLPT_LEVELS`
* `DAILY_CHECK_LEVELS`
* `DAILY_CHECK_LIMITS`

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

Daily check helpers:
* `isDailyCheckLevel`
* `isDailyCheckLimit`
* `cardMatchesDailyCheckLevels`
* `dailyCheckLevelsLabel`
* `loadDailyCheckPlanForToday`
* `saveDailyCheckPlanForToday`
* `cleanDailyCheckLimit`
* `availableDailyCheckCountForLevel`
* `buildDailyCheckDeckSource`
* `totalDailyCheckPoolCountForLevel`

Data and card helpers:
* `loadAllLibraryCheckWords`
* `loadLibraryWordClaims`
* `loadLibraryProgressByKey`
* `progressWithWordSkyClaim`
* `makeClaimStudyCard`
* `getBookMeta`
* `studyIdentityKey`
* `isClaimCardId`
* `definitionNumberFromIndex`
* `definitionLabel`
* `uniqueStrings`

Study/color helpers:
* `preReadingSupportCycle`
* `libraryStudyCardClass`
* `libraryStudyChipClass`
* `libraryStudyDotClass`
* `libraryStudyColorName`
* `pickLibraryCheckGate`
* `includeLibraryCheckCard`
* `isMasteredMaintenanceDue`
* `daysSinceIso`
* `missedGateRecheckDays`
* `isMissedGateLimboDue`
* `isRegularGateRecheckDue`
* `isCardAvailableForLibraryCheck`
* `isCardAvailableForLibraryPractice`

Answer/format helpers:
* `shuffleArray`
* `normalizeText`
* `normalizeKana`
* `normalizeJlpt`
* `isKatakanaOnly`
* `uniqueByNormalized`
* `matchesAnyMeaning`
* `errorMessage`

UI label helpers:
* `nextPracticeStudyMode`
* `practiceStudyModeLabel`
* `gatePromptText`
* `gatePromptClass`
* `checkModeLabel`
* `checkModeDescription`
* `promptModeClass`

### 4. State

Access/loading state:
* `currentUserId`
* `isTeacherUser`
* `learningSettings`
* `loading`
* `needsSignIn`
* `errorMsg`
* `canUseLibraryReview`
* `fullAccessLocked`

Card/deck state:
* `allCards`
* `deck`
* `index`
* `practiceDeck`
* `practiceIndex`
* `practiceRevealStep`
* `practiceFinished`
* `practiceStudyMode`
* `setDebugInfo`

Mode/filter state:
* `libraryMode`
* `selectedJlpt`
* `dailyCheckPlan`
* `setupLevels`
* `setupDailyLimit`
* `practiceColorFilter`
* `studyMode`

Answer state:
* `selectedAnswer`
* `checked`
* `typingInput`
* `twoStepStage`
* `firstStepChecked`
* `secondStepInput`
* `secondStepChecked`

Session/review state:
* `endedEarly`
* `notice`
* `seenTodayIds`
* `activeTodayKey`
* `forceCheckAgainToday`
* `meaningReviewItems`
* `showPracticeMeaningReview`

### 5. Data Loading

The main `load()` effect:
* gets the Supabase auth user
* loads `profiles`
* computes app/full-access status
* loads `user_books`
* loads `user_learning_settings`
* loads `user_library_word_summaries`
* loads Word Sky claim rows
* loads sample definition numbers from `user_book_words`
* loads `library_word_progress`
* builds summary-backed cards when summaries are available
* falls back to loading/grouping `user_book_words`
* appends claim-only cards
* sets `allCards`

Do not move this in the first pass.

### 6. Access / Full-Access Checks

The page requires:
* signed-in user
* profile lookup
* app access via `getAppAccessStatus`
* feature access via `getFeatureAccess`
* `canUseFullAccessFeature(featureAccess, "ability_check")`

If locked, it clears loaded decks and renders the full-access locked branch.

Do not move this in the first pass.

### 7. Study / Practice Flow

Ability Check flow:
* daily plan setup
* `filteredCards`
* `deck`
* `index`
* active `studyMode`
* reading/meaning gate logic
* seen-today tracking

Library Practice flow:
* `practiceFilteredCards`
* shuffled `practiceDeck`
* `practiceIndex`
* `practiceRevealStep`
* `practiceFinished`
* reveal/typing mode via `practiceStudyMode`
* final card action via `movePracticeDeckToNextMode`

Do not move this in the first pass.

### 8. Answer Checking Behavior

Practice typing behavior currently lives inside `LibraryPracticePanel`.

Ability Check behavior includes:
* `checkMultipleChoice`
* `checkTypingSingle`
* `checkCompleteStudyStep1`
* `checkCompleteStudyStep2`
* `matchesAnyMeaning`
* `normalizeKana`
* purple meaning-review correction flow

Do not move.

### 9. Previous / Next / Retry Behavior

Practice handlers:
* `goToNextPracticeCard`
* `advancePracticeCard`
* `goToPreviousPracticeCard`
* `shufflePracticeDeck`
* `movePracticeDeckToNextMode`

Ability Check handlers:
* `nextCardWithoutMarkingSeen`
* `finishForToday`
* `startCheckAgainToday`

Do not move.

### 10. Study Log / Event Behavior

Study event/progress behavior includes:
* `recordCurrentStudyEvent`
* `recordStudyEvent`
* `saveTypedGateProgress`
* `comeBackLaterForCurrentCard`
* `countMeaningReviewAsPassed`
* `countMeaningReviewAsMissed`
* `keepMeaningReviewMissed`
* `flagCurrentCard`

Do not move.

### 11. Derived Values

Important derived values:
* `dailyCheckLimit`
* `filteredCards`
* `practiceFilteredCards`
* `availableCountBySetupLevel`
* `poolCountBySetupLevel`
* `meaningOptions`
* `readingOptions`
* `surfaceOptions`
* `currentCard`
* `practiceCard`
* active prompts/classes/status labels

### 12. Event Handlers

Event handlers include:
* search param color initialization
* daily rollover/focus listeners
* auto-forward timers after checked answers
* input focus timers
* daily setup handlers
* check-again-today handlers
* practice navigation handlers
* typing and multiple-choice answer handlers
* meaning review pass/miss handlers
* route navigation handlers

### 13. Render Sections

Top-level render branches:
* loading
* needs sign-in
* full-access locked
* error
* no cards ready
* practice meaning review screen
* main Library Review page

Main page sections:
* page title
* Library Review intro card
* Word Sky CTA
* Review Progress card
* filter/mode controls
* practice complete card
* `LibraryPracticePanel`

Page-local child components:
* `KatakanaBadge`
* `LibraryCheckIntroCard`
* `LibraryPracticePanel`

## First-Pass Visual Extraction Recommendations

### 1. `LibraryReviewPageHeader`

What JSX it owns:
* top `Library Review` title wrapper

What stays in `page.tsx`:
* no logic

Expected props:
* `title?: string`

Category:
* presentational UI

Risk:
* very low

Suggested order:
* 1

### 2. `LibraryReviewIntroCard`

What JSX it owns:
* white intro card with `Library Review` title and description

What stays in `page.tsx`:
* no logic

Expected props:
* `title`
* `description`

Category:
* presentational UI

Risk:
* very low

Suggested order:
* 2

### 3. `LibraryReviewWordSkyCta`

What JSX it owns:
* full-width Word Sky CTA button/card

What stays in `page.tsx`:
* `router.push("/library-study/word-sky")`

Expected props:
* `onOpenWordSky`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 3

### 4. `LibraryReviewProgressCard`

What JSX it owns:
* Review Progress / Review Pool card

What stays in `page.tsx`:
* current/total calculations

Expected props:
* `current`
* `total`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 4

### 5. `LibraryPracticeFilterPanel`

What JSX it owns:
* JLPT select
* color select
* Reveal/Typing segmented control

What stays in `page.tsx`:
* selected values
* setter/event handler logic
* filtering logic

Expected props:
* `selectedJlpt`
* `practiceColorFilter`
* `practiceStudyMode`
* `onJlptChange`
* `onColorFilterChange`
* `onPracticeStudyModeChange`

Category:
* presentational UI

Risk:
* low-medium

Suggested order:
* 5

### 6. `LibraryPracticeCompleteCard`

What JSX it owns:
* Review complete card
* `Done!` copy
* Next / Review Again / Open Word Sky buttons

What stays in `page.tsx`:
* `nextPracticeStudyMode`
* `practiceStudyModeLabel`
* `movePracticeDeckToNextMode`
* `shufflePracticeDeck`
* navigation handler

Expected props:
* `nextModeLabel`
* `onNextMode`
* `onReviewAgain`
* `onOpenWordSky`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 6

### 7. `LibraryReviewEmptyState`

What JSX it owns:
* no-ready-words card
* Open Word Sky / Back to Library buttons

What stays in `page.tsx`:
* route handlers

Expected props:
* `onOpenWordSky`
* `onBackToLibrary`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 7

### 8. Early State Components

Create individual components rather than one logic wrapper:
* `LibraryReviewLoadingState`
* `LibraryReviewNeedsSignInState`
* `LibraryReviewErrorState`
* `LibraryReviewFullAccessLockedState`

What JSX they own:
* existing loading/sign-in/error/locked render branches

What stays in `page.tsx`:
* branching decisions
* access checks
* route handlers
* locked copy retrieval

Expected props:
* message/copy strings
* relevant click handlers

Category:
* presentational UI

Risk:
* low

Suggested order:
* 8

### 9. `PracticeMeaningReviewScreen`

What JSX it owns:
* meaning review screen
* item cards
* answer comparison layout
* pass/miss buttons

What stays in `page.tsx`:
* `meaningReviewItems` state
* all pass/miss/save handlers

Expected props:
* `items`
* `onFinish`
* `onBack`
* `onCountPassed`
* `onCountMissed`
* `onKeepMissed`

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 9

### 10. Small Shell Extractions Inside `LibraryPracticePanel`

Possible later visual-only pieces:
* `LibraryPracticeCardShell`
* `LibraryPracticeCardBadges`
* `LibraryPracticeTypingInput`
* `LibraryPracticeRevealFields`

What stays in current component:
* local typing state
* focus timers
* answer checking
* meaning-review queue calls
* navigation handlers

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 10

## Visual Pass Status

Recommended current status: `Visual pass mostly done / architecture deferred`.

Tracker row:

Visual pass mostly done / architecture deferred | `app/(protected)/library-study/practice/page.tsx` | 3304 | 2961 | -343 |

This means the safe visual/page-thinning layer has mostly been completed. The page is still intentionally architecture-deferred because it contains a mix of Library Practice, Ability Check, daily check setup, progress writes, meaning review, and study-flow behavior.

## Finished:

Finished:

* Extracted `LibraryReviewPageHeader`
* Extracted `LibraryReviewIntroCard`
* Extracted `LibraryReviewWordSkyCta`
* Extracted `LibraryReviewProgressCard`
* Extracted `LibraryPracticeFilterPanel`
* Extracted `LibraryPracticeCompleteCard`
* Extracted `LibraryReviewEmptyState`
* Extracted `LibraryReviewLoadingState`
* Extracted `LibraryReviewNeedsSignInState`
* Extracted `LibraryReviewErrorState`
* Extracted `LibraryReviewFullAccessLockedState`
* Extracted `PracticeMeaningReviewScreen`
* Extracted `LibraryPracticeCardBadges`
* Extracted `LibraryPracticeNoCardsState`
* Removed the now-unused local `KatakanaBadge` helper after `LibraryPracticeCardBadges` took over that display
* Cleaned up “Hepburn Romanji” wording to “Hepburn romaji”

Still intentionally deferred:

* access checks
* full-access checks
* Supabase queries
* card loading and selection logic
* daily Ability Check selection logic
* Library Practice filtering logic
* answer checking logic
* study result, progress, log, and event writes
* previous, next, retry, shuffle, and finish behavior
* auto-forward timers
* focus timers
* keyboard event behavior
* `LibraryPracticePanel` as a whole
* `load()` data-loading effect
* progress save helpers
* Ability Check setup/check-again behavior
* timing/recheck availability logic
* card construction helpers
* services, DAOs, controllers, hooks, or page-local types
* suspicious/possibly unused code cleanup

Notes:

* The page went from about 3304 lines to 2961 lines.
* The first visual pass brought the page under 3000 lines without moving the dangerous study/progress behavior.
* `LibraryPracticePanel` was only lightly touched by extracting visual badges and the no-cards state.
* Do not start the next pass by moving data loading or study logic.
* The next pass should start with behavior verification: Library Review filters, reveal mode, typing mode, review completion, meaning review, Word Sky CTA, full-access locked state, empty state, and sign-in/error states.


## Do Not Extract Yet

Do not extract in the first pass:
* `LibraryPracticePanel` as a whole
* `load()` data-loading effect
* progress save helpers
* Ability Check selection/filtering logic
* daily check localStorage behavior
* timing/recheck availability logic
* keyboard/focus/auto-forward timer behavior
* answer checking logic
* event logging
* card construction helpers

## Suspicious / Possibly Unused Code

Do not remove yet.

* `setDebugInfo` is called, but the state value is discarded with `const [, setDebugInfo] = useState(...)`.
* `LibraryCheckDebug` may now only support discarded debug state.
* `gatePromptText`, `gatePromptClass`, and `checkModeDescription` appear possibly unused.
* `hashString` appears suspicious and should be verified before removal.
* `isTeacherUser` is set; verify whether it still affects render/behavior.
* `libraryMode` supports `check` and `practice`, but the page currently initializes to `practice`; verify whether the check/practice switch is still visible or legacy.
* The file path is `library-study/practice/page.tsx`, but the file still contains Ability Check, Library Practice, daily plan setup, progress writes, and meaning review. Later architecture should probably split these, but not during the visual pass.
* Summary-backed card loading and fallback `user_book_words` card loading duplicate card construction/debug summary work.

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status label:

`Visual pass done / good stopping point`

This status fits because the easy outer-shell JSX has already been extracted into page-local components, and the remaining large sections are mostly behavior-heavy Library Practice / Ability Check logic rather than simple presentational markup. The page is now easier to scan at the top-level render branch: loading, sign-in, full-access locked, error, empty, meaning review, and main practice view are all clear.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/library-study/practice/page.tsx | 3304 | 2961 | -343 |`

The remaining work should be treated as architecture deferred, not visual thinning. The next pass should not chase line count; it should first clarify whether this page should continue containing both Library Practice and Ability Check support logic.

### 2. Readability Check

The page is easier to scan than before. The extracted state components, intro/progress/filter components, complete card, empty state, and meaning review screen make the render branch much calmer.

The extracted components are helping readability because they remove the most repetitive UI shell from `page.tsx` while leaving decisions and handlers visible in one place.

The remaining page sections are understandable, but the middle of the file is still dense because it mixes data loading, deck construction, daily check setup, practice reveal flow, typing flow, meaning review, study event writes, and gate progression.

The most visually overwhelming remaining area is `LibraryPracticePanel`. It still contains a lot of JSX, but it also owns local typing state, focus timers, answer checking, feedback, and meaning-review callbacks. Extracting it further is possible, but not as a low-risk line-count task.

### 3. Remaining Code Classification

Access / full-access checks:
* Supabase auth user loading.
* Profile lookup.
* app/full-access checks through `getAppAccessStatus`, `getFeatureAccess`, and `canUseFullAccessFeature`.
* locked state setup and render branch.

Supabase loading:
* user profile.
* user books.
* learning settings.
* library word summaries.
* Word Sky claims.
* sample `user_book_words`.
* `library_word_progress`.
* fallback full `user_book_words` loading.

Practice deck loading:
* summary-backed card construction.
* fallback grouped saved-word card construction.
* Word Sky claim-only card construction.
* progress merging and color status calculation.

Practice mode/filter behavior:
* JLPT filter.
* color filter.
* search-param color initialization.
* reveal/typing mode state.
* shuffled practice deck rebuilds.

Reveal/typing behavior:
* `practiceRevealStep`.
* reveal progression.
* typing sub-step state inside `LibraryPracticePanel`.
* typing focus/reselect behavior.

Answer checking behavior:
* kana normalization.
* meaning matching.
* practice typing pass/miss handling.
* meaning-review queueing.
* Ability Check multiple-choice and typing helpers still present in the file.

Card progression behavior:
* next/previous/shuffle.
* complete state.
* move same deck to next practice mode.
* daily check seen-today behavior still present.

Meaning review behavior:
* practice meaning review queue.
* pass/miss/keep-missed handlers.
* progress write hooks from review decisions.

Keyboard/focus behavior:
* typing input focus timers.
* Enter-key submit handling.
* broader Ability Check focus/auto-forward timers still present.

Study event/log behavior:
* `recordCurrentStudyEvent`.
* `recordStudyEvent`.
* progress upsert logic.
* hide/remove claim behavior.

UI state:
* loading/error/sign-in/locked state.
* selected filters.
* active card indices.
* complete/review state.
* notice/debug state.

Derived values:
* filtered card pools.
* daily setup counts.
* option lists.
* current active cards.
* labels/classes for colors, gates, and modes.

Helper functions:
* normalization helpers.
* color/gate helpers.
* availability helpers.
* daily plan helpers.
* card identity/card construction helpers.
* formatting helpers.

Visual JSX still in `page.tsx`:
* `LibraryCheckIntroCard`.
* `LibraryPracticePanel`.
* main composition around extracted components.

Component composition:
* top-level render now composes extracted components cleanly.
* `LibraryPracticePanel` composes `LibraryPracticeCardBadges` and `LibraryPracticeNoCardsState`, but otherwise remains local.

Legacy or suspicious code:
* discarded `setDebugInfo` state.
* `LibraryCheckDebug`.
* possibly unused gate prompt helpers.
* `libraryMode` / check-mode support inside a practice route.
* summary-backed and fallback card construction duplication.

Overall, the remaining 2961 lines are mostly behavior/architecture rather than easy visual JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `LibraryPracticeRevealCard`

What JSX it owns:
* reveal-mode card button.
* card badges.
* word, reading, and meaning reveal fields.

Why it is safe or not safe:
* It is mostly presentational, but it depends on reveal state, color helpers, definition helpers, and the card model. Extracting it would reduce one visible block inside `LibraryPracticePanel`, but it would still need several props or callback/helper props.

Expected risk level:
* Medium.

Do now or defer:
* Defer. It is not worth doing until the practice panel behavior is stabilized.

#### `LibraryPracticeTypingCard`

What JSX it owns:
* typing-mode card.
* typing label, surface/reading display.
* input.
* feedback panel.
* submit button.

Why it is safe or not safe:
* Not low-risk. It is tightly connected to local typing state, focus timers, Enter-key behavior, answer checking, missed-step behavior, and meaning-review callbacks.

Expected risk level:
* Medium-high.

Do now or defer:
* Defer. Extracting this now would either move behavior or create a large prop basket.

#### `LibraryPracticeNavigationControls`

What JSX it owns:
* Previous, review meanings, Skip, and Shuffle buttons.
* bottom explanatory copy.

Why it is safe or not safe:
* This is the clearest remaining visual extraction candidate. It only needs practice mode, total, meaning review count, and handlers.

Expected risk level:
* Low-medium.

Do now or defer:
* Defer for now. It is safe enough, but small; it will not materially clarify the page compared with the risk of another prop surface.

#### `LibraryCheckIntroCard`

What JSX it owns:
* mode intro card and Check/Practice segmented buttons.
* mode-specific explanation tiles.

Why it is safe or not safe:
* It is already a visual component but still local in `page.tsx`. Moving it to the shared components folder would be easy, but its check/practice split may be legacy or pending product clarification.

Expected risk level:
* Low.

Do now or defer:
* Defer until the page’s relationship to Ability Check is clearer.

### 5. Prop Basket / Over-Extraction Check

No extracted component appears too prop-heavy yet. `LibraryPracticeFilterPanel`, `PracticeMeaningReviewScreen`, and the full-access/empty/error states have reasonable prop surfaces.

The extraction did not make the page harder to understand. The page now reads more like orchestration at the render boundary.

Components that should stay local and page-specific for now:
* `LibraryPracticeFilterPanel`.
* `LibraryPracticeCompleteCard`.
* `PracticeMeaningReviewScreen`.
* `LibraryPracticeCardBadges`.
* all Library Review early/empty/full-access state components.

Components that might eventually become shared, but should stay local for now:
* `LibraryReviewProgressCard`.
* early loading/sign-in/error/locked states.
* card badges.

Do not move shared components yet. Ability Check, Library Practice, Book Study, and Kanji Study now have similar-looking study UI, but their behavior is still different enough that shared components should wait.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred:
* access checks.
* full-access checks.
* current-user scoped study data.
* Supabase queries.
* practice deck selection.
* practice filter behavior.
* reveal behavior.
* reading/meaning/typing behavior.
* answer validation behavior.
* card progression behavior.
* study event/log behavior.
* private saved-word data boundaries.

Nothing in the extracted components appears to own Supabase writes, access decisions, deck construction, answer validation, progress movement, or private saved-word loading.

Suspicious, but not fixed here:
* The route still includes substantial Ability Check machinery even though it is the Library Practice page.
* `libraryMode` and `LibraryCheckIntroCard` suggest older check/practice switching behavior, but the current render is practice-focused.
* Debug state and debug type may be leftovers.

### 7. Architecture Deferred List

Shared types:
* Defer because the page still mixes Library Practice and Ability Check concepts. Shared types should wait until the split is clearer.

Helper functions:
* Defer because helpers encode color gates, timing windows, daily plan rules, card identity, and answer matching. Moving them without tests could hide behavior changes.

Access helpers:
* Defer because access is currently explicit and easy to audit in-place. Centralize only after several pages use the same stable pattern.

Services / DAOs / controllers:
* Defer because the data-loading flow builds several derived models in-line. Extracting services should come with behavior tests or at least focused smoke tests.

Repeated Supabase loading:
* Defer because summary-backed loading and fallback saved-word loading need careful privacy and correctness verification before consolidation.

Practice deck helpers:
* Defer because deck construction uses learning settings, progress rows, color state, claims, and filters.

Filter helpers:
* Defer until JLPT/color behavior is fully settled across Library Practice and Book Study.

Answer normalization helpers:
* Defer because kana/meaning matching affects learner-facing correctness. This should be extracted only with tests or careful examples.

Study logging / event logic:
* Defer because event writes and progress movement are high-risk behavior.

Meaning review helpers:
* Defer because meaning review can move forgotten words back through gates and touches saved progress.

Card progression helpers:
* Defer because next/previous/shuffle/complete/next-mode behavior has UX implications and can easily change what students see.

### 8. Browser Smoke Test Suggestions

Manual smoke checklist:
* Log in as a full-access user and open `/library-study/practice`.
* Confirm logged-out behavior redirects or shows the expected sign-in state.
* Confirm a non-full-access user still sees the full-access locked state.
* Confirm cards load from the user’s own saved vocabulary.
* Confirm JLPT and color filters update the review pool.
* Confirm reveal practice shows word, then reading, then meaning.
* Confirm typing practice starts at reading, accepts a correct reading, then moves to meaning.
* Confirm typing practice handles incorrect reading and keeps focus in the input.
* Confirm typing practice handles correct and incorrect meaning answers.
* Confirm meaning review appears when missed meanings are queued.
* Confirm meaning review pass/miss/keep-missed buttons behave correctly.
* Confirm Previous, Skip, Shuffle, and completion behavior still work.
* Confirm “same cards to next mode” behavior works from the complete card.
* Confirm Word Sky CTA still navigates correctly.
* Confirm study events/progress save where applicable.
* Confirm keyboard Enter behavior still works in typing mode.
* Confirm the empty state still appears for a user with no cards.
* Check mobile-ish layout for the card shell, filter panel, completion card, feedback panel, and navigation controls.

Do not run this smoke test during the doc-only audit unless specifically requested.

### 9. Final Recommendation

Recommendation:

Stop visual thinning here.

The first visual pass reached a good stopping point. Further extraction should wait until second-pass architecture planning clarifies whether Library Practice and Ability Check should remain intertwined in this route. The next useful work is behavior verification and architecture planning, not another visual component pass.
