# Future Feature: English Readers

## Purpose

Mekuru may eventually include a private English Readers area for teacher-managed English reading lessons, starting with books used in lessons such as Kids A-Z readers.

This should begin as a hidden/teacher-only feature, likely at:

/english-readers

The goal is not to build a full public English-learning platform right away. The first goal is to replace outside vocabulary tools like Quizlet with a small reusable Mekuru-based workflow for preparing and supporting English reader lessons.

## Core Idea

English Readers should focus on supported rereading rather than flashcard-first study.

Students often benefit more from rereading the actual book with helpful vocabulary nearby than from reviewing isolated flashcards. The app does not need to reproduce the book text. Instead, it can provide vocabulary and definition support organized by book, page, or reading section.

For example:

- Read pages 3–5 in your book.
- Use the vocabulary list if you need help.
- Mark the rereading as finished.

This keeps Mekuru as a reading companion rather than a replacement for the original book/source.

## Definition Fields

English reader vocabulary should not use only one generic “meaning” field.

Definitions may need to change depending on the learner’s age, reading context, and lesson mode. A child-friendly Japanese definition may be very different from an adult/general Japanese definition.

Possible fields:

- English word or phrase
- Japanese definition
- English definition
- Book-specific meaning
- Page or section
- Teacher note
- Optional adult/general Japanese definition later

For the first version, the student-facing labels can stay simple:

- Japanese definition
- English definition

The deeper distinction can remain in the data design and teacher workflow.

## Base Form vs Encountered Form

Future vocabulary should separate the stable study entry from the exact form seen in the book.

Current app behavior:

- `user_book_words.surface` is still used throughout the app.
- Add Word often stores the selected dictionary/basic form in `surface`.
- Do not rename or repurpose `surface` until the app has been migrated carefully.

Database prep already added optional fields on `user_book_words`:

- `encountered_surface`: exact form the reader saw or typed from the book.
- `base_form`: dictionary/lemma/canonical form used as the main study entry.
- `lookup_surface`: text used for dictionary/API lookup.
- language/support fields such as `target_language_code`, `support_language_code`, `item_type`, `part_of_speech`, `pronunciation`, `difficulty_system`, `difficulty_level`, and `support_note`.

Recommended future rule:

- The actual vocabulary entry should display and study the base form.
- The encountered form should be shown as context when useful.
- Existing `surface` should stay compatible and continue behaving like the current base/study form until a careful migration is complete.

Examples:

- Base form: `読む`
- Encountered form: `読まなかった`
- Form note later: `negative past`

Or:

- Base form: `look after`
- Encountered form: `looked after`
- Form note later: `past tense`

This matters for English readers because learners may encounter forms such as `looked after`, `gave up`, or `was running`, while the reusable vocabulary entry should remain `look after`, `give up`, or `run`.

## Future Add Word Migration Path

Do not fix the whole Add Word save flow in one large pass. That area is delicate.

Safe order:

1. Keep `surface` unchanged as the current compatibility field.
2. Update Add Word to preserve the original typed/book form in `encountered_surface`.
3. Save the selected dictionary/basic form into `base_form`.
4. Save the actual dictionary/API query into `lookup_surface`.
5. Continue writing `surface` as the base/study form until all dependent pages are migrated.
6. Gradually update display surfaces to show `base_form ?? surface` as the main word and `encountered_surface` as a small context line only when it differs.
7. Later update identity logic toward `vocabulary_cache_id`, then `base_form + reading`, then `surface + reading` fallback.

Future UI idea:

- Let the teacher or learner label the encountered form, such as `past tense`, `negative past`, `potential`, `passive`, `te-form`, or `phrasal verb past`.
- This can live in a later dedicated field or structured form table. For now, `support_note` can hold lightweight context if needed.

## Lesson Mode vs Home Mode

The same vocabulary may need to display differently depending on context.

### Lesson Mode

During lessons, English should be emphasized as much as possible.

Lesson mode should probably show:

- English word
- English definition first
- Japanese definition hidden, secondary, or teacher-controlled

This supports English interaction during the lesson.

### Home Mode

At home, students may need more direct support because the teacher is not there.

Home mode can show:

- English word
- Japanese definition
- English definition

This may help students reread books independently and may also help parents understand what the child is practicing.

## Early Version Scope

The first version should stay small.

Possible first version:

- Hidden `/english-readers` area
- Teacher-only access
- Add English reader book
- Add vocabulary by book/page/section
- Store Japanese definition and English definition
- Simple supported rereading view
- No public navigation
- No full student dashboard yet
- No need to copy or reproduce book text

Optional later features:

- Student practice links
- Simple completion button: “I read it”
- Student-specific assignments
- Review history
- Parent-friendly home view
- Flashcard mode, only if it becomes useful

## Important Boundary

Do not copy full Kids A-Z book text, images, or pages into Mekuru unless permission allows it.

Mekuru should store teacher-created support material:

- vocabulary
- definitions
- notes
- page/section references
- rereading guidance

The original book remains the reading source.

## Long-Term Direction

This feature could eventually become the foundation for broader English reading support, including Japanese children reading English books, Japanese adults reading English books, and future multilingual reading support.

For now, it should be treated as a small private teacher tool that quietly prepares Mekuru for that future.
