# Book Study Flashcards Refactor Map

No-code refactor map for:

`app/(protected)/books/[userBookId]/study/page.tsx`

Current size: about 2,414 lines.

## Current Page Purpose

This page is the book-specific vocabulary flashcard study flow.

It lets an allowed viewer:
* load saved words for one `user_book`
* load the owner's broader library words for multiple-choice distractors and total encounter counts
* filter cards by JLPT, chapter, repeats, and study mode
* study each selected card once per session
* use tap-to-reveal, typing, and multiple-choice modes
* check reading / meaning / word answers
* write legacy `study_logs` and unified `user_study_events`
* flag problem cards for teacher review
* hide mastered cards from the flashcard set
* navigate back to Vocab List or Book Hub

## Current Risks / Do Not Touch Yet

For the first pass, do not move:
* access checks
* ownership checks
* teacher/student permission checks
* app/full-access checks
* Supabase queries
* card loading and selection logic
* duplicate/repeat-count logic
* library distractor pool logic
* multiple-choice option generation
* answer checking logic
* study result/log/event writes
* previous/next/retry behavior
* auto-forward timers
* keyboard event behavior
* flag/hide database writes
* definition update behavior
* helper functions
* services, DAOs, controllers, or hooks
* page-local types

The safest first pass is visual/presentational component extraction only.

## Current Structure Map

### 1. Types

Keep in `page.tsx` for the first pass.

* `StudySet`: study mode union covering typing, multiple-choice, reading-to-meaning, and complete review modes.
* `StepField`: reveal field union: `word`, `reading`, `meaning`.
* `KanjiMetaItem`: kanji/stroke metadata used on word rows.
* `WordRow`: raw `user_book_words` row shape loaded from Supabase.
* `Flashcard`: normalized card shape used by the study UI.

### 2. Constants

Keep in `page.tsx` for the first pass.

* `JLPT_LEVELS`: filter levels in display order.
* `studyOnceMode`: currently hardcoded `true` inside the component.
* `settingsKey`: derived localStorage key for this book's flashcard settings.

### 3. Helper Functions

Keep all helpers in `page.tsx` for the first pass.

File-level helpers:
* `studySetLabel`
* `normalizeJlpt`
* `chapterInfoFromRow`
* `kataToHira`
* `normalizeReading`
* `normalizeMeaning`
* `meaningWords`
* `meaningMatchesOneWord`
* `asStringArray`
* `normalizeRepeatKey`
* `hasKanji`
* `shuffleArray`
* `shuffledCandidatePool`

Component-local helpers:
* `canAccessUserBook`
* `clearTypedInput`
* `clearCorrectionInput`
* `getFirstKana`
* `getLastKana`
* `getReadingLength`
* `buildReadingMcOptions`
* `buildMeaningMcOptions`
* `countKanji`
* `countKana`
* `getOkurigana`
* `getWordShape`
* `buildWordMcOptions`
* `logStudyEvent`
* `goToNextWord`
* `goToPrevWord`
* `resetMcState`
* `skipCardForToday`
* `flagCardForReview`
* `hideCardPermanently`
* `nextCardReveal`
* `prevCardReveal`
* `checkTypedAnswer`
* `handleMcAnswer`
* `checkCorrectionAnswer`
* `flip`
* `setDefinitionForCurrent`
* inner `Row` render helper

### 4. State

Card pools:
* `cards`
* `filteredCards`
* `libraryCards`

Study mode and session order:
* `studySet`
* `sessionOrder`
* `sessionIndex`
* `stepIndex`
* `firstTouch`

Typing mode:
* `typedInput`
* `typedFeedback`
* `typeRevealIndex`
* `readyForNextCard`
* `lastTypedResult`
* `inputResetKey`
* `typedInputRef`

Multiple-choice mode:
* `mcOptions`
* `mcSelected`
* `mcCorrectAnswer`
* `mcAnswered`
* `mcWasCorrect`
* `correctionInput`
* `correctionFeedback`
* `correctionInputRef`

