# Feature Status: Teacher Ratings, Lesson-Fit Alerts, and DNF Reasons

Status: first pass implemented / future refinement remains.

Implemented areas:

* Teacher Ratings page in the teacher workspace.
* Teacher Needs Attention entry for teacher ratings.
* Individual teacher review navigation back to Teacher Ratings.
* DNF reason, DNF note, and retry-intent fields on user books.
* Book Hub display/edit support for DNF details.
* Teacher Ratings cards can show DNF context.

Remaining future work:

* richer teacher-rating filters for lesson planning
* better teacher-rating search/discovery surfaces
* recommendation logic that understands DNF reasons
* possible separate paused/come-back-later shelf or status
* unified teacher action-needed inbox polish

## Core idea

Mekuru has a teacher review page and a Teacher Ratings index. Teacher ratings should continue becoming more useful for planning lessons and finding good books for future learners.

This feature area covers two related ideas:

* teacher ratings for finding good books for lessons
* DNF / paused-book reasons so stopped books do not all mean the same thing

## Teacher ratings for lesson planning

Status: first pass implemented.

Current implementation:

* Teacher Ratings page exists at `/teacher/ratings`.
* Teacher Hub links to Teacher Ratings.
* Teacher Needs Attention includes a Teacher Ratings card.
* Individual teacher review pages return to Teacher Ratings.
* Teacher rating cards include basic book context and DNF context when available.

Future refinement:

* add stronger lesson-planning filters
* make it easier to compare reviewed books side by side
* connect teacher ratings to teacher-only book search/discovery

Teacher ratings are different from normal reader reflection reviews.

Reader reflections answer:

* Did this reader enjoy the book?
* Was it hard for them?
* Would they recommend it to another learner?

Teacher ratings should answer:

* Is this book useful for lessons?
* Is it good for discussion?
* Is the vocabulary load manageable?
* Is the grammar/sentence style teachable?
* Would I teach this book again?
* Is this a good fit for Japanese-speaking adult English learners, Japanese learners, or another learner group?

## Teacher Rating Fields

The teacher review flow can continue to improve with structured fields such as:

* lesson fit
* discussion value
* vocabulary support needed
* grammar / sentence density
* adult learner fit
* would teach again
* private teacher note

Keep this teacher-facing by default.

Teacher ratings should not automatically become learner-facing reviews.

## Action-needed alert

Status: first pass implemented.

Teacher ratings now have a Teacher Needs Attention entry.

Alert concept:

`Teacher ratings needed`

Possible helper copy:

`Rate books you have taught or prepared so they are easier to find for future lessons.`

Action:

`Review teacher ratings`

Likely home:

* Teacher Workspace
* Teacher Needs Attention
* Teacher book/review upkeep area

This should be teacher-only. It should not appear as a normal learner task.

## Where ratings should help later

Status: future work.

Teacher ratings should eventually help with book lookup and lesson planning in:

* Teacher Book Search
* Add Book / global book lookup flows
* Teacher Library
* Teacher Book Review
* Find Books / Discovery, if teacher-only filters are added

Useful future filters:

* highly rated for lessons
* good for discussion
* would teach again
* needs teacher review
* good for beginner adults
* heavy vocabulary support
* strong reading-group candidate

## DNF reasons and paused books

Status: DNF reason first pass implemented.

Current implementation:

* `user_books` has `dnf_reason`, `dnf_note`, and `would_retry`.
* Book Hub can save and display DNF details.
* The Reading tab includes DNF reason controls.
* Book status summary can show DNF details.
* Teacher Ratings can surface DNF context for planning.

Still future:

* a separate paused status or shelf
* recommendation logic that interprets DNF reasons
* library shelf refinements based on DNF reason / retry intent

DNF should not mean only one thing.

For language reading, a learner may stop a book because:

* the book is too difficult right now
* the timing or mood is wrong
* the vocabulary load is too high
* the book is dense or slow
* the learner lost interest
* the learner disliked the book and does not want to return

These cases should not all be treated the same in stats or recommendations.

## DNF Fields

Implemented first-pass fields:

* `dnf_reason`
* `dnf_note`
* `would_retry`

Reason options:

* too difficult right now
* wrong timing / mood
* too much unknown vocabulary
* too dense / slow
* lost interest
* did not like it
* other

Retry options:

* yes
* maybe
* no

## Paused vs. DNF

Status: future work.

Mekuru may eventually need a softer status than DNF.

Possible status:

`paused`

Meaning:

The reader may want to come back later, restart, or resume when the book is a better fit.

This is different from:

`dnf`

Meaning:

The reader is done with the book and probably does not want to continue.

The first pass kept the existing DNF status and added reason/retry fields. A separate paused status can come later if the library needs a clearer shelf.

## Data and recommendation implications

Status: future work.

Do not throw away data from DNF books.

Pages read, words saved, difficulty signals, and reading time are still real reading data.

However:

* a disliked DNF book should not strongly count as a positive recommendation signal
* a too-difficult-right-now book may still be a good future recommendation
* a paused book may belong in a "come back later" list
* teacher ratings should be separate from learner enjoyment ratings

## Deferred Work

Do not treat the first pass as the final recommendation model.

Future work should map how teacher ratings, learner reflections, finished books, DNF books, and possible paused books feed discovery and recommendation signals.

Keep access boundaries clear:

* learner reflections belong to the learner
* teacher ratings belong to the teacher or teacher workflow
* teacher private notes should not become public or learner-facing by accident
