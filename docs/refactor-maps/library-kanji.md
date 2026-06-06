# Library Kanji Study Refactor Map

No-code refactor map for:

`app/(protected)/library-study/kanji/page.tsx`

Current size: about 1,572 lines.

## Current Page Purpose

This page is the global Kanji Study flow.

It lets a signed-in user:
* load global kanji-reading cards from `vocabulary_kanji_map` and `vocabulary_cache`
* add optional personal book/saved-word context from the user's own library
* study kanji with multiple-choice reading/kanji prompts
* run occasional recall typing prompts
* filter cards by learning level
* record kanji study events
* avoid repeating cards already studied today
* flag kanji map cards for teacher/super-teacher review

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks
* full-access checks
* Supabase queries
* global kanji data logic
* learner report/flag logic
* answer checking logic
* study result, log, and event writes
* previous, next, retry, and finish behavior
* auto-forward behavior
* keyboard event behavior
* helper functions
* services, DAOs, controllers, hooks, or page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `UserBookWordRow`
* `VocabularyCacheRow`
* `KanjiMapRow`
* `QuizCard`
* `RecallResult`
* `RecallMode`
* `CardQuestionMode`
* `LevelFilter`

### 2. Constants

Most constants are currently inline or local to the component/effects. Keep them in `page.tsx` for the first pass.

Notable fixed values:
* study mode string: `kanji_reading_flashcards`
* default level filter: `beginner`
* global kanji fetch limit
* vocabulary-cache chunk size
* user-book-word chunk size
* auto-advance delay after checked answers
* auto-advance delay after revealed recall answers
* notice-clear delay
* recall cadence values
* hardcoded `canAccessKanjiPractice = true`

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

Normalization and matching:
* `normalizeJlpt`
* `matchesLevelFilter`
* `normalizeReading`
* `normalizeWord`
* `hiraToKata`
* `kataToHira`

Kanji/card helpers:
* `kanjiChars`
* `hasExactlyOneKanji`
* `stableNumberFromString`
* `meaningPreviewFromSenses`
* `readingTypeLabel`
* `formatReadingForType`
* `isKunWithOkurigana`
* `getTrailingReadingHint`
* `splitKunyomiPromptReading`
* `selectOneCardPerKanji`
* `selectOneCardPerSourceWordForDay`
* `makeContextKey`

Utility helpers:
* `shuffleArray`
* `localDateKey`
* `startOfLocalDay`
* `chunkArray`

### 4. State

Access/loading state:
* `loading`
* `needsSignIn`
* `errorMsg`

Card/deck state:
* `baseCards`
* `deck`
* `index`

Answer state:
* `selected`
* `checked`
* `guessInput`

Recall state:
* `recallRevealed`
* `recallResult`
* `recallMatchedWord`
* `recallMatchedCard`
* `skipTypingThisSession`
* `usedRecallWords`
* `cardsSinceLastRecall`

Session/filter state:
* `endedEarly`
* `studiedTodayWords`
* `notice`
* `levelFilter`

### 5. Data Loading

The main `load()` effect:
* gets the Supabase auth user
* blocks unauthenticated users with `needsSignIn`
* loads global `vocabulary_kanji_map` rows
* loads today's `user_study_events` for the logged-in user
* loads related `vocabulary_cache` rows in chunks
* loads the current user's `user_books`
* loads visible `user_book_words` from the current user's own book IDs
* builds a user-word context map
* builds `QuizCard` rows from global map/cache data plus optional user context
* stores cards in `baseCards`

### 6. Access / Full-Access Checks

Current access behavior:
* requires a logged-in Supabase user
* scopes personal context through the logged-in user's own `user_books`
* records reports/events against the logged-in user

Current full-access behavior:
* `canAccessKanjiPractice` is hardcoded to `true`
* the locked/preview branch exists but is currently unreachable

Do not change this during the visual extraction pass.

### 7. Kanji Study Flow

Current flow:
* load global cards
* apply `levelFilter`
* exclude cards already studied today
* build a shuffled deck
* pick one card per source word per day
* choose between reading/kanji multiple-choice prompts
* occasionally route into recall typing prompts
* advance through the deck until completion

Keep all deck-building and selection logic in `page.tsx` for now.

### 8. Answer Checking Behavior