Access/loading:
* `loading`
* `needsSignIn`
* `errorMsg`
* `accessChecked`
* `canAccessBook`
* `canUseStudyFlashcards`
* `fullAccessLocked`
* `accessMessage`
* `meId`

Filters/settings:
* `jlptSelected`
* `chapterFilter`
* `repeatsOnly`
* `chapterOptions`

Book display:
* `bookTitle`
* `bookCover`

Definition picker/update:
* `defSaving`
* `defError`
* `showDefPicker`

### 5. Data Loading

Keep all data loading in `page.tsx`.

Local settings:
* load from `localStorage` using `settingsKey`
* save current settings back to `localStorage`

Access/book load:
* auth user from Supabase
* profile role, super-teacher flag, and app access fields
* app access through `getAppAccessStatus`
* feature access through `getFeatureAccess` and `canUseFullAccessFeature`
* `user_books` row and joined book title/cover
* teacher/student access through `teacher_students`

Card load:
* all owner `user_books` to build library-wide repeat/total counts and distractor pool
* owner library `user_book_words` for `libraryCards`
* current book `user_book_words` for active flashcard cards
* filter out hidden, excluded, and today's skipped cards
* normalize meaning choices and selected definition
* compute repeat counts and total counts
* dedupe cards by `normalizeRepeatKey(surface)`
* build chapter options

### 6. Access / Ownership Checks

Keep in `page.tsx`.

Flow:
* require signed-in user
* load profile
* derive app access and full-access feature access
* load `user_books`
* deny missing book
* check owner/super-teacher/linked-teacher access with `canAccessUserBook`
* show full-access locked view when the book is accessible but `study_flashcards` is not available
* block write actions when `canAccessBook` or `canUseStudyFlashcards` is false

### 7. Study / Flashcard Flow

Keep card flow in `page.tsx`.

Main flow:
* compute `steps` from `studySet`
* filter `cards` into `filteredCards`
* build `sessionOrder`
* choose current card using `sessionOrder[sessionIndex]`
* reset typed/multiple-choice state on filter, session, and mode changes
* tap-to-reveal mode advances through `word`, `reading`, and `meaning`
* typing modes show fixed prompts and answer inputs
* multiple-choice modes generate options from current book and library pools
* session ends when `studyOnceMode` is true and all session cards have been reviewed

### 8. Answer Checking Behavior

Keep all answer checking in `page.tsx`.

Typing:
* `READING`: normalized kana/romaji reading must match normalized card reading
* `MEANING`: one normalized meaning word must match selected meaning or meaning choices
* `FROM_READING_MEANING`: one normalized meaning word must match selected meaning or meaning choices
* fallback branch checks typed word, meaning, and homophone cards, though current `typeModeEnabled` modes appear to route before this branch

Multiple choice:
* `READING_MC`: normalized reading match
* `MEANING_MC`: lowercased exact selected meaning match
* `FROM_READING_MC`: exact word match
* `FROM_READING_MEANING_MC`: lowercased exact selected meaning match

Correction:
* after wrong MC answer, user must type the correct reading, word, or one meaning word
* successful correction auto-forwards after timer

### 9. Previous / Next / Retry Behavior

Keep in `page.tsx`.

* `goToNextWord` logs the study event, advances `sessionIndex`, and resets all per-card UI state.
* `goToPrevWord` moves backward in study-once mode and sets reveal state to the final card side.
* `nextCardReveal` advances reveal step or calls `goToNextWord`.
* `prevCardReveal` backs up reveal step or calls `goToPrevWord`.
* successful typing answers auto-forward after a 4-second timer.
* successful MC answers auto-forward after a 4-second timer.
* completion screen has `Study Again`, which reshuffles order and resets state.

### 10. Study Log / Event Behavior

Keep in `page.tsx`.

`logStudyEvent` writes:
* legacy `study_logs`
* unified `recordStudyEvent`

Result mapping:
* `correct` -> unified `correct`, `isCorrect: true`
* `wrong` -> unified `incorrect`, `isCorrect: false`
* `revealed` -> unified `reviewed`, `isCorrect: null`

