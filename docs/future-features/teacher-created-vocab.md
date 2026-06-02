# Future Feature: Teacher-Created Student Support Items

## Core idea

In the future, teachers may be able to create reading support items directly for student books or copy selected items from their own Teacher Library into a student-facing book support area.

This would extend the Teacher Library / Teacher Prep system, but it should not be part of the first Teacher Library MVP.

## Why this matters

Some reading support does not fit neatly into normal vocabulary saving.

Teachers may want to help students with:

* phrases
* grammar points
* hard sentences
* sentence translations
* culture/context notes
* teacher explanations
* learner-friendly notes
* tricky usage or nuance

These supports could be very useful during independent reading, lesson preparation, book clubs, or assigned reading.

## Important boundary

Teacher Library prep should stay private by default.

Student-facing support should be intentional.

A teacher should choose which items become visible or useful to a student. Teacher prep should not automatically appear in student accounts.

Possible future actions:

* Copy selected prep items to a student book
* Make this note visible to a learner
* Assign this grammar point to a student
* Create student reading support from teacher prep
* Share selected phrase/sentence explanations with a book club

## Data/design direction

The Teacher Library can be the source of richer teacher-created support items.

Later, a separate student-facing support layer could be added, rather than mixing teacher prep directly into normal student vocabulary.

Possible structure:

* `teacher_book_items` remains the teacher’s private prep source.
* A future student-facing table could store selected/copied support items for a student book.
* Student support items should be connected to the student/book intentionally.
* These items should not automatically count as the student’s saved vocabulary unless a separate “save to vocabulary” action exists.

## Not for the first version

Do not include this in the first Teacher Library MVP.

The first version should focus on:

* Teacher Library
* Teacher Book Prep Items
* Bulk Add-style teacher prep entry
* Fluid Reading-style teacher follow-along support
* Keeping teacher prep separate from personal reading stats

Student-facing teacher support can be added later after the teacher prep system feels stable.

## Possible access point: teacher-only add button in student Vocabulary Tab

A possible future access point for teacher-assisted student vocabulary/support entry is a teacher-only button inside a student book’s Vocabulary Tab.

This button should be hidden from normal learners and only visible to teachers/super_teachers who have permission to access that student/book.

Purpose:
This is not the same as Teacher Library private prep. This flow should save into the student’s own book vocabulary/support structures, such as `user_book_words`, because the teacher is adding support directly for that student’s book.

This is a mixed workflow:
- like normal learner Add Vocab, because the item belongs to the student’s book
- like teacher add, because the teacher is entering it on the student’s behalf
- potentially richer later, because teachers may want to add phrases, grammar notes, hard sentence explanations, translations, or other reading supports

Important boundary:
Teacher Library prep remains teacher-owned and private by default.

Teacher-assisted student add saves to the student/book area intentionally and should only be available when the teacher has permission for that student/book.