Multiple-choice behavior:
* `checkAnswer(choice)` sets selected/checked state
* compares the selected answer against the current card's correct value
* records a kanji study event
* marks the card studied today locally
* auto-advances after a delay

Recall behavior:
* `submitGuess()` checks typed recall answers
* `revealRecallCard()` reveals matched recall results
* recall answers also record study events and mark the card studied today

Keep all answer checking in `page.tsx` for now.

### 9. Previous / Next / Retry Behavior

Navigation/session handlers:
* `nextCard`
* `previousCard`
* `finishForToday`
* `restartDeck`
* `buildDeckFromCards`

Behavior includes:
* clearing answer/recall state between cards
* maintaining deck/index state
* ending or restarting a session
* returning to the library when finished for the day

Keep this behavior in `page.tsx` for now.

### 10. Report / Flag Behavior

`flagKanjiCardForReview()`:
* requires a logged-in user
* requires the current card to have a `vocabulary_kanji_map_id`
* inserts into `kanji_map_reports`
* stores the reporter user ID, reason, and open status
* handles duplicate-report errors
* shows a notice
* removes the reported card from the current deck

Keep all report/flag behavior in `page.tsx` for now.

### 11. Study Log / Event Behavior

`recordKanjiReadingStudyEvent()`:
* writes through `recordStudyEvent`
* uses study mode `kanji_reading_flashcards`
* records card type, correctness/result, source word, reading, meaning, JLPT, and optional user book word context

Today's studied cards:
* loaded from `user_study_events`
* stored locally in `studiedTodayWords`
* updated by `markCardStudiedToday()`

Keep all event writes and studied-today behavior in `page.tsx` for now.

### 12. Derived Values

Derived in render:
* `filteredBaseCards`
* `card`
* `cardQuestionMode`
* `canStartRecall`
* `inRecallFlow`
* `recallMode`
* `options`

Keep these in `page.tsx` for the first pass.

### 13. Event Handlers

UI handlers:
* level filter changes
* answer choice selection
* recall input changes
* recall submit
* previous card
* finish for today
* restart deck
* flag for review

Keyboard behavior:
* number keys choose multiple-choice options
* Enter submits recall input

Keep handlers and keyboard effects in `page.tsx` for now.

### 14. Render Sections

Top-level branches:
* loading
* sign-in required
* error
* no cards available
* locked/full-access preview
* completed session
* main study experience

Main study experience:
* intro/header area
* progress and filter controls
* notice banner
* study card frame
* prompt area
* answer options
* checked-answer feedback
* recall typing/result panel
* bottom controls

## First-Pass Visual Extractions

Status: visual component pass completed.

These were extracted as page-local presentational components. Do not promote shared components yet.

Completed:
* `KanjiStudyLoadingState`
* `KanjiStudyAccessState`
* `KanjiStudyHeader`
* `KanjiStudyProgressPanel`
* `KanjiStudyNotice`
* `KanjiStudyCompleteState`
* `KanjiStudyBottomControls`
* `KanjiStudyPreviewLockedState`
* `KanjiRecallPanel`
* `KanjiStudyOptionList`
* `KanjiStudyFeedbackPanel`
* `KanjiStudyCardFrame`
* `KanjiStudyPrompt`

### 1. `KanjiStudyLoadingState` - Done

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

### 2. `KanjiStudyAccessState` - Done

Owns:
* sign-in required message
* error message
* empty-state message

Stays in `page.tsx`:
* auth check
* branch selection
* navigation target decisions

Expected props:
* `title`
* `message`
* optional `primaryHref`
* optional `primaryLabel`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 2

### 3. `KanjiStudyCompleteState` - Done

Owns:
* completed-session card
* completion title/copy
* restart and library buttons

Stays in `page.tsx`:
* completion condition
* `restartDeck`
* library navigation behavior
* `endedEarly` state

Expected props:
* `endedEarly`
* `onRestart`
* `libraryHref`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 3

### 4. `KanjiStudyHeader` - Done

Owns:
* page title/introduction
* explanatory header copy

Stays in `page.tsx`:
* all data loading and card state

Expected props:
* optional `title`
* optional `description`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 4

### 5. `KanjiStudyProgressPanel` - Done

Owns:
* progress count
* cards-left count
* level filter select/control

