# Library Check Refactor Map

No-code refactor map for:

`app/(protected)/library-study/check/page.tsx`

Current size: about 4,090 lines.

## Current Page Purpose

This page is the strict Ability Check / Library Study gate-check flow.

It lets a signed-in full-access user:
* load saved vocabulary across books
* compute Library Study colors and active gates
* choose a daily Ability Check by JLPT level
* run strict due-card checks
* answer reading or meaning typing prompts
* move readiness cards to the Reading Gate
* hold difficult cards for support
* write Library Study progress
* record study events
* hide problem cards
* review missed meaning answers

The file also still contains some Library Practice UI/state, likely from an earlier combined Library Study page.

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks
* full-access checks
* Supabase queries
* card loading and selection logic
* Ability Check selection logic
* daily plan localStorage behavior
* seen-today localStorage behavior
* answer checking logic
* study result, log, event, and progress writes
* previous, next, retry, finish, and support behavior
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
* `PracticeRevealStep`
* `PracticeStudyMode`
* `PracticeTypingStep`
* `PracticeColorFilter`
* `DailyCheckLevel`
* `DailyCheckPlan`

### 2. Constants

Keep in `page.tsx` for the first pass.

* `STORAGE_KEY`
* `ABILITY_CHECK_COMPLETED_KEY`
* `ABILITY_CHECK_REMINDER_HIDE_KEY`
* `REGULAR_GATE_RECHECK_MIN_DAYS`
* `REGULAR_GATE_RECHECK_WINDOW_DAYS`
* `MISSED_GATE_RECHECK_MIN_DAYS`
* `MISSED_GATE_RECHECK_WINDOW_DAYS`
* `PRE_READING_SOFT_WAIT_RECHECK_DAYS`
* `LIBRARY_PROGRESS_KEY_BATCH_SIZE`
* `PRE_READING_WAIT_RECHECK_DAYS`
* `DEFAULT_LEARNING_SETTINGS`
* `LIBRARY_CHECK_WORD_PAGE_SIZE`
* `DAILY_CHECK_PLAN_STORAGE_KEY`
* `DAILY_CHECK_JLPT_LEVELS`
* `DAILY_CHECK_LEVELS`
* `ABILITY_CHECK_MIN_DUE_CARDS`

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

Daily plan and localStorage helpers:
* `isDailyCheckLevel`
* `cardMatchesDailyCheckLevels`
* `dailyCheckLevelsLabel`
* `loadDailyCheckPlanForToday`
* `saveDailyCheckPlanForToday`
* `getTodayKey`
* `loadSeenForToday`
* `saveSeenForToday`
* `markAbilityCheckCompletedToday`
* `hideAbilityCheckReminderForToday`

Data and card helpers:
* `loadAllLibraryCheckWords`
* `loadLibraryWordClaims`
* `loadLibraryProgressByKey`
* `progressWithWordSkyClaim`
* `isReadyForReadingGateProgress`
* `makeClaimStudyCard`
* `studyIdentityKey`
* `isClaimCardId`
* `getBookMeta`
* `definitionNumberFromIndex`
* `definitionLabel`
* `uniqueStrings`

Color and availability helpers:
* `preReadingSupportCycle`
* `libraryStudyCardClass`
* `libraryStudyChipClass`
* `libraryStudyDotClass`
* `libraryStudyColorName`
* `pickLibraryCheckGate`
* `includeLibraryCheckCard`
* `daysSinceIso`
* `missedGateRecheckDays`
* `regularGateRecheckDays`
* `appDayNumber`
* `isInitialGateSlotDue`
* `lastStudiedTime`
* `rankDailyCheckCards`
* `isCardSeenToday`
* `dedupeCardsByStudyIdentity`
* `isMissedGateLimboDue`
* `isBackToRedSupportCard`
* `isRegularGateRecheckDue`
* `isCardAvailableForLibraryCheck`
* `availableDailyCheckCountForLevel`
* `buildDailyCheckDeckSource`
* `checkSessionSummary`
* `checkSessionSummaryText`
* `isCardAvailableForLibraryPractice`

