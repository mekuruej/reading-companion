# Teacher Follow-Along Page Refactor Map

No-code refactor map for:

`app/(protected)/teacher/library/[teacherBookId]/follow/page.tsx`

Current observed size: 435 lines.

This is a planning document only. Do not refactor the page from this map without a separate implementation pass.

## 1. Page Purpose

This page is a teacher-facing follow-along lesson support view for one teacher library book.

From the teacher point of view, it turns prepared `teacher_book_items` into a readalong-style support screen, grouped into pages, with support modes for full support, reading-only support, or meaning-only support. It is explicitly teacher-prep support only.

## 2. Current Responsibilities

Current responsibilities include:

* checking teacher/super-teacher access
* loading one `teacher_books` row by `teacherBookId`
* loading joined shared/global book metadata for the teaching book
* loading `teacher_book_items` for that teaching book
* grouping teacher prep items into page chunks
* creating fallback page chunks when no page number exists
* tracking support mode
* tracking page navigation and jump-page input
* scrolling to the top of the readalong area on page changes
* fading teacher prep items as the teacher taps through them
* rendering the teacher book header/book bar
* rendering support mode tabs and readalong shell components
* rendering prep item cards with item-type badges, readings, meanings, explanations, translations, and teacher notes
* rendering loading, access, and empty states

The page does not write reading sessions, stats, `user_book_words`, learner study data, or progress.

## 3. Risk Boundaries

Do not touch these during a first safe thinning pass:

* teacher-only and super-teacher access checks
* Supabase Auth and `profiles` queries
* `teacher_books` loading
* `teacher_book_items` loading
* teacher-book ownership/access assumptions
* item ordering by `page_number` and `created_at`
* page grouping/chunking behavior
* support mode behavior
* page navigation behavior
* scroll reset behavior
* faded-through/tap behavior
* shared readalong component contracts
* the explicit no-write boundary for learner reading/session/progress data

These should stay in `page.tsx` during the first pass unless the extraction is clearly display-only.

## 4. Suggested Extraction Candidates

### Low-Risk Visual Components

Good first-pass candidates:

* `TeacherFollowAlongLoadingState`
  * loading shell and message
* `TeacherFollowAlongAccessState`
  * no-access shell and message
* `TeacherFollowAlongHeader`
  * page title and explanatory copy
* `TeacherFollowAlongBookBar`
  * cover/title/author link back to prep add plus action links
* `TeacherFollowAlongEmptyPageState`
  * empty page card when no prep items exist for the selected page

These should receive props and render JSX only.

### Medium-Risk Helper/Component Candidates

Useful after a small visual pass:

* `TeacherFollowAlongReaderHeader`
  * page navigator plus page item count/title/tap helper copy
  * medium risk because it connects to navigation handlers
* `TeacherFollowAlongPrepItemCard`
  * one clickable prep item card
  * medium risk because it includes `onClick` fade behavior and support-mode conditional rendering
* display helpers for item type label/tone
  * keep in the page at first, then move with the item card if desired

### High-Risk / Leave For Later

Leave these in `page.tsx` for now:

* Supabase queries
* access checks
* page chunking/grouping logic
* support mode state
* page navigation state and handlers
* scroll/fade effects
* shared readalong component integration
* any change that writes or implies learner progress/session data

## 5. Recommended Refactor Order

Safe first pass:

1. Extract `TeacherFollowAlongLoadingState`.
2. Extract `TeacherFollowAlongAccessState`.
3. Extract `TeacherFollowAlongHeader`.
4. Extract `TeacherFollowAlongBookBar`.
5. Extract `TeacherFollowAlongEmptyPageState`.

Safe stopping point:

Stop after those display-only extractions. At that point the page should still own data loading, access checks, page grouping, navigation, support mode, scroll effects, and fade behavior.

Optional second visual pass:

6. Extract `TeacherFollowAlongReaderHeader`.
7. Extract `TeacherFollowAlongPrepItemCard`, passing `supportMode`, `isFaded`, and `onSelect` in from the page.

## 6. Proposed File Structure

Suggested future component folder:

```txt
app/(protected)/teacher/library/[teacherBookId]/follow/components/
  TeacherFollowAlongLoadingState.tsx
  TeacherFollowAlongAccessState.tsx
  TeacherFollowAlongHeader.tsx
  TeacherFollowAlongBookBar.tsx
  TeacherFollowAlongEmptyPageState.tsx
  TeacherFollowAlongReaderHeader.tsx
  TeacherFollowAlongPrepItemCard.tsx
```

Do not create these files during this planning task.

## 7. Notes For Future Codex/Refactor Pass

First pass should be visual thinning only. Keep all data fetching, access checks, item grouping, navigation, support-mode state, and scroll/fade effects in the page.

Do not change the teacher-prep boundary. This page must not write learner sessions, stats, vocabulary, study progress, or reading progress.

After each extraction, the page should compile and behave exactly the same. Manual checks should include teacher access, non-teacher access, missing teacher book, page navigation, jump-to-page, support mode switching, item fade-on-tap, empty page display, and links back to Prep Add and Teacher Library.