Stays in `page.tsx`:
* `levelFilter` state
* filtered card calculation
* deck/index state

Expected props:
* `index`
* `deckLength`
* `levelFilter`
* `onLevelFilterChange`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 5

### 6. `KanjiStudyNotice` - Done

Owns:
* notice/banner JSX

Stays in `page.tsx`:
* notice state
* notice-clear timer

Expected props:
* `notice`

Category:
* presentational UI

Risk:
* very low

Suggested order:
* 6

### 7. `KanjiStudyPreviewLockedState` - Done

Owns:
* locked/full-access preview message
* preview-mode callout/card JSX

Stays in `page.tsx`:
* full-access decision
* locked branch selection
* access state

Expected props:
* optional `title`
* optional `message`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 7

### 8. `KanjiStudyCardFrame` - Done

Owns:
* outer card container
* top chips/badges
* repeated card layout structure
* slot/children placement for prompt, options, feedback, and recall panel

Stays in `page.tsx`:
* current card selection
* card mode derivation
* answer state
* all handlers

Expected props:
* `card`
* `cardQuestionMode`
* `children`

Category:
* presentational UI

Risk:
* medium-low

Suggested order:
* 8

### 9. `KanjiStudyPrompt` - Done

Owns:
* prompt heading/label
* kanji, reading, source word, and recall prompt display
* reading hint display

Stays in `page.tsx`:
* `cardQuestionMode`
* `recallMode`
* `inRecallFlow`
* answer/reveal logic

Expected props:
* `card`
* `cardQuestionMode`
* `recallMode`
* `inRecallFlow`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 9

### 10. `KanjiStudyOptionList` - Done

Owns:
* multiple-choice answer buttons
* selected/correct/incorrect visual states

Stays in `page.tsx`:
* option generation
* `checkAnswer`
* selected/checked state
* answer correctness logic

Expected props:
* `options`
* `selected`
* `checked`
* `correctAnswer`
* `onChoose`

Category:
* presentational UI

Risk:
* medium-low

Suggested order:
* 10

### 11. `KanjiStudyFeedbackPanel` - Done

Owns:
* checked-answer feedback copy
* correct/incorrect visual treatment

Stays in `page.tsx`:
* answer checking
* study event writes
* auto-forward timers

Expected props:
* `checked`
* `selected`
* `card`
* `cardQuestionMode`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 11

### 12. `KanjiRecallPanel` - Done

Owns:
* recall input
* recall submit button
* revealed recall result display
* matched card/word display

Stays in `page.tsx`:
* recall mode selection
* recall matching logic
* recall event writes
* recall auto-forward timer

Expected props:
* `guessInput`
* `onGuessChange`
* `onSubmit`
* `recallRevealed`
* `recallResult`
* `recallMatchedWord`
* `recallMatchedCard`

Category:
* presentational UI

Risk:
* medium

Suggested order:
* 12

### 13. `KanjiStudyBottomControls` - Done

Owns:
* Previous button
* Finished for the Day button
* Flag for Review button

Stays in `page.tsx`:
* navigation handlers
* flag/report handler
* disabled conditions

Expected props:
* `canGoPrevious`
* `onPrevious`
* `onFinish`
* `onFlag`

Category:
* presentational UI

Risk:
* low

Suggested order:
* 13

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* `canAccessKanjiPractice = true` makes the locked/full-access branch unreachable.
* `selectOneCardPerSourceWordForDay`, today event loading, `studiedTodayWords`, and `markCardStudiedToday()` use surface/source-word identity. This may collapse same-surface/different-reading entries such as `市【いち】` and `市【し】`.
* The dedicated note for that issue is `docs/refactor-maps/kanji-study-card-identity-bug.md`.
* `splitKunyomiPromptReading()` appears possibly unused and should be verified before removal.
* `endedEarly` appears present, but may not currently be set to `true`.
* `strokeCount`, `radical`, and `radicalName` are rendered defensively, but currently appear to be built as `null`.
* The locked preview copy may be stale if this page remains intentionally global kanji study.

## Recommended Next Step

The first visual extraction pass is complete.

Next safe behavioral fix to consider:
* address the card identity bug documented in `kanji-study-card-identity-bug.md`

Future feature direction:
* see `docs/future-features/kanji-study-modes.md` for the core reading mode roadmap
