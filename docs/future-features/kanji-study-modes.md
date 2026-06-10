# Kanji Study Mode Roadmap

Planning note for:

`app/(protected)/library-study/kanji/page.tsx`

## Current Status

Do not implement this yet.

The current priority is finishing the visual component extraction for the Kanji Study page. After that, the first behavioral pass should focus on core reading modes only.

Related docs:
* `docs/refactor-maps/library-kanji.md`
* `docs/refactor-maps/kanji-study-card-identity-bug.md`

## Main Direction

Kanji Study should eventually act more like a mode-based study tool, similar in spirit to Asahi Kanji's app, but adapted for Mekuru's word-context approach.

The important Mekuru difference:

* Kanji readings should be shown and reviewed in word context when possible.
* The full source word should be visible in explanations/results.
* The target kanji should be emphasized.
* Surrounding kanji and okurigana should be visually faded.

Example:

* `学校`
* Target: `学`
* Display idea: `学` strong, `校` faded

This avoids accidentally teaching that `学` always equals `がっ` outside of the word context.

## First Behavioral Pass

Start with core reading modes only.

### Core Reading Modes

* Kunyomi -> Kanji
* Kanji -> Kunyomi
* Onyomi -> Kanji
* Kanji -> Onyomi

### First Answer Style

Use multiple choice first.

Reasons:
* the current page already has multiple-choice behavior
* the visual extraction should make the card/options easier to adjust
* typing can be added later once mode selection is stable

### Keep Out Of First Pass

Do not add these in the first behavior pass:
* kanji meaning modes
* word meaning modes
* kanji stroke count
* main radical selection
* radical stroke count
* review/reveal mode
* new kanji metadata tables
* teacher metadata queues

## Answer Styles Roadmap

Possible answer styles:

* Multiple choice
* Typing
* Review/reveal later

Typing should come after the mode framework is stable.

## Contextual Display Rule

When a card comes from a vocabulary/cache context, the learner should be able to see the whole word context.

Recommended display:

* show the full `sourceWord`
* emphasize the target kanji
* fade non-target kanji and okurigana
* show the reading/meaning explanation after the answer

This is especially important for:
* rendaku / sound changes
* small-tsu readings
* kunyomi with okurigana
* homographs like `市`

## Meaning Modes

Set meaning modes aside for now.

Reason:

Mekuru currently has strong word/vocabulary meaning data, but does not yet have a clean canonical isolated-kanji meaning database.

Do not derive isolated kanji meaning from vocabulary meaning. That could teach the meaning of a word as if it were the meaning of a single kanji.

Possible future path:

* add curated kanji metadata later
* only then consider Kanji -> Meaning or Meaning -> Kanji modes

## Shape / Lookup Modes For Later

These are useful, but should come after the first reading-mode pass.

Possible future modes:

* Kanji -> Kanji Stroke #
* Kanji -> Main Radical
* Radical -> Stroke #

Notes:

* `Kanji -> Kanji Stroke #` supports visual attention and kanji structure awareness.
* `Kanji -> Main Radical` needs reliable main-radical data.
* `Radical -> Stroke #` supports dictionary lookup skill.
* Radical English names are lower priority than radical shape and stroke count.

## Kanji Metadata Queue Idea

A future teacher/super-teacher maintenance queue could make curated kanji metadata practical.

Possible route:

* `/teacher/kanji-metadata`

Possible workflow:

* show kanji missing metadata
* teacher enters main radical
* teacher enters kanji stroke count
* teacher confirms or enters radical stroke count
* save once
* mark that kanji metadata complete

This would allow future shape/lookup modes without guessing from vocabulary data.

## Suggested Sequence After Visual Extraction

1. Fix card identity if still needed, especially same-surface/different-reading cards.
2. Add a mode selector for the four core reading modes.
3. Keep multiple choice as the only answer style.
4. Add full-word contextual display with target-kanji emphasis.
5. Verify `市【いち】` and `市【し】` do not mix readings/meanings.
6. Add typing answer style later.
7. Add curated kanji metadata queue later.
8. Add shape/lookup modes later.

## Do Not Forget

The reading-mode work should not accidentally mark the existing card identity issue as solved.

Preferred identity order remains:

1. `vocabulary_cache_id` when available
2. `surface + reading`
3. surface/kanji only as a fallback when no reading exists

Character Study
  ├─ Kanji
  ├─ Radicals / Components
  └─ Kana
       ├─ Hiragana recognition
       ├─ Katakana recognition
       ├─ Hiragana ↔ Katakana matching
       └─ Similar kana practice