Answer helpers:
* `shuffleArray`
* `normalizeText`
* `normalizeKana`
* `normalizeJlpt`
* `isKatakanaOnly`
* `errorMessage`
* `normalizeMeaningAnswer`
* `meaningAnswerCandidates`
* `matchesAnyMeaning`
* `shortMeaningRetypeHint`

UI label/class helpers:
* `gatePromptText`
* `gatePromptClass`
* `checkModeLabel`
* `checkModeDescription`
* `studyModeForActiveGate`
* `promptModeClass`

### 4. State

Access/loading state:
* `currentUserId`
* `learningSettings`
* `loading`
* `needsSignIn`
* `errorMsg`
* `canUseAbilityCheck`
* `fullAccessLocked`

Card/deck state:
* `allCards`
* `deck`
* `index`
* `practiceDeck`
* `practiceIndex`
* `practiceRevealStep`
* `practiceStudyMode`
* `setDebugInfo`

Mode/filter/setup state:
* `libraryMode`
* `selectedJlpt`
* `dailyCheckPlan`
* `setupLevels`
* `practiceColorFilter`

Answer state:
* `checked`
* `typingInput`
* `typingCorrectionComplete`

Session/review state:
* `endedEarly`
* `notice`
* `seenTodayIds`
* `activeTodayKey`
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
* loads `user_library_word_progress`
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

If locked, it clears cards/deck state and renders the full-access locked branch.

Do not move this in the first pass.

### 7. Ability Check / Library Study Flow

Main Ability Check flow:
* derives due cards by JLPT level
* shows setup if no daily plan exists
* saves selected levels as today’s plan
* locks the day’s card IDs in localStorage
* builds the active deck from the saved daily plan
* tracks seen cards by card id and study identity
* chooses the active gate for each card
* renders readiness, reading, or meaning prompts
* marks completed days only when strict check rules are met

Do not move this in the first pass.

### 8. Answer Checking Behavior

Current strict check behavior:
* `studyModeForActiveGate` picks reading/meaning typing mode
* `checkTypingSingle` validates answers
* reading checks use `normalizeKana`
* meaning checks use `matchesAnyMeaning`
* incorrect answers require a retype correction before the card can advance
* meaning answers are queued for review
* correct/incorrect results save progress and record a study event

Do not move this in the first pass.

### 9. Previous / Next / Retry Behavior

Ability Check navigation:
* `nextCardWithoutMarkingSeen`
* `movePastCurrentCard`
* `finishForToday`
* readiness action: `moveCurrentCardToReadingGate`
* support action: `comeBackLaterForCurrentCard`

Practice leftovers:
* `goToNextPracticeCard`
* `advancePracticeCard`
* `goToPreviousPracticeCard`
* `shufflePracticeDeck`

Do not move this in the first pass.

### 10. Study Log / Event / Progress Writes

Writes include:
* `recordCurrentStudyEvent` using `recordStudyEvent`
* `saveTypedGateProgress` upserting `user_library_word_progress`
* `comeBackLaterForCurrentCard` upserting held/support progress
* `moveCurrentCardToReadingGate` upserting progress
* `countMeaningReviewAsPassed`
* `countMeaningReviewAsMissed`
* `flagCurrentCard` deleting a claim or hiding a `user_book_words` row
* localStorage writes for seen cards, daily plan, completed date, and hidden reminder date

Do not move this in the first pass.

### 11. Derived Values

Important derived values:
* `currentCard`
* `practiceCard`
* `activeStudyMode`
* `currentInstructionText`
* `filteredCards`
* `practiceFilteredCards`
* `availableCountBySetupLevel`
* `allLevelsDueCount`
* `allLevelsSelected`
* `selectedDueCount`
* active gate labels/classes
* session summary text

### 12. Event Handlers

