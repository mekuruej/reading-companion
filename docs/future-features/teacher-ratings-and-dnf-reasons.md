# Future Feature: Teacher Ratings, Lesson-Fit Alerts, and DNF Reasons

## Core idea

Mekuru already has a teacher review page, but teacher ratings could become more useful if they also feed teacher planning and action-needed workflows.

This future pass should improve two related areas:

* teacher ratings for finding good books for lessons
* DNF / paused-book reasons so stopped books do not all mean the same thing

## Teacher ratings for lesson planning

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

## Possible teacher rating fields

The existing teacher review page could eventually include structured fields such as:

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

It would be useful to add an action item similar to reading reflection review alerts.

Possible alert:

`Teacher ratings needed`

Possible helper copy:

`Rate books you have taught or prepared so they are easier to find for future lessons.`

Possible action:

`Review teacher ratings`

Likely home:

* Teacher Workspace
* Teacher Needs Attention
* Teacher book/review upkeep area

This should be teacher-only. It should not appear as a normal learner task.

## Where ratings should help later

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

DNF should not mean only one thing.

For language reading, a learner may stop a book because:

* the book is too difficult right now
* the timing or mood is wrong
* the vocabulary load is too high
* the book is dense or slow
* the learner lost interest
* the learner disliked the book and does not want to return

These cases should not all be treated the same in stats or recommendations.

## Possible future DNF fields

Possible fields:

* `dnf_reason`
* `dnf_note`
* `would_retry`

Possible reason options:

* too difficult right now
* wrong timing / mood
* too much unknown vocabulary
* too dense / slow
* lost interest
* did not like it
* other

Possible retry options:

* yes
* maybe
* no

## Paused vs. DNF

Mekuru may eventually need a softer status than DNF.

Possible status:

`paused`

Meaning:

The reader may want to come back later, restart, or resume when the book is a better fit.

This is different from:

`dnf`

Meaning:

The reader is done with the book and probably does not want to continue.

For a first pass, it may be simpler to keep the existing DNF status and add reason/retry fields. A separate paused status can come later if the library needs a clearer shelf.

## Data and recommendation implications

Do not throw away data from DNF books.

Pages read, words saved, difficulty signals, and reading time are still real reading data.

However:

* a disliked DNF book should not strongly count as a positive recommendation signal
* a too-difficult-right-now book may still be a good future recommendation
* a paused book may belong in a "come back later" list
* teacher ratings should be separate from learner enjoyment ratings

## Not for the first pass

Do not build this while stabilizing existing review flows.

A future implementation should first map the existing teacher review page and current book status fields, then decide whether to add small fields or a separate review/reason table.

Keep access boundaries clear:

* learner reflections belong to the learner
* teacher ratings belong to the teacher or teacher workflow
* teacher private notes should not become public or learner-facing by accident