Study event fields include:
* `userBookId`
* `userBookWordId`
* `studyMode: study_flashcards`
* `cardType: studySet`
* `surface`
* `reading`
* `meaning`

Other writes:
* `skipCardForToday` updates `user_book_words.skipped_on`
* `flagCardForReview` updates flag/review fields and excludes from flashcards
* `hideCardPermanently` updates `hidden`
* `setDefinitionForCurrent` updates `meaning_choice_index` and `meaning`

### 11. Derived Values

* `settingsKey`
* `steps`
* `isMultipleChoiceMode`
* `typeModeEnabled`
* `currentCardIndex`
* `card`
* `currentTypeAnswerField`
* `showWord`
* `showReading`
* `showMeaning`
* `cardColorStatus`
* progress display values
* cards-left display value
* study mode help text
* MC option selected/correct/wrong state
* current answer placeholder text

### 12. Event Handlers

Filter/settings handlers:
* JLPT toggle
* JLPT all/clear
* chapter filter change
* repeats-only toggle
* study mode change
* clear filters

Card/answer handlers:
* card click `flip`
* typed input change
* typed Enter handling
* MC answer click
* correction input change
* correction Enter handling
* correction check click
* previous click
* keyboard global handler

Card action handlers:
* flag current card
* hide current card
* `Study Again`
* navigate to Vocab List
* navigate to Book Hub
* navigate to Just Reading Timer in locked state

### 13. Render Sections

Early returns:
* loading
* needs sign-in
* access-loading
* access denied
* full-access locked
* error
* no matching cards
* session complete

Main render:
* book header with cover/title and intro copy
* JLPT filter panel
* chapter/repeats filter panel
* session progress panel
* flashcard shell
* flashcard corner badges: JLPT, Library color, definition number, total reads
* card content rows
* multiple-choice answer area
* wrong-answer correction area
* typing answer area
* study mode/action panel
* flag/hide action buttons
* helper/instruction row with Previous
* navigation buttons to Vocab List and Book Hub

## Recommended First-Pass Visual Extractions

Only extract presentational JSX. Keep state, handlers, data, access, card selection, answer logic, timers, and writes in `page.tsx`.

### 1. `StudyBookHeader`

What JSX it owns:
* book cover image
* book title
* intro copy

Stays in `page.tsx`:
* `bookTitle`
* `bookCover`
* loading/access decisions

Expected props:
* `bookTitle: string`
* `bookCover: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 1

### 2. `StudyFilterPanel`

What JSX it owns:
* JLPT checkbox pills
* All/Clear buttons
* chapter select
* repeats-only checkbox

Stays in `page.tsx`:
* filter state
* state setters/handlers
* `JLPT_LEVELS` for first pass unless passed in as props
* chapter option derivation
* filtering effect
* localStorage persistence

Expected props:
* `jlptLevels`
* `jlptSelected`
* `chapterFilter`
* `chapterOptions`
* `repeatsOnly`
* `onToggleJlpt`
* `onSelectAllJlpt`
* `onClearJlpt`
* `onChapterFilterChange`
* `onRepeatsOnlyChange`

Category:
* presentational UI

Risk level:
* Low to medium because many controlled inputs are involved

Suggested order:
* 2

### 3. `StudyProgressPanel`

What JSX it owns:
* session progress card
* card number
* cards-left number

Stays in `page.tsx`:
* session math
* `studyOnceMode`
* `sessionIndex`
* `sessionOrder`
* `filteredCards`

Expected props:
* `currentNumber`
* `totalNumber`
* `cardsLeft`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 3

### 4. `StudyCardFieldRow`

What JSX it owns:
* current inner `Row` helper markup
* label
* value
* visible/placeholder styling
* large/small text styling

Stays in `page.tsx`:
* visibility calculations
* values
* answer mode logic

Expected props:
* `label: string`
* `value: string`
* `visible: boolean`
* `big?: boolean`
* `placeholder?: string`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 4

### 5. `StudyCardBadges`

What JSX it owns:
* four corner badge containers
* JLPT badge
* Library color badge
* definition number badge
* total reads badge

Stays in `page.tsx`:
* `cardColorStatus` derivation
* `computeLibraryStudyColorStatus`
* current card

Expected props:
* `jlpt`
* `colorStatus`
* `meaningChoiceIndex`
* `totalCount`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 5

### 6. `MultipleChoiceAnswerPanel`

What JSX it owns:
* choose-answer label
* MC option grid
* selected/correct/wrong option styling
* result feedback text
* correction input and check button
* correction feedback

Stays in `page.tsx`:
* MC option generation
* `handleMcAnswer`
* `checkCorrectionAnswer`
* correction input state
* answer checking logic
* auto-forward timer

Expected props:
* `studySet`
* `card`
* `options`
* `selected`
* `correctAnswer`
* `answered`
* `wasCorrect`
* `correctionInput`
* `correctionFeedback`
* `correctionInputRef`
* `onSelectOption`
* `onCorrectionInputChange`
* `onCheckCorrection`

Category:
* presentational UI

Risk level:
* Medium because it contains many mode-specific display branches, but handlers stay in page

Suggested order:
* 6

### 7. `TypingAnswerPanel`

What JSX it owns:
* answer label
* reading hint copy
* controlled typed input
* typed feedback block
* wrong-answer helper copy

Stays in `page.tsx`:
* `checkTypedAnswer`
* typed answer state transitions
* ready-for-next behavior
* input reset key logic
* answer checking logic

Expected props:
* `studySet`
* `typedInput`
* `typedFeedback`
* `readyForNextCard`
* `inputKey`
* `typedInputRef`
* `onTypedInputChange`
* `onEnter`

Category:
* presentational UI

Risk level:
* Medium because input reset/focus behavior is fragile

Suggested order:
* 7

### 8. `StudyModePanel`

What JSX it owns:
* Study Mode label
* select menu
* explanatory copy
* Flag button
* Hide button

Stays in `page.tsx`:
* study mode state
* `studySetLabel` unless passed as rendered options
* flag/hide handlers
* current-card guard
* database writes

Expected props:
* `studySet`
* `onStudySetChange`
* `modeOptions`
* `modeHelpText`
* `onFlagCurrentCard`
* `onHideCurrentCard`
* `hasCard`

Category:
* presentational UI

Risk level:
* Low to medium

Suggested order:
* 8

### 9. `StudyInstructionNav`

What JSX it owns:
* instruction text
* Previous button

Stays in `page.tsx`:
* instruction text derivation or pass as prop
* `prevCardReveal`
* disabled state calculation

Expected props:
* `instructionText`
* `canGoPrevious`
* `onPrevious`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 9

### 10. `StudyBottomNavigation`

What JSX it owns:
* Vocab List button
* Book Hub button

Stays in `page.tsx`:
* router calls or pre-bound callbacks
* `userBookId`

Expected props:
* `onGoToVocabList`
* `onGoToBookHub`

Category:
* presentational UI

Risk level:
* Low

Suggested order:
* 10

### 11. Early State Components

Potential components:
* `StudyLoadingState`
* `StudyNeedsSignInState`
* `StudyFullAccessLockedState`
* `StudyErrorState`
* `StudyEmptyState`
* `StudyCompleteState`

What JSX they own:
* early-return UI only

Stays in `page.tsx`:
* decisions about which state to render
* router callbacks
* reset-session logic for `Study Again`

Expected props:
* copy strings
* book title where needed
* callbacks
* counts where needed

Category:
* presentational UI

Risk level:
* Low for loading/error/sign-in
* Medium for complete/locked because callbacks are involved

Suggested order:
* 11

## Suggested First-Pass Order

1. Extract `StudyBookHeader`.
2. Extract `StudyProgressPanel`.
3. Extract `StudyCardFieldRow`.
4. Extract `StudyCardBadges`.
5. Extract `StudyBottomNavigation`.
6. Extract `StudyInstructionNav`.
7. Extract `StudyFilterPanel`.
8. Extract `StudyModePanel`.
9. Extract `MultipleChoiceAnswerPanel`.
10. Extract `TypingAnswerPanel`.
11. Extract early state components.

This order starts with the least interactive markup and postpones the answer panels until the simpler presentation pieces are stable.

## Visual Pass Status

Recommended current status: `Visual pass mostly done / architecture deferred`.

Current tracker row:

Visual pass mostly done / architecture deferred | `app/(protected)/books/[userBookId]/study/page.tsx` | 2414 | NEED_FINAL_COUNT | NEED_CHANGE |

Update `NEED_FINAL_COUNT` after running:

`wc -l app/'(protected)'/books/'[userBookId]'/study/page.tsx`

Then calculate:

`2414 - NEW_COUNT = CHANGE`

This means the safe visual/page-thinning layer has mostly been completed, and deeper study-flow cleanup is intentionally saved for later.

## Finished

Finished:

* Extracted `StudyBookHeader`
* Extracted `StudyProgressPanel`
* Extracted `StudyCardFieldRow`
* Extracted `StudyCardBadges`
* Extracted `StudyBottomNavigation`
* Extracted `StudyInstructionNav`
* Extracted `StudyFilterPanel`
* Extracted `StudyModePanel`
* Extracted `MultipleChoiceAnswerPanel`
* Extracted `TypingAnswerPanel`
* Extracted `StudyLoadingState`
* Extracted `StudyNeedsSignInState`
* Extracted `StudyErrorState`
* Extracted `StudyEmptyState`
* Extracted `StudyCompleteState`
* Extracted `StudyFullAccessLockedState`
* Extracted `StudyFlashcardShell`

Still intentionally deferred:

* access checks
* ownership checks
* teacher/student permission checks
* app/full-access checks
* Supabase queries
* card loading and selection logic
* duplicate/repeat-count logic
* library distractor pool logic
* multiple-choice option generation
* answer checking logic
* study result/log/event writes
* previous/next/retry behavior
* auto-forward timers
* keyboard event behavior
* flag/hide database writes
* definition update behavior
* helper functions
* services, DAOs, controllers, or hooks
* page-local types
* suspicious/possibly unused code cleanup

Notes:

* The visual pass reduced the page from 2414 lines to at least 2149 lines before the final `StudyFlashcardShell` extraction.
* After `StudyFlashcardShell`, rerun the line count and update the tracker row.
* This page is behavior-sensitive. Do not remove suspicious code yet without focused testing.
* The next pass should start with behavior verification, not architecture.
* Test typing modes, multiple-choice modes, Complete Review, Previous, Flag, Hide, full-access lock, empty state, and session complete before doing deeper cleanup.
* During the visual pass, a color filter and small study-flow UI fixes were added, so the final line reduction is smaller than the intermediate count. The page is still considered visually thinned, with architecture/study-flow logic intentionally deferred.

## Suspicious / Possibly Unused Code

Do not remove yet.

* `skipCardForToday` appears defined but not wired to any rendered button.
* `setDefinitionForCurrent`, `defSaving`, `defError`, and `showDefPicker` appear to support a definition picker/update flow, but no visible definition picker was found in the current render.
* `firstTouch` is set in `flip` and reset in session setup, but it does not appear to influence rendering or behavior.
* `typeRevealIndex` is set in multiple typing branches and included in the input `key`, but it may be acting mostly as an input reset trigger rather than a true reveal index.
* The fallback branch near the end of `checkTypedAnswer` checks `wordOk`, `meaningOk`, and homophones, but current `typeModeEnabled` modes appear to route through `READING`, `MEANING`, or `FROM_READING_MEANING` first.
* Library and current-book card dedupe use `normalizeRepeatKey(surface)` only. This may intentionally collapse repeated book entries, but it can also collapse same-surface different-reading words. This should be reviewed carefully before changing because it affects card selection and repeat counts.
* `studyOnceMode` is hardcoded `true`, but the code still has branches for non-study-once random behavior.
* The keyboard handler dependency list does not include every referenced value/function. It may still work because handlers are recreated each render, but this should be reviewed before moving any keyboard logic.
* `kataToHira` is used before `normalizeReading` in some answer checks, but `normalizeReading` already delegates to `normalizeKanaReading`. This may be redundant, but do not change without testing romaji/kana behavior.

## Not For First Pass

Do not extract or rewrite:
* `loadData`
* `canAccessUserBook`
* card normalization/deduping
* filter effects
* session-order effects
* MC option builders
* `checkTypedAnswer`
* `handleMcAnswer`
* `checkCorrectionAnswer`
* `logStudyEvent`
* `goToNextWord`
* `goToPrevWord`
* flag/hide/skip/definition writes
* keyboard handling

Those are second-pass or later candidates after the page's visual shell is safer and easier to read.

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status label:

`Visual pass done / good stopping point`

This status fits because the first visual pass extracted the reusable page-local shell and most repeated UI pieces: header, filters, progress, field rows, badges, flashcard frame, multiple-choice panel, typing panel, mode panel, instruction/nav, bottom navigation, complete/empty/error/loading/sign-in/full-access states. The page still has a large active render branch, but the remaining branching is mostly study-mode orchestration and answer-flow behavior rather than low-risk visual JSX.

The current tracker row can change from `Visual pass mostly done / architecture deferred` to `Visual pass done / good stopping point`.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/books/[userBookId]/study/page.tsx | 2414 | 2149 | -265 |`