Handlers include:
* daily rollover/focus listeners
* daily level toggles
* start daily check
* check answer
* correction/retype behavior
* finish early
* readiness gate action
* support/come-back-later action
* meaning review pass/miss
* hide/flag card
* route navigation buttons
* auto-forward timer
* Enter suppression after answer
* input focus timer

### 13. Render Sections

Top-level render branches:
* loading
* needs sign-in
* full-access locked
* error
* no saved vocab ready
* Ability Check resting
* daily setup page
* no due cards
* practice meaning review branch
* check meaning review branch
* daily check complete / saved-place branch
* main Ability Check page

Main Ability Check sections:
* page title
* intro/status card
* Word Sky CTA
* FAQ
* progress card
* daily levels / mode controls
* current card shell
* readiness prompt
* reading/meaning typing prompt
* feedback and card recap
* check mode/action panel

Page-local child components:
* `AbilityCheckFaq`
* `KatakanaBadge`
* `LibraryCheckIntroCard`
* `LibraryPracticePanel`

## First-Pass Visual Extraction Recommendations

### 1. `AbilityCheckLoadingState`

What JSX it owns:
* loading full-screen state

What stays in `page.tsx`:
* `loading` branch

Expected props:
* `message?: string`

Category:
* presentational UI

Risk:
* very low

Suggested order:
* 1

### 2. `AbilityCheckNeedsSignInState`

What JSX it owns:
* sign-in required full-screen state

What stays in `page.tsx`:
* `needsSignIn` branch
* router handler

Expected props:
* `onGoToLogin`

Category:
* presentational UI

Risk:
* very low

Suggested order:
* 2

### 3. `AbilityCheckErrorState`

What JSX it owns:
* error full-screen state

What stays in `page.tsx`:
* `errorMsg` branch
* route handler

Expected props:
* `message`
* `onBackToLibrary`

Category:
* presentational UI

Risk:
* very low

Suggested order:
* 3

### 4. `AbilityCheckFullAccessLockedState`

What JSX it owns:
* full-access locked card
* Back to Library / View Reading Stats buttons

What stays in `page.tsx`:
* access checks
* `getFullAccessRequiredCopy`
* route handlers

Expected props:
* `title`
* `message`
* `onBackToLibrary`
* `onViewStats`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 4

### 5. `AbilityCheckNoCardsState`

What JSX it owns:
* no-ready-vocab card
* Word Sky / Back to Library buttons

What stays in `page.tsx`:
* `allCards.length === 0` branch
* route handlers

Expected props:
* `onOpenWordSky`
* `onBackToLibrary`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 5

### 6. `AbilityCheckRestingState`

What JSX it owns:
* “Ability Check is resting today” card
* study option buttons

What stays in `page.tsx`:
* due-count decisions
* `practiceFilteredCards.length` condition
* route handlers

Expected props:
* `dueCount`
* `minDueCards`
* `hasPracticeCards`
* `onOpenPractice`
* `onOpenWordSky`
* `onOpenPurpleReview`
* `onOpenBookFlashcards`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 6

### 7. `AbilityCheckSetupPanel`

What JSX it owns:
* daily setup page card
* explanatory copy
* FAQ placement
* level buttons
* start/navigation buttons

What stays in `page.tsx`:
* `setupLevels`
* `availableCountBySetupLevel`
* `allLevelsDueCount`
* `selectedDueCount`
* `toggleSetupLevel`
* `toggleAllSetupLevels`
* `startDailyCheck`
* route handlers

Expected props:
* `levels`
* `setupLevels`
* `availableCountBySetupLevel`
* `allLevelsDueCount`
* `selectedDueCount`
* `minDueCards`
* `hasPracticeCards`
* handler props for toggles/start/routes

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 7

### 8. `AbilityCheckProgressCard`

What JSX it owns:
* progress / cards-left card

What stays in `page.tsx`:
* current/total/card-left calculations

Expected props:
* `label`
* `current`
* `total`
* `rightLabel`
* `rightValue`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 8

### 9. `AbilityCheckCardShell`

