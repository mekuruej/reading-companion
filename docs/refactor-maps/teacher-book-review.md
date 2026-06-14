# Teacher Book Review Page Refactor Map

No-code refactor map for:

`app/(protected)/teacher/books/[userBookId]/page.tsx`

Current observed size: 645 lines.

This is a planning document only. Do not refactor the page from this map without a separate implementation pass.

## 1. Page Purpose

This page is a teacher-facing review form for one learner book.

From the teacher point of view, it shows a learner-owned `user_books` row with joined book metadata and lets a teacher save teacher-facing review fields: suitable level, usefulness with students, language learning potential, and private teacher notes.

## 2. Current Responsibilities

Current responsibilities include:

* checking signed-in teacher/super-teacher access
* loading one `user_books` row by `userBookId`
* joining shared/global `books` metadata
* initializing form state from saved teacher review fields
* rendering loading and not-found/access states
* rendering navigation back to Teacher Portal and Book Hub
* rendering book hero/cover/title summary
* rendering error and save-message banners
* rendering the saved teacher review snapshot
* rendering suitable-level option buttons
* rendering student-use rating options
* rendering language-learning-potential rating options
* rendering teacher notes textarea
* saving teacher review fields back to `user_books`
* clearing `teacher_review_cleared_at` on save
* formatting stars and display labels for saved review values

## 3. Risk Boundaries

Do not touch these during a first safe thinning pass:

* teacher-only and super-teacher access checks
* Supabase Auth and `profiles` queries
* `user_books` loading
* joined `books` metadata loading
* save/update behavior
* `teacher_review_cleared_at` reset behavior
* form initialization from loaded row
* route params and navigation side effects
* suitable-level values and meanings
* rating values and labels
* validation/coercion through `clampRating5`
* private teacher-note save behavior

These should stay in `page.tsx` during the first pass unless the extraction is clearly display-only.

## 4. Suggested Extraction Candidates

### Low-Risk Visual Components

Best first-pass candidates:

* `TeacherBookReviewLoadingState`
  * loading shell
* `TeacherBookReviewAccessState`
  * no-row/no-access shell
* `TeacherBookReviewNav`
  * Teacher Portal and Back to Book Hub buttons
* `TeacherBookReviewHero`
  * cover, page label, title, reading, and intro copy
* `TeacherBookReviewMessage`
  * error and save message banners
* `TeacherBookReviewSavedSnapshot`
  * saved summary panel and cards
* `TeacherBookReviewSaveBar`
  * sticky save button

These can receive props and render JSX without owning behavior.

### Medium-Risk Helper/Component Candidates

Useful after the first visual pass:

* `SuitableLevelSelector`
  * suitable level option list, clear button, selected summary
  * medium risk because it is controlled form UI
* `TeacherRatingSelector`
  * reusable card for Use With Students and Language Learning Potential ratings
  * medium risk because it owns controlled button rendering and repeated star display
* `TeacherNotesCard`
  * controlled textarea for private notes
  * medium risk because it owns editable form UI
* display helpers for stars and label text
  * keep page-local at first; move only with components after behavior is stable

### High-Risk / Leave For Later

Leave these in `page.tsx` for now:

* Supabase queries
* access checks
* form initialization from loaded row
* `saveTeacherReview`
* validation/coercion helpers
* route params and router navigation
* option constants if changing their location would make review semantics harder to audit
* any shared teacher review service/hook extraction

## 5. Recommended Refactor Order

Safe first pass:

1. Extract `TeacherBookReviewLoadingState`.
2. Extract `TeacherBookReviewAccessState`.
3. Extract `TeacherBookReviewNav`.
4. Extract `TeacherBookReviewHero`.
5. Extract `TeacherBookReviewMessage`.
6. Extract `TeacherBookReviewSavedSnapshot`.
7. Extract `TeacherBookReviewSaveBar`.

Safe stopping point:

Stop before extracting the editable form controls. At that point the page should still own all form state, all option maps, all Supabase behavior, and the save handler.

Optional second visual pass:

8. Extract `SuitableLevelSelector`.
9. Extract `TeacherRatingSelector` for the two rating sections.
10. Extract `TeacherNotesCard`.

## 6. Proposed File Structure

Suggested future component folder:

```txt
app/(protected)/teacher/books/[userBookId]/components/
  TeacherBookReviewLoadingState.tsx
  TeacherBookReviewAccessState.tsx
  TeacherBookReviewNav.tsx
  TeacherBookReviewHero.tsx
  TeacherBookReviewMessage.tsx
  TeacherBookReviewSavedSnapshot.tsx
  TeacherBookReviewSaveBar.tsx
  SuitableLevelSelector.tsx
  TeacherRatingSelector.tsx
  TeacherNotesCard.tsx
```

Do not create these files during this planning task.

## 7. Notes For Future Codex/Refactor Pass

First pass should be visual thinning only. Keep all data fetching, access checks, form state, form initialization, validation, save behavior, and Supabase updates in the page.

Do not change saved review semantics while extracting components. Do not alter level/rating labels, `teacher_review_cleared_at` behavior, private note behavior, or navigation targets.

After each extraction, the page should compile and behave exactly the same. Manual checks should include signed-out state, non-teacher access, loading an existing review, no-row state, changing suitable level, clearing level, changing both ratings, clearing ratings, editing notes, saving, save message display, and return links.