The remaining work should be treated as architecture deferred. Do not keep extracting simply to reduce lines.

### 2. Readability Check

The page is easier to scan than before. The top-level branches now clearly show access/loading states, empty state, complete state, and the main flashcard layout.

The extracted components are helping readability. `StudyBookHeader`, `StudyFilterPanel`, `StudyProgressPanel`, `StudyFlashcardShell`, `StudyCardBadges`, `MultipleChoiceAnswerPanel`, `TypingAnswerPanel`, `StudyModePanel`, `StudyInstructionNav`, and `StudyBottomNavigation` give names to the major visual surfaces.

The remaining page sections are understandable, but the core flashcard content branch is still dense because it decides which fields to show for each study mode and wires answer panels to local answer state.

The visually overwhelming area that remains is the in-card mode branch for multiple-choice, typing, and tap-to-reveal. It is not a simple visual block: it connects directly to answer validation, correction flow, typed input reset keys, mode prompts, and current-card state.

### 3. Remaining Code Classification

Access / ownership checks:
* Supabase auth user check.
* `user_books` row loading.
* owner access.
* super-teacher access.
* linked-teacher access through `teacher_students`.
* no-access message state and access-denied render.

Full-access checks:
* profile/app access loading.
* feature access check for `study_flashcards`.
* full-access locked render and safe navigation options.
* write actions guard against missing `canAccessBook` / `canUseStudyFlashcards`.

