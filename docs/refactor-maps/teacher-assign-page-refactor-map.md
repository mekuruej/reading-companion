# Teacher Assign Page Refactor Map

No-code refactor map for:

`app/(protected)/teacher/assign/page.tsx`

Current observed size: 812 lines.

This is a planning document only. Do not refactor the page from this map without a separate implementation pass.

## 1. Page Purpose

This page is a teacher-facing "Add / Prep a Book" workflow.

From the teacher point of view, it lets an authorized teacher either add a shared/global book directly to an existing learner's library or save a book on the teacher's prep shelf for a future/prospective learner. It also lets the teacher search global books, check missing book metadata, edit selected book info, view current prep shelf items, and remove prep shelf items.

## 2. Current Responsibilities

Current responsibilities include:

* checking whether the signed-in user has teacher or super-teacher access
* handling signed-out, loading, and no-access states
* loading the current user's `profiles` row
* branching between super-teacher and regular-teacher student visibility
* loading all learner profiles for super-teachers
* loading linked students through `teacher_students` for regular teachers
* loading shared/global `books`
* loading teacher prep shelf rows from `teacher_book_prep_items`
* maintaining selected student, selected book, book search, and action mode state
* maintaining future learner name/contact fields
* filtering books by title, author, ISBN, publisher, or book type
* showing missing metadata for the selected book
* linking to `/teacher/books/add?bookId=...` for book metadata cleanup
* inserting learner-visible `user_books` rows in `add_to_library` mode
* inserting teacher-owned `teacher_book_prep_items` rows in `prep_future` mode
* deleting teacher-owned prep shelf items
* handling duplicate/unique constraint messages
* rendering action-mode cards, learner fields, book picker, status copy, primary action button, and prep shelf cards
* displaying success and error messages

## 3. Risk Boundaries

Do not touch these during a first safe thinning pass:

* teacher-only and super-teacher access checks
* signed-in user loading through Supabase Auth
* current teacher profile loading
* linked student checks through `teacher_students`
* regular teacher student filtering
* super-teacher broad profile loading
* student selection assumptions
* shared/global book loading
* book assignment behavior
* learner-visible `user_books` creation
* teacher-owned `teacher_book_prep_items` creation
* prep shelf delete behavior
* existing assigned/duplicate handling behavior
* task/assignment creation assumptions
* Supabase queries and mutations
* validation and friendly success/error messages
* permission-sensitive teacher/student relationships
* navigation links that imply teacher/student scope

These areas should stay in `page.tsx` during the first pass unless there is an obviously safe visual-only extraction around them.

## 4. Suggested Extraction Candidates

### Low-Risk Visual Components

Good first-pass candidates:

* `TeacherAssignLoadingState`
  * loading `<main>` shell and message
* `TeacherAssignSimpleState`
  * sign-in required and no-access shells
* `TeacherAssignHeader`
  * title row, Back to My Students link, and intro copy
* `TeacherAssignMessageBanner`
  * error and success banners
* `TeacherAssignModeExplanation`
  * the colored mode explanation panel below the selected book helper
* `TeacherAssignLearningTasksNote`
  * the reminder that learning tasks stay separate
* `TeacherPrepShelfEmptyState`
  * empty prep shelf dashed card

These should receive props and render JSX only. They should not know how students are loaded, how assignments are created, or how prep rows are deleted.

### Medium-Risk Helper/Component Candidates

Useful after the first visual shell pass:

* `TeacherAssignModeToggle`
  * controlled Add to Learner Library / Prep for Future Learner buttons
  * medium risk because it changes core form mode state
* `TeacherAssignLearnerFields`
  * existing learner select or future learner fields
  * medium risk because it renders permission-sensitive student choices and controlled form state
* `TeacherAssignBookPicker`
  * book search, book select, result-count helper, selected book helper, and edit-book-info link
  * medium risk because it mixes controlled search state, derived book filtering, and route construction
* `TeacherAssignPrimaryActionPanel`
  * primary action button and mode-specific copy
  * medium risk because it triggers assignment/prep creation
