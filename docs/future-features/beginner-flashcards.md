# Future Feature: Beginner Picture Book Flashcards + Kanji Preview

## Purpose

MEKURU may eventually support beginner reading groups using kana-only picture books. These learners may not be ready for regular kanji-first flashcards, but they can begin connecting familiar kana words from stories to the kanji forms they will meet later.

This feature creates a beginner-friendly flashcard mode where students first recognize a word in hiragana/kana, recall its English meaning, and then optionally see the kanji version and stroke order.

The goal is not to test kanji mastery. The goal is to gently bridge:

**kana story word → meaning → future kanji recognition**

## Example Student Flow

A beginner picture book contains the word:

**かわ**

The flashcard shows:

### Step 1: Prompt

**かわ**

Prompt text:

> What does this word mean?

The learner thinks of the English meaning.

### Step 2: Meaning Reveal

**river**

The learner confirms the meaning.

### Step 3: Kanji Preview Reveal

**川**

Support text:

> Later, you may see かわ written as 川.

Alternative labels:

* Story Words in Kanji
* Kanji you’ll meet later
* Story word in kanji

### Step 4: Optional Stroke Order

If supported, the learner can tap:

> Watch kanji draw

or

> Show stroke order

The app shows either:

* a static stroke-order diagram, or
* a simple animated drawing of the kanji

This should be optional and lightweight, not forced every time.

## Why This Matters

Beginner learners often know words orally or in kana before they are ready to read kanji. A kana-only picture book is a safe entry point, but MEKURU can help them slowly connect those story words to real Japanese literacy.

This feature supports the philosophy:

> Start from the story, not from a random kanji list.

The kanji reveal should feel like discovery, not a test.

## Scope

This feature should not replace existing MEKURU flashcards.

Standard MEKURU flashcards should continue using the current behavior:

* saved word
* automatic kanji extraction
* normal study modes
* normal kanji-related cards

Beginner picture-book flashcards should use a separate beginner mode:

* kana/hiragana prompt first
* English meaning reveal
* optional teacher-approved kanji preview
* optional stroke-order viewer

## Suggested Feature Name

Possible internal names:

* Beginner Flashcard Mode
* Kana-First Flashcards
* Story Word Kanji Preview
* Beginner Picture Book Cards

Possible user-facing labels:

* Story Word Cards
* Beginner Flashcards
* Story Words in Kanji
* Kanji You’ll Meet Later

## Book / Deck Behavior

Add a way to mark a book or deck as beginner/kana-first.

Possible book-level field:

```ts
flashcard_mode: "standard" | "beginner_kana_first"
```

or:

```ts
kanji_mode: "auto" | "teacher_selected_only"
```

Recommended behavior:

| Book / Deck Type        | Kanji Behavior                              |
| ----------------------- | ------------------------------------------- |
| Standard book           | Use current automatic kanji extraction      |
| Beginner picture book   | Use teacher-selected kanji previews only    |
| Kana-only beginner deck | Use kana → meaning → optional kanji preview |
| Kanji Study             | Keep current kanji study behavior           |

## Important Rule

For beginner picture books, the app should not automatically assume which kanji to show.

Example:

**かわ** could be:

* 川
* 河
* 皮
* 革

So beginner mode should only show kanji that the teacher has approved.

Do not display automatic kanji previews unless the specific card/support item has an approved kanji preview value.

## Teacher-Curated Kanji Preview

Each beginner support item/card may optionally have a kanji preview.

Example:

| Kana Word | English Meaning | Kanji Preview |
| --------- | --------------- | ------------- |
| かわ        | river           | 川             |
| やま        | mountain        | 山             |
| あめ        | rain            | 雨             |
| て         | hand            | 手             |
| め         | eye             | 目             |
| ふわふわ      | fluffy          | none          |
| こんにちは     | hello           | none          |

If no kanji preview exists, the card should simply stop after the meaning reveal.

## Recommended Data Shape

At minimum, each beginner flashcard item needs:

```ts
{
  promptKana: "かわ",
  meaning: "river",
  kanjiPreview: "川",
  kanjiPreviewReading: "かわ",
  showKanjiPreview: true
}
```

Possible database fields:

```sql
display_kana text
meaning text
kanji_preview text
kanji_preview_reading text
include_in_beginner_flashcards boolean default true
show_stroke_order boolean default true
```

## Better Long-Term Data Model

A cleaner long-term option is a separate table for teacher-selected kanji previews.

Possible table:

```sql
teacher_book_kanji_previews
```

Possible fields:

```sql
id uuid primary key
book_id uuid not null
teacher_book_item_id uuid null
source_surface text not null -- example: かわ
kanji text not null -- example: 川
reading text null -- example: かわ
meaning text null -- example: river
sort_order integer default 0
created_by uuid not null
created_at timestamptz default now()
updated_at timestamptz default now()
```

This is conceptually cleaner because these kanji previews are not necessarily words as printed in the book. They are enrichment items connected to kana-only story words.

## Fast Beta Version

For a faster beta, avoid a new table and add fields directly to an existing teacher support item table:

```sql
kanji_preview text
kanji_preview_reading text
include_in_beginner_flashcards boolean default true
show_stroke_order boolean default true
```

This is less flexible but probably enough for a first test.

## Flashcard Reveal Flow

Beginner cards should use a staged reveal.

### Initial Card

Show:

