# Kana Study Page Refactor Map

No-code refactor map for:

`app/(protected)/library-study/kana/page.tsx`

Current observed size: 668 lines.

This is a planning document only. Do not refactor the page from this map without a separate implementation pass.

## 1. Page Purpose

This page is a static-data Kana Study practice page inside Library Study.

From the learner point of view, it shows one shuffled pass through the selected kana character set for the selected study mode. The learner answers multiple-choice kana/romaji cards, sees feedback with a memory cue, can pause auto-advance, and gets a completion screen when the set is done.

## 2. Current Responsibilities

Current responsibilities include:

* importing static kana data from `lib/japanese/kana.ts`
* grouping answer choices by basic, dakuten, or yoon family
* defining study modes and mixed-mode behavior
* building answer choices
* building one-pass shuffled decks for the selected mode and character set
* handling Basic/Dakuten/Yoon character set filters
* tracking card index, selected answer, score, and auto-advance pause state
* advancing after 3 seconds when answered and not paused
* rendering Kanji-style page shell/header/mode selector styling
* rendering character-set controls
* rendering current-card metadata
* rendering oversized kana prompt and choice buttons
* rendering correct/wrong feedback
* rendering romaji memory-cue text
* rendering completion actions: do set again, next mode, back to Library Study
* navigating back to `/library-study`

The page should stay static-data only. It does not use Supabase.

## 3. Risk Boundaries

Do not touch these during a first safe thinning pass:

* imports and data shape from `lib/japanese/kana.ts`
* study modes and labels unless this is a product copy task
* same-family answer pool logic
* `romaji-to-hiragana` answer pool behavior
* deck creation behavior
* one-card-per-character completion behavior
* mixed-mode behavior
* score logic
* 3-second auto-advance and pause behavior
* route structure
* navigation target for Back to Library Study
* static-data-only boundary
* any attempt to introduce Supabase or persistence

These should remain page-owned during the first pass unless there is an obviously safe display-only extraction.

## 4. Suggested Extraction Candidates

### Low-Risk Visual Components

Good first-pass candidates:

* `KanaStudyHeader`
  * header card with kana icon and title
* `KanaStudyCharacterSetSelector`
  * Basic/Dakuten/Yoon selector UI
  * low-medium if it only receives values and callbacks
* `KanaStudyCurrentCardSummary`
  * mode label, prompt label, card count, and score
* `KanaStudyCompletionPanel`
  * set complete message and three action buttons
* `KanaStudyPrompt`
  * oversized prompt label and character/romaji prompt
* `KanaStudyFeedbackPanel`
  * correct/wrong text, answer, memory cue, answer label, pause/resume button, auto-advance note

These are visual components, but pass behavior in as props. They should not create decks or mutate score.

### Medium-Risk Helper/Component Candidates

Useful after the first visual pass:

* `KanaStudyChoiceGrid`
  * renders choices and correct/wrong selected states
  * medium risk because it touches answer feedback state
* `KanaStudyCardFrame`
  * wraps prompt, choices, and feedback in the Kanji-style card
* `pronunciationHintForRomaji` and `PRONUNCIATION_MEMORY_CUES`
  * possible extraction to a local helper file later
  * keep page-local for now while cue copy is still being tuned
* `buildKanaPool`
  * pure helper, but tied to the current filter UI
* `createStudyCard` / `createStudyDeck`
  * pure-ish helpers, but they encode answer behavior and should stay page-local until covered by tests

### High-Risk / Leave For Later

Leave these in `page.tsx` for now:

* answer logic
* same-family choice pool logic
* deck creation and completion behavior
* mixed-mode resolution
* score updates
* auto-advance effect
* mode and character-set reset behavior
* navigation side effects
* kana data file changes
* Supabase or persistence

## 5. Recommended Refactor Order

Safe first pass:

1. Extract `KanaStudyHeader`.
2. Extract `KanaStudyCurrentCardSummary`.
3. Extract `KanaStudyCompletionPanel`.
4. Extract `KanaStudyPrompt`.
5. Extract `KanaStudyFeedbackPanel`.

Safe stopping point:

Stop after display-only components. The page should still own deck state, score state, selected answer state, auto-advance state, mode changes, character-set changes, and all answer logic.

Optional second visual pass:

6. Extract `KanaStudyCharacterSetSelector`.
7. Extract `KanaStudyChoiceGrid`, passing already-derived answer states and `onChoose` in from the page.
8. Extract `KanaStudyCardFrame`.

Pause before:

* moving `createStudyCard`
* moving `createStudyDeck`
* changing cue data structure
* changing answer/score behavior

## 6. Proposed File Structure

Suggested future component folder:

```txt
app/(protected)/library-study/kana/components/
  KanaStudyHeader.tsx
  KanaStudyCurrentCardSummary.tsx
  KanaStudyCompletionPanel.tsx
  KanaStudyPrompt.tsx
  KanaStudyFeedbackPanel.tsx
  KanaStudyCharacterSetSelector.tsx
  KanaStudyChoiceGrid.tsx
  KanaStudyCardFrame.tsx
```

Possible later helper file, only after behavior is stable:

```txt
app/(protected)/library-study/kana/kanaStudyHelpers.ts
```

Do not create these files during this planning task.

## 7. Notes For Future Codex/Refactor Pass

First pass should be visual thinning only.

Keep all static data imports, answer logic, deck creation, same-family choice pools, scoring, auto-advance, pause/resume, and completion behavior in the page. Keep the page static-data only. Do not add Supabase, persistence, or route changes.

Do not "clean up" kana behavior while extracting components. The memory cues are still product-copy-sensitive, so keep cue logic easy to inspect.

After each extraction, the page should compile and behave exactly the same. Manual checks should include all study modes, Basic only, Dakuten on/off, Yoon on/off, one-pass completion, Do set again, Next mode, Back to Library Study, correct/wrong feedback, memory cue display, pause/resume, and 3-second auto-advance.
