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