```txt
かわ
```

Prompt:

```txt
What does this word mean?
```

Button:

```txt
Show meaning
```

### After First Reveal

Show:

```txt
かわ
river
```

Button:

```txt
Show kanji
```

Only show this button if a kanji preview exists.

### After Second Reveal

Show:

```txt
かわ
river
川
```

Support text:

```txt
Later, you may see かわ written as 川.
```

Optional button:

```txt
Watch kanji draw
```

or:

```txt
Show stroke order
```

### Final Step

Button:

```txt
Next card
```

## Stroke Order Feature

The stroke-order feature should be optional and phased.

### Phase 1: Static Kanji Reveal

Show only the kanji preview.

Example:

**川**

This is the minimum useful version.

### Phase 2: Static Stroke-Order Diagram

Show the kanji with a still stroke-order diagram or numbered stroke image.

This is easier than animation and still helpful.

### Phase 3: Animated Stroke Order

Show the kanji being drawn stroke by stroke.

Possible controls:

* Play
* Replay
* Slow / normal speed
* Previous stroke
* Next stroke

For the first version, only support single-kanji previews.

## UX Notes

Avoid making the card too busy.

Recommended pattern:

1. Reveal meaning.
2. Reveal kanji.
3. Show small optional button: **Watch kanji draw**.

Do not autoplay a large animation every time. Beginners may enjoy it, but it could become overwhelming or slow down review.

The stroke-order viewer should feel like an optional discovery tool.

## Single-Kanji First

For the first version, only animate or show stroke order when the preview is a single kanji.

Examples:

| Preview | Stroke Order Support |
| ------- | -------------------- |
| 川       | yes                  |
| 山       | yes                  |
| 雨       | yes                  |
| 先生      | not in first version |
| 食べる     | not in first version |

If the preview contains multiple characters, the app can still show the kanji preview text, but hide the stroke-order button until multi-kanji support exists.

## Pedagogical Guardrails

For beginner picture books, do not overload the learner.

Recommended number of kanji previews per book:

* Very beginner: 3–5 kanji
* Strong beginner: 5–10 kanji
* Avoid more than 10 in the first version

The kanji should be high-value, visually clear, and connected to words from the story.

Good early examples:

* 川
* 山
* 雨
* 犬
* 猫
* 手
* 目
* 口
* 人
* 木
* 水
* 火

Avoid difficult kanji unless there is a strong story reason.

## Student-Facing Copy Ideas

Intro copy:

> These cards help you review words from the story. First, read the word in hiragana. Then check the meaning. Some cards will also show the kanji you may meet later.

Kanji reveal copy:

> This book writes the word in hiragana, but later you may see it written with this kanji.

Shorter version:

> You may see かわ written as 川 later.

Stroke-order button:

> Watch kanji draw

Alternative:

> Show stroke order

## Teacher-Facing Copy Ideas

For teacher setup:

> Add an optional kanji preview for beginner cards. This should be the kanji form you want students to notice later. MEKURU will not guess kanji automatically in beginner mode.

For the kanji preview field:

> Kanji preview, optional

Helper text:

> Use this only when you want beginners to see a kanji version of the kana word. Example: かわ → 川.

## Technical Behavior

Pseudo-logic:

```ts
if (deck.flashcardMode === "beginner_kana_first") {
  showKanaPrompt();
  revealMeaningFirst();

  if (card.kanjiPreview) {
    revealKanjiPreviewSecond();

    if (isSingleKanji(card.kanjiPreview) && strokeOrderAvailable(card.kanjiPreview)) {
      showStrokeOrderButton();
    }
  }
} else {
  useStandardFlashcardBehavior();
}
```

## Do Not Change

This feature should not change:

* current standard book flashcards
* automatic kanji extraction for normal books
* global Kanji Study
* existing vocabulary color/progress logic
* advanced study behavior
* Library Review behavior unless explicitly enabled for beginner decks later

## Possible Future Extensions

Later versions could include:

* audio pronunciation for the kana word
* picture/image prompt from teacher
* example sentence from the picture book
* “I know this word” self-check
* “I recognize this kanji” self-check
* multi-kanji stroke-order support
* writing practice canvas
* teacher-selected card order
* beginner deck export
* class/cohort-specific decks

## Open Questions

Before implementation, decide:

1. Should beginner mode live on the book, the deck, or both?
2. Should kanji previews attach to teacher support items or a separate kanji preview table?
3. Should students ever be able to save these beginner cards to their personal library?
4. Should beginner cards affect any study progress/color system, or stay separate?
5. Should stroke order be included in the first version, or saved for Phase 2?
6. Should the first version support only hiragana, or kana in general including katakana?

## Recommended Implementation Order

### Phase 1

Create beginner kana-first flashcard mode:

* kana prompt
* English meaning reveal
* optional teacher-approved kanji preview
* no stroke order yet

### Phase 2

Add optional static stroke-order display for single kanji.

### Phase 3

Add animated stroke-order viewer for single kanji.

### Phase 4

Consider multi-kanji previews and writing practice.

## Summary

Beginner Picture Book Flashcards should help learners move from kana-only story reading toward kanji awareness without turning the experience into a kanji test.

The ideal card flow is:

**hiragana/kana word → English meaning → kanji preview → optional stroke order**

This should be a separate beginner mode and should not replace MEKURU’s standard flashcard system.
