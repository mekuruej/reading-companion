# Future Feature: Teacher Needs Attention Unified Inbox

## Core idea

Mekuru may eventually need one teacher-facing place for all errors, review queues, and pending cleanup work.

The current Teacher Hub already has the beginning of this idea through the `Needs Attention` alert and page, but the long-term version should be more than a collection of links.

It should become a unified teacher/admin inbox for things that need review.

## Why this matters

Teacher maintenance work is starting to spread across several areas:

* book requests
* global book add/review
* global book cleanup
* missing book metadata
* book flags
* vocabulary flags
* kanji queue items
* kanji reports
* teacher rating reminders
* reading reflection reviews
* possible import/lookup errors later

Some of these currently feel like `Needs Attention`.

Some feel like `General Upkeep`.

Some are learner-facing follow-up.

Some are app/global-data maintenance.

Eventually, the teacher should not have to remember where each category lives.

## Future Direction

Use `Needs Attention` as the teacher's main review inbox.

Possible sections:

* Learner follow-up
* Book review
* Global book cleanup
* Vocabulary review
* Kanji review
* Teacher ratings needed
* System/import/lookup issues
* Future assignment/task follow-up

Each section can still link to its specialized page, but the teacher should be able to see what is pending from one place.

## Relationship To General Upkeep

`General Upkeep` may not need to stay as a top-level teacher concept.

Some tools currently grouped as upkeep may belong under `Needs Attention`, especially when there is pending work:

* Global Book Add
* Global Book Cleanup
* Word Data / Word Sky review
* Kanji Queue
* Vocabulary Flags

There may still be admin tools that are not urgent. Those could live in a quieter tools area later.

## Alert Behavior

The Teacher Hub can keep a small alert that says something like:

```txt
Needs Attention
Something in the review workspace is pending.
```

Useful behavior:

* link directly to `/teacher/needs-attention`
* show an aggregate count
* allow dismissing for today
* come back automatically tomorrow if work is still pending
* avoid showing a separate alert for every category on the Hub

The Needs Attention page itself should still show the category breakdown.

## Possible Data Shape Later

The first version can keep deriving counts from existing tables.

Later, Mekuru may need a normalized review item model.

Possible future table:

```txt
teacher_attention_items
```

Possible fields:

* `id`
* `attention_type`
* `scope`
* `source_table`
* `source_id`
* `owner_user_id`
* `teacher_id`
* `student_id`
* `book_id`
* `user_book_id`
* `severity`
* `status`
* `message`
* `resolved_at`
* `dismissed_until`
* `created_at`
* `updated_at`

This should only be considered after current queues stabilize.

## Important Boundaries

Do not merge private learner data into global/admin queues casually.

Keep these boundaries clear:

* learner-owned data
* teacher-owned data
* linked-student data
* super-teacher/global data
* public/shared data

The inbox should summarize work without exposing data to the wrong role.

## Not For The First Pass

Do not build the unified inbox yet.

Near-term work should stay small:

* keep the Teacher Hub alert simple
* keep existing specialized pages working
* improve labels and navigation as needed
* avoid moving Supabase queries or permission-sensitive logic too early

The future pass should start with an audit of all current review/error sources before creating new tables.