What JSX it owns:
* outer card frame
* gate prompt badge
* color badge
* katakana badge slot
* definition chip
* read-count chip
* `children`

What stays in `page.tsx`:
* active gate decisions
* answer checking
* progress writes

Expected props:
* `card`
* `gateLabel`
* `gateClassName`
* `colorName`
* `colorDotClassName`
* `definitionLabel`
* `children`

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 9

### 10. `AbilityCheckReadinessPrompt`

What JSX it owns:
* readiness prompt body
* “Ready for Reading Gate” button
* “Not yet” support button

What stays in `page.tsx`:
* readiness decision
* `moveCurrentCardToReadingGate`
* `comeBackLaterForCurrentCard`

Expected props:
* `surface`
* `onReady`
* `onNotYet`

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 10

### 11. `AbilityCheckTypingPrompt`

What JSX it owns:
* reading/meaning prompt
* helper copy
* input
* Check button
* send-back-to-red support button
* instruction text

What stays in `page.tsx`:
* `typingInput`
* `checked`
* `checkTypingSingle`
* focus timer
* keyboard handling
* correction behavior

Expected props:
* `mode`
* `surface`
* `reading`
* `typingInput`
* `checked`
* `instructionText`
* `canSendBack`
* `inputRef`
* handler props

Category:
* presentational UI

Risk:
* medium-high

Suggested order:
* 11

### 12. `AbilityCheckFeedbackPanel`

What JSX it owns:
* correct/not-quite message
* purple mastered animation block
* card recap after answer

What stays in `page.tsx`:
* checked state and mode decisions

Expected props:
* `checked`
* `activeStudyMode`
* `card`

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 12

### 13. `AbilityCheckActionPanel`

What JSX it owns:
* Check Mode summary card
* Finish early button
* Too hard for now button
* Flag button

What stays in `page.tsx`:
* `finishForToday`
* `comeBackLaterForCurrentCard`
* `flagCurrentCard`
* `canComeBackLater`

Expected props:
* `modeLabel`
* `modeDescription`
* `meaningReviewCount`
* `canComeBackLater`
* handler props

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 13

### 14. `AbilityCheckCompleteState`

What JSX it owns:
* daily complete / saved-place card
* completion copy
* route buttons

What stays in `page.tsx`:
* completion branch
* `endedEarly`
* meaning-review decisions
* route handlers

Expected props:
* `endedEarly`
* `summaryText`
* `meaningReviewCount`
* handler props

Category:
* presentational UI

Risk:
* low-medium

Suggested order:
* 14

### 15. `AbilityCheckMeaningReviewScreen`

What JSX it owns:
* meaning review screen
* answer review cards
* finish/back buttons

What stays in `page.tsx`:
* review item state
* pass/miss/save handlers

Expected props:
* `items`
* `onFinish`
* `onBack`
* pass/miss handler props if the current check branch uses them

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 15

## Do Not Extract Yet

Do not extract in the first pass:
* `load()` data-loading effect
* daily card selection and ranking
* due/recheck timing helpers
* localStorage plan/seen/reminder logic
* answer checking
* correction/retype behavior
* progress upserts
* study event writes
* keyboard/focus/auto-forward timers
* helper functions
* types
* `LibraryPracticePanel` logic

## Suspicious / Possibly Unused Code

Do not remove yet.

* `setDebugInfo` is called, but the state value is discarded with `const [, setDebugInfo] = useState(...)`.
* `LibraryCheckDebug` may now only support removed debug UI.
* `hashString` should be verified before keeping or removing.
* `LibraryCheckIntroCard` appears defined but not obviously used.
* This Ability Check route still contains `LibraryPracticePanel`, practice deck state, and practice filters. That is suspicious now that `/library-study/practice` exists separately.
* `libraryMode` supports `practice`, but this route initializes to `check` and often routes users to `/library-study/practice`.
* Summary-backed loading and fallback `user_book_words` loading duplicate card construction and debug mapping.
* Some reading helper copy in this file may drift from the updated book/practice wording; verify separately before changing because this doc pass is no-code.