Supabase loading:
* current user.
* profile access fields.
* current `user_books` row and joined book metadata.
* owner's broader `user_books`.
* owner library `user_book_words`.
* current book `user_book_words`.

Saved-word / book-word loading:
* active cards come from the current book's saved words.
* library cards come from the owner user's broader library for distractors and repeat counts.
* hidden, skipped, and excluded cards are filtered.
* meaning choices are normalized.
* chapter metadata is normalized.

Flashcard deck construction:
* cards are normalized from raw `user_book_words`.
* repeat counts and total counts are computed.
* cards are deduped by normalized surface.
* filtered cards drive `sessionOrder`.

Study mode behavior:
* `studySet` controls reveal fields, typing modes, multiple-choice modes, and complete review.
* local settings persist mode/filter choices.
* next study mode can be selected from the complete state.

Answer checking behavior:
* reading typing uses normalized kana/romaji behavior.
* meaning typing uses one-word meaning matching.
* multiple-choice modes compare reading, meaning, or word.
* wrong multiple-choice answers require a correction input.

Card progression behavior:
* study-once session order.
* next/previous reveal progression.
* auto-forward after correct typed or multiple-choice answers.
* session complete state.

Typed-input behavior:
* typed input state.
* typed feedback state.
* input reset key.
* typed input refs.
* correction input refs.
* Enter-key handling.

Previous / next / retry behavior:
* `goToNextWord`.
* `goToPrevWord`.
* `nextCardReveal`.
* `prevCardReveal`.
* `restartCurrentFilteredSet`.
* `Study Again` and next-study-mode behavior.