* `TeacherPrepShelfItemCard`
  * one prep shelf item row/card
  * medium risk because it includes a delete trigger and joined-book display normalization
* small formatting helpers for profile labels, prospective learner labels, missing-book-info labels, and book search text
  * keep in page until display output and assignment behavior are stable

### High-Risk / Leave For Later

Leave these in `page.tsx` for now:

* Supabase Auth loading
* `profiles` queries
* `teacher_students` queries
* global `books` query
* `teacher_book_prep_items` query, insert, and delete
* `user_books` insert
* linked-student permission logic
* super-teacher profile-selection branch
* regular teacher linked-student branch
* assignment creation logic
* prep shelf creation logic
* existing assigned/duplicate handling
* validation in `handlePrimaryAction`
* `removePrepItem`
* route/navigation side effects
* shared helper/service/hook extraction

## 5. Recommended Refactor Order

Safe first pass:

1. Extract `TeacherAssignLoadingState`.
2. Extract `TeacherAssignSimpleState`.
3. Extract `TeacherAssignHeader`.
4. Extract `TeacherAssignMessageBanner`.
5. Extract `TeacherAssignModeExplanation`.
6. Extract `TeacherAssignLearningTasksNote`.
7. Extract `TeacherPrepShelfEmptyState`.

Safe stopping point:

Stop after visual shell, banners, static notes, and empty state. The page should still own all data loading, all controlled form state, all student/book selection, all mutations, and all handlers.

Optional second visual pass:

8. Extract `TeacherAssignModeToggle`, still passing `actionMode` and `setActionMode` from the page.
9. Extract `TeacherAssignPrimaryActionPanel`, still passing `handlePrimaryAction` from the page.
10. Extract `TeacherPrepShelfItemCard`, still passing `removePrepItem` from the page.

Pause before:

* extracting linked-student selection logic
* extracting the book picker with filtering logic
* moving helper functions
* moving Supabase queries/mutations
* creating shared teacher/student assignment services

## 6. Proposed File Structure

Suggested future component folder:

```txt
app/(protected)/teacher/assign/components/
  TeacherAssignLoadingState.tsx
  TeacherAssignSimpleState.tsx
  TeacherAssignHeader.tsx
  TeacherAssignMessageBanner.tsx
  TeacherAssignModeExplanation.tsx
  TeacherAssignLearningTasksNote.tsx
  TeacherPrepShelfEmptyState.tsx
  TeacherAssignModeToggle.tsx
  TeacherAssignPrimaryActionPanel.tsx
  TeacherPrepShelfItemCard.tsx
```

Possible later files, after the first safe pass:

```txt
app/(protected)/teacher/assign/components/
  TeacherAssignLearnerFields.tsx
  TeacherAssignBookPicker.tsx
  TeacherPrepShelfSection.tsx
```

Do not create these files during this planning task. A future implementation pass should add only the smallest useful subset.

## 7. Notes For Future Codex/Refactor Pass

First pass should be visual thinning only.

Keep all data fetching and mutation logic in the page. Keep access checks in the page. Keep linked-student checks, student selection state, submit/assignment handlers, prep shelf handlers, and duplicate/permission behavior in the page. Do not change Supabase queries, teacher/student relationship assumptions, assignment creation, prep shelf creation, prep shelf deletion, or user library behavior.

Do not "clean up" behavior while extracting components. Avoid turning this into an architecture pass. If a proposed component needs a large prop set or starts to own permission-sensitive decisions, leave that section in `page.tsx`.

After each extraction, the page should compile and behave exactly the same. Manual smoke checks should include signed-out state, non-teacher access, teacher access, super-teacher access, regular teacher linked-student visibility, student selection, book search/filtering, Add to Learner Library creating a learner-visible `user_books` row, duplicate add handling, Prep for Future Learner creating only a teacher-owned prep shelf row, prep shelf display, prep shelf delete scoping, and edit-book-info links.
