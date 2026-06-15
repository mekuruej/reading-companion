# Future Feature: Teacher Grammar Support Bank

## Core idea

Mekuru may eventually include a teacher-created grammar support bank for Japanese reading lessons.

This would let a teacher build reusable grammar explanations, then attach selected grammar points to Teacher Prep / Follow Along items.

The goal is not automatic grammar lookup at first. The first version should be teacher-created and teacher-reviewed.

## Why this matters

Grammar support often needs more than a simple translation.

Students need help understanding:

* structure
* JLPT level
* nuance
* formality
* similar patterns
* when one pattern is more natural than another
* how the pattern functions in the exact sentence or passage

For example, patterns like `に則って`, `に従って`, and `を基準に` may all look close in English, but they carry different levels of formality, directness, and context.

This kind of support belongs naturally in Follow Along because it helps students understand the sentence while reading.

## Possible grammar point fields

A future grammar support table could include fields such as:

* `id`
* `pattern`
* `display_name`
* `jlpt_level`
* `structure`
* `meaning_en`
* `meaning_ja`
* `formality_register`
* `nuance_note`
* `similar_patterns`
* `example_sentence`
* `example_translation`
* `source_url`
* `created_by`
* `review_status`
* `created_at`
* `updated_at`

Possible examples:

```txt
pattern: に則って
jlpt_level: N1
structure: N + に則って
meaning_en: in accordance with / in keeping with
formality_register: formal, written, official-sounding
similar_patterns: に従って, を基準に
```

```txt
pattern: に従って
jlpt_level: N2/N1
structure: N + に従って
meaning_en: following / according to / in obedience to
formality_register: neutral-to-formal
nuance_note: More direct and practical than に則って.
```

## Relationship to Teacher Prep

Teacher Prep already supports item types such as word, phrase, grammar, sentence, translation, and note.

A future grammar bank should not replace teacher prep notes immediately.

Instead, teacher prep items could eventually link to reusable grammar points:

```txt
teacher_book_items.grammar_point_id
```

The prep item should still be able to keep a passage-specific note.

Example:

* reusable grammar point: `に則って`
* book-specific prep item: `に則って` appears in this scene because the narration sounds formal / rule-based

## Follow Along Use Case

In Teacher Follow Along, grammar support could appear as a student-visible card or expandable section.

Possible display:

* pattern
* structure
* JLPT level
* short meaning
* nuance note
* similar patterns
* teacher note for this passage
* source/reference link

This would help students see not only what a pattern means, but why it sounds the way it does.

## Student Visibility Boundary

Teacher-created grammar support should be private by default.

A teacher should intentionally choose when grammar support becomes visible in Follow Along or student support.

Possible visibility modes:

* teacher-only
* visible in teacher Follow Along
* copied/attached to a student-facing support item later

Do not automatically publish all teacher grammar notes to students.

## Data Design Notes

Start with a reusable teacher-created grammar bank before trying to automate lookup.

Avoid making `teacher_book_items` carry every grammar-bank field directly. It should be able to link to a grammar point and keep local passage-specific notes.

Possible future tables:

```txt
grammar_points
teacher_book_item_grammar_points
student_book_grammar_support
```

The join table may be useful if one prep item needs several grammar points, or if one grammar point appears in many prep items.

## Not First Version

Do not build this immediately.

Before implementation, decide:

* whether grammar points are global, teacher-owned, or both
* whether super teachers can create shared grammar points
* whether normal teachers can create private grammar points
* whether students can see grammar support outside Follow Along
* how grammar support relates to vocabulary and sentence support

## Safe First Implementation Later

A safe first implementation could be:

1. Create a teacher-only grammar point table.
2. Add a small teacher grammar bank page.
3. Add a typeable dropdown in Teacher Prep grammar rows.
4. Let a prep item link to one grammar point.
5. Show the linked grammar point in Teacher Follow Along.
6. Keep student-facing copying/sharing deferred.

This should remain separate from Add Word, Jisho lookup, vocabulary cache, and kanji behavior.