Study progress writes:
* legacy `study_logs`.
* unified `recordStudyEvent`.
* skip-for-today write.
* flag/exclude write.
* hide write.
* definition choice update write.

UI state:
* loading/access/error state.
* filter state.
* study mode state.
* card/session state.
* typed and multiple-choice answer state.
* definition update state.

Derived values:
* `settingsKey`.
* `steps`.
* `isMultipleChoiceMode`.
* `typeModeEnabled`.
* current card index/card.
* visible field booleans.
* current answer field.
* card color status.
* mode help text and instruction text.

Helper functions:
* normalization helpers.
* chapter helpers.
* repeat key helpers.
* shuffle/distractor helpers.
* multiple-choice option builders.
* answer checking helpers.
* study event helper.
* access helper.

Visual JSX still in `page.tsx`:
* `filterControls` composition.
* in-card mode branches and `Row` composition.
* mode option list and mode help text.
* instruction text derivation.

Component composition:
* most shell/UI components are extracted.
* remaining composition is mainly wiring extracted components to behavior state.

Legacy or suspicious code:
* `skipCardForToday` is defined but does not appear wired to a rendered button.
* definition picker/update state appears present without visible picker UI.
* `firstTouch` appears possibly unused.
* non-study-once branches remain even though `studyOnceMode` is hardcoded true.
* surface-only dedupe may collapse same-surface/different-reading entries.

Overall, the remaining 2149 lines are mostly behavior, state, data loading, and study-flow orchestration rather than easy visual JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `StudyCardContent`

What JSX it owns:
* the full in-card branch for multiple-choice, typing, and reveal field rows.

Why it is safe or not safe:
* Not low-risk. It would require many props: study mode, card, row visibility, MC state, correction state, typed state, refs, handlers, and helper callbacks. It would hide the central study-flow wiring behind a large prop basket.

Expected risk level:
* High.

Do now or defer:
* Defer. This should only happen after answer/mode behavior is separated into a view model or controller.

#### `StudyModeOptions`

What JSX it owns:
* the `modeOptions` array and separator entries passed to `StudyModePanel`.

Why it is safe or not safe:
* Safe as a constant, but small. Extracting it would not materially improve the page and might obscure mode ordering during active study-mode work.

Expected risk level:
* Low.

Do now or defer:
* Defer.

#### `StudyModeHelpText`

What JSX it owns:
* the nested mode help text ternary passed to `StudyModePanel`.

Why it is safe or not safe:
* This is display-oriented, but it is tightly coupled to the study-mode union and should probably become a helper with mode labels in a later cleanup.

Expected risk level:
* Low-medium.

Do now or defer:
* Defer to a helper/mode metadata pass.

#### `StudyInstructionText`

What JSX it owns:
* the nested instruction text passed to `StudyInstructionNav`.

Why it is safe or not safe:
* Similar to mode help text. It is extractable, but it is driven by MC answered/correct state, typing mode state, and reveal step.

Expected risk level:
* Medium.

Do now or defer:
* Defer until study state is represented more cleanly.

#### `StudyFilterControlsWrapper`

What JSX it owns:
* `filterControls` constant and props to `StudyFilterPanel`.

Why it is safe or not safe:
* The visual component already exists. The remaining wrapper is mainly controlled state wiring.

Expected risk level:
* Low.

Do now or defer:
* Defer. No meaningful readability gain.

### 5. Prop Basket / Over-Extraction Check

Some extracted components are necessarily prop-rich, especially `MultipleChoiceAnswerPanel`, `TypingAnswerPanel`, `StudyFilterPanel`, and `StudyModePanel`, but they are still manageable. Their props represent UI state and callbacks rather than hidden Supabase or access logic.

No extraction appears to have made the page harder to understand. The page now reads as orchestration around extracted study UI pieces.

Components that should stay local and page-specific:
* `StudyFilterPanel`.
* `MultipleChoiceAnswerPanel`.
* `TypingAnswerPanel`.
* `StudyModePanel`.
* `StudyCompleteState`.
* `StudyFullAccessLockedState`.

