# Teacher Reading Fit Page Refactor Map

No-code refactor map for:

`app/(protected)/teacher/reading-fit/page.tsx`

Current observed size: 535 lines.

This is a planning document only. Do not refactor the page from this map without a separate implementation pass.

## 1. Page Purpose

This page is a teacher-facing review queue for finished books that are missing learner reflection signals.

From the teacher point of view, it shows which linked students have finished books that still need reader level, ease/difficulty rating, or entertainment rating. It gives the teacher links to the Book Hub and Teacher Review page, and lets them mark an item as reviewed.

## 2. Current Responsibilities

Current responsibilities include:

* checking teacher/super-teacher access
* loading linked students through `teacher_students`
* loading linked student profiles
* loading finished `user_books` rows joined to shared/global `books`
* filtering to books missing reader level, difficulty rating, or entertainment rating
* deriving queue summary counts
* formatting book type, date, and ratings
* rendering page header and summary cards
* rendering error, loading, empty, and queue states
* rendering one card per reading-fit queue item
* linking to learner Book Hub pages
* linking to teacher review pages
* marking a queue item as reviewed by updating `user_books.teacher_review_cleared_at`
* tracking per-row clearing state

## 3. Risk Boundaries

Do not touch these during a first safe thinning pass:

* teacher-only access checks
* Supabase Auth and `profiles` queries
* linked student filtering through `teacher_students`
* profile loading for linked students
* `user_books` query and filtering
* missing-signal criteria
* `teacher_review_cleared_at` update behavior
* per-row clearing state
* permission-sensitive teacher/student relationship assumptions
* route/link targets for learner Book Hub and Teacher Review

These should stay in `page.tsx` during the first pass unless the extraction is purely presentational.

## 4. Suggested Extraction Candidates

### Low-Risk Visual Components

Good first-pass candidates:

* `TeacherReadingFitHeader`
  * Teacher Portal label, page title, intro copy, Teacher Home link
* `TeacherReadingFitSummaryGrid`
  * summary cards for total, missing reader level, missing ease rating, and missing entertainment rating
* `TeacherReadingFitMessage`
  * error banner
* `TeacherReadingFitLoadingState`
  * loading queue card
* `TeacherReadingFitEmptyState`
  * all-clear empty state
* `ReadingFitSignalCard`
  * display-only card for one signal value/missing state

These are good visual thinning candidates because they can receive already-derived props.

### Medium-Risk Helper/Component Candidates

Useful after the first pass:

* `TeacherReadingFitQueueItemCard`
  * one item card with cover, pills, title, signal cards, links, and Mark as Reviewed button
  * medium risk because it includes a mutation trigger, even if the handler stays in the page
* `TeacherReadingFitQueueList`
  * grid/list wrapper around queue item cards
* formatting helpers for book type, date, rating, and difficulty labels
  * keep in page for the first pass; they are small and easy to move later

### High-Risk / Leave For Later

Leave these in `page.tsx` for now:

* all Supabase queries
* all access checks
* linked-student filtering
* queue item derivation and missing-signal rules
* `markAsReviewed`
* `clearingId` behavior
* route/link behavior if product navigation is still shifting
* shared teacher/student access helpers

## 5. Recommended Refactor Order

Safe first pass:

1. Extract `TeacherReadingFitHeader`.
2. Extract `TeacherReadingFitSummaryGrid`.
3. Extract `TeacherReadingFitMessage`.
4. Extract `TeacherReadingFitLoadingState`.
5. Extract `TeacherReadingFitEmptyState`.
6. Extract `ReadingFitSignalCard`.

Safe stopping point:

Stop before moving queue derivation, linked-student logic, or review-clearing behavior. The page should still own all Supabase behavior and the `markAsReviewed` handler.

Optional second visual pass:

7. Extract `TeacherReadingFitQueueItemCard`, passing `onMarkReviewed` and `isClearing` in as props.
8. Extract `TeacherReadingFitQueueList` only if the item card extraction remains clean.

## 6. Proposed File Structure

Suggested future component folder:

```txt
app/(protected)/teacher/reading-fit/components/
  TeacherReadingFitHeader.tsx
  TeacherReadingFitSummaryGrid.tsx
  TeacherReadingFitMessage.tsx
  TeacherReadingFitLoadingState.tsx
  TeacherReadingFitEmptyState.tsx
  ReadingFitSignalCard.tsx
  TeacherReadingFitQueueItemCard.tsx
  TeacherReadingFitQueueList.tsx
```

Do not create these files during this planning task.

## 7. Notes For Future Codex/Refactor Pass

First pass should be visual thinning only. Keep all data fetching, access checks, linked-student logic, queue filtering, and `teacher_review_cleared_at` updates in the page.

Do not change the criteria for which books appear in the queue. Do not change the teacher/student visibility model. Do not change where Book Hub or Teacher Review links point.

After each extraction, the page should compile and behave exactly the same. Manual checks should include signed-out state, non-teacher access, linked-student visibility, empty linked-student state, queue counts, item cards, Book Hub links, Teacher Review links, and Mark as Reviewed behavior.
