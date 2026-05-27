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