Components that might eventually become shared, but should stay local for now:
* `StudyFlashcardShell`.
* `StudyCardBadges`.
* `StudyProgressPanel`.
* `StudyInstructionNav`.
* `StudyBottomNavigation`.

Do not move shared components yet. Book Study, Library Practice, Ability Check, and Kanji Study now share some visual language, but their behavior and data boundaries are still different.

### 6. Behavior Boundary Check

The visual pass does not appear to have moved or blurred:
* access checks.
* owner/private book checks.
* linked-teacher checks.
* full-access checks.
* Supabase queries.
* saved-word loading.
* flashcard deck construction.
* study mode selection.
* answer validation.
* typed answer normalization.
* card progression.
* previous/retry behavior.
* study progress writes.
* private saved-word data boundaries.

The extracted components own display and input surfaces. The page still owns data loading, permission checks, deck construction, answer validation, event writes, and mutation handlers.

Suspicious, but not fixed here:
* Surface-only dedupe remains a possible identity issue for same-surface/different-reading words.
* `skipCardForToday` and definition picker state may be dormant.
* keyboard handler complexity should be reviewed before any behavior extraction.

### 7. Architecture Deferred List

Shared types:
* Defer because `WordRow` and `Flashcard` are tightly shaped around this page's Supabase selects and study behavior.

Helper functions:
* Defer because helpers encode answer correctness, distractor quality, card identity, and text normalization. Extracting them should come with tests or examples.

Access helpers:
* Defer because owner/teacher/super-teacher access is privacy-sensitive. Centralize only when the shared access contract is stable.

Services / DAOs / controllers:
* Defer because the load path combines book access, owner library loading, distractor loading, active card loading, and normalization.

Repeated Supabase loading:
* Defer because owner-library and current-book loading have different purposes and privacy implications.

Deck construction helpers:
* Defer because dedupe, repeat counts, skipped/hidden/excluded filters, chapter options, and library distractors need careful behavior checks.

Answer normalization helpers:
* Defer because reading/meaning matching affects learner correctness and should be protected by examples.

Flashcard mode helpers:
* Defer until mode metadata, labels, prompts, and answer fields can be described in one structure.

Card progression helpers:
* Defer because auto-forward, previous behavior, study-once sessions, and retry/correction flows are easy to break.

Study progress / event helpers:
* Defer because legacy and unified event writes both matter and currently share page-local context.

### 8. Browser Smoke Test Suggestions

Manual smoke checklist:
* Owner can open their own book study page.
* Unauthorized user is blocked from another user's private book study page.
* Full-access locked behavior still works if applicable.
* Linked teacher access still works if intended.
* Super-teacher access still works if intended.
* Cards load from this book's saved words.
* Empty state works for a book with no saved words or no matching filters.
* JLPT, color, chapter, and repeats filters work.
* Reading typing mode works.
* Meaning typing mode works.
* Reading-to-meaning typing mode works.
* Tap/reveal complete study mode works.
* Multiple-choice reading mode works.
* Multiple-choice meaning mode works.
* Reading-to-kanji multiple-choice mode works.
* Reading-to-meaning multiple-choice mode works.
* Correct answer behavior works.
* Incorrect answer behavior works.
* Correction/retype behavior works after wrong multiple-choice answers.
* Previous behavior works.
* Study Again works from complete state.
* Next Study Mode works from complete state.
* Flag current card works if intended.
* Hide current card works if intended.
* Study logs/events still save correctly.
* Keyboard Enter/arrow behavior works where applicable.
* Mobile-ish layout works for card shell, answer area, feedback, filters, and controls.

Do not run this smoke test during this doc-only audit unless specifically requested.

### 9. Final Recommendation

Recommendation:

Stop visual thinning here.

The first visual pass reached a good stopping point. The next useful work is behavior verification and second-pass architecture planning around card identity, deck construction, study-mode metadata, answer normalization, and study event writes. Do not do another visual extraction unless a specific UI change creates a clean, low-prop component boundary.
