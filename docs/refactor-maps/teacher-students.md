# Teacher Students Refactor / Status Map

No-code refactor/status map for:

`app/(protected)/teacher/students/page.tsx`

Current tracker row:

`- [ ] Skip for now | app/(protected)/teacher/students/page.tsx | 1498 | 1498 | 0 |`

Current observed size: about 1685 lines.

## Current Page Purpose

The Teacher Students page is a teacher-facing workspace for viewing and managing linked learners.

Current responsibilities include:

* checking whether the signed-in user is a teacher or super-teacher
* loading student profile rows visible to that teacher role
* showing linked students grouped as future, current, past, and archived
* showing each student's lesson day, recent reading engagement, current/recent book, library count, and assigned prep count
* linking to the student's public/user library route when a username exists
* linking to the student's current Book Hub when a current/recent `user_book` exists
* creating manual learning tasks for students
* viewing and cancelling active learning tasks created by the current teacher
* archiving and restoring teacher/student relationships
* searching students by name, username, level, lesson day, relationship label, or current book
* showing future placeholder cards for lesson notes, assigned books, and student stats

The page does not appear to create new student accounts or invite prospective students directly. "Future students" are inferred from relationship status, trial/upcoming labels, or profile access data rather than a separate invite form in this file.

## Important Data Boundaries

This page crosses several sensitive teacher/student data boundaries:

* The signed-in teacher or super-teacher is loaded from `supabase.auth.getUser()` and `profiles`.
* Regular teachers load `teacher_students` rows scoped to `.eq("teacher_id", user.id)`.
* Super-teachers load broader `teacher_students` rows and all student-like profile rows.
* Linked students are represented by `profiles` rows with `role` of `member` or `student`.
* Student library/book context is loaded from `user_books` for the visible student IDs.
* Recent student activity is inferred from `user_book_reading_sessions` joined by the visible students' `user_book` IDs.
* Task creation and cancellation use `learning_tasks` rows tied to `created_by`, `learner_id`, and optional `user_book_id`.
* Archive/restore actions update `teacher_students` relationship rows.

Important current design:

Normal teachers should only see and manage students they are linked to. Super-teachers may have broader visibility, but that broader access should remain explicit and guarded. Regular students and members should not access `/teacher/students`; this page also has a local `canAccess` check, while route-level teacher protection is expected to be handled by the teacher layout.

Private learner data should not be broadly exposed. Any later cleanup should preserve the rule that regular teachers see only linked-student context, and that super-teacher broader access is intentional rather than accidental.

## Current Risks / Do Not Touch Yet

Do not move these during a first visual pass:

* teacher route protection
* local teacher/super-teacher role checks
* `teacher_students` relationship loading
* regular-teacher vs super-teacher query branching
* student profile loading
* linked-student access assumptions
* student `user_books` loading
* student reading-session lookup for recent engagement
* learning task loading, creation, and cancellation
* archive/restore relationship handlers
* task validation and task payload construction
* search/filter/group behavior
* Supabase queries
* helper functions
* page-local types
* page-local `StudentCardArticle` component if it still depends directly on page helpers
* services, DAOs, controllers, hooks, or shared access helpers

## Current Structure Map

### Types / Interfaces

Keep all page-local types in `page.tsx` for the first visual pass.

Current types:

* `ProfileRole`
* `StudentRelationshipStatus`
* `StudentProfile`
* `TeacherStudentLink`
* `UserBookRow`
* `StudentCard`
* `TaskBookOption`
* `ActiveLearningTask`
* `LearningTaskType`
* `RereadTaskMode`
* `BookFlashcardFilter`

These types encode current data-loading and task behavior. Moving them before the teacher/student relationship model settles would add churn.

### Constants

Keep constants in `page.tsx` for the first visual pass.

Current constants/options:

* `LEARNING_TASK_TYPE_OPTIONS`
* `REREAD_TASK_MODE_OPTIONS`
* `BOOK_FLASHCARD_FILTER_OPTIONS`
* `DEFAULT_TASK_COPY`

Embedded copy/constants:

* page title and intro copy
* summary card labels
* relationship group titles/details
* learning task modal labels
* future placeholder copy for lesson notes, assigned books, and student stats
* confirm/prompt copy for archive, restore, and task cancellation

### Helper Functions

Keep helpers in `page.tsx` for the first visual pass.

Current helpers:

* `getBook`
* `formatLessonDay`
* `formatRelativeDate`
* `isStudentProfile`
* `getStudentRelationshipStatus`
* `normalizeRelationshipStatus`
* `getLinkRelationshipStatus`
* `relationshipLabel`
* `relationshipClasses`
* `learningTaskTypeLabel`

These helpers are small, but they sit close to important relationship/status interpretation. Defer moving them until behavior is covered by tests or the teacher/student model is less fluid.

### State

Access/loading state:

* `loading`
* `canAccess`
* `currentUserId`
* `error`

Student rows/list state:

* `students`
* `taskBooksByStudentId`

Search/filter state:

* `studentSearch`

Learning task modal and form state:

* `taskModalStudent`
* `taskLearnerId`
* `taskUserBookId`
* `taskType`
* `taskTitle`
* `taskInstructions`
* `taskPageStart`
* `taskPageEnd`
* `taskReadingMode`
* `taskFlashcardFilter`
* `taskChapterNumber`
* `taskSavedFrom`
* `taskSavedTo`
* `taskKanjiCardCount`
* `taskSaving`
* `taskMessage`

Active task state:

* `activeLearningTasks`
* `cancellingTaskId`

Archive/restore state:

* `updatingArchiveStudentId`

There is no separate selected-student detail panel state beyond `taskModalStudent`.

### Data Loading / Supabase Behavior

Keep all loading logic in `page.tsx`.

Current data loading:

* `loadStudents()` calls `supabase.auth.getUser()`.
* Current user's teacher profile is loaded from `profiles`.
* Local access is calculated from `role === "teacher"`, `role === "super_teacher"`, or `is_super_teacher`.
* Super-teachers load all `teacher_students` rows and all student-like profiles.
* Regular teachers load `teacher_students` rows with `.eq("teacher_id", user.id)`, then load only those linked student profiles.
* Student-like profiles are filtered with `isStudentProfile`.
* Relationship status, archive metadata, and relationship teacher IDs are derived from `teacher_students`.
* Visible students' `user_books` are loaded with `.in("user_id", studentIds)`.
* Book metadata is selected through `books:book_id`.
* Recent engagement is loaded from `user_book_reading_sessions` for the visible students' `user_book` IDs.
* Task book options are built from visible students' `user_books`.
* Active learning tasks are loaded by `loadActiveLearningTasks(teacherId, learnerIds)` from `learning_tasks`.

Do not change this behavior during visual extraction.

### Save / Update / Delete Behavior

Keep all mutation handlers in `page.tsx`.

Current mutation behavior:

* `createLearningTask()` validates task fields, builds `task_payload`, inserts into `learning_tasks`, and updates `activeLearningTasks`.
* `cancelLearningTask()` confirms with the teacher, updates `learning_tasks` to `status: "cancelled"` with `cancelled_at`, and removes the task from local state.
* `archiveStudent()` confirms with the teacher, prompts for an optional archive note, updates `teacher_students.archived_at`, `archived_by`, and `archive_reason`, then reloads students.
* `restoreStudent()` confirms with the teacher, clears archive fields on `teacher_students`, then reloads students.
* `openTaskModal()` and `closeTaskModal()` control the task modal and should remain page-local until the task workflow is more stable.
* `updateTaskType()` resets task form defaults and dependent fields.

There is no direct create/invite-student handler in this file.

### Derived Values

Keep derived values in `page.tsx`.

Current derived values:

* `summary`
  * active total
  * future/current/past/archived counts
  * active readers
  * assigned prep book count
  * recent activity count
* `filteredStudents`
  * search across display name, username, level, lesson day, relationship label, and current book title
* `groupedStudents`
  * future/current/past/archived groups
* `activeTasksForModalStudent`
  * active tasks filtered to the currently open task modal student
* student card display fields such as display name, archived status, current book, and button disabled states

### Render Sections

Current render sections:

* page shell
* header card with Teacher Workspace eyebrow, `My Students` title, intro copy, and links to `/teacher/assign` and `/teacher`
* loading state
* no-access state
* error banner
* summary cards
* learning task modal
  * modal header
  * task type selector
  * linked book selector or global Kanji Reading note
  * reading mode selector
  * flashcard filter controls
  * chapter/date/page/count fields
  * title/instructions fields
  * create task button/message
  * active tasks list and cancel buttons
* student list section
  * section header/copy
  * no linked students empty state
  * search box
  * filtered count copy
  * no-search-results empty state
  * future/current/past/archived group sections
  * `StudentCardArticle` cards
* future placeholder cards for Lesson Notes, Assigned Books, and Student Stats

## Recommended First-Pass Visual Extractions

Only extract presentational UI. Keep all data loading, relationship logic, Supabase calls, task handlers, archive handlers, helper functions, and page-local types in `page.tsx`.

### 1. `TeacherStudentsLoadingState`

What JSX it owns:

* the loading section that says `Loading students...`

What stays in `page.tsx`:

* `loading` state
* access logic
* load behavior

Expected props:

* none, or `message?: string`

Risk level:

* Low

Suggested order:

* 1

### 2. `TeacherStudentsAccessState`

What JSX it owns:

* the no-access red section that says the page is only available to teachers

What stays in `page.tsx`:

* `canAccess`
* auth/profile checks
* teacher route protection

Expected props:

* none, or `message?: string`

Risk level:

* Low

Suggested order:

* 2

### 3. `TeacherStudentsErrorBanner`

What JSX it owns:

* the red error banner

What stays in `page.tsx`:

* `error` state
* all catch/mutation error setting

Expected props:

* `message: string | null`

Risk level:

* Low

Suggested order:

* 3

### 4. `TeacherStudentsHeader`

What JSX it owns:

* top header card
* eyebrow/title/description
* links to `/teacher/assign` and `/teacher`

What stays in `page.tsx`:

* decision to render the page
* route choices if the navigation model changes later

Expected props:

* likely none for current static copy
* optionally `assignHref: string`
* optionally `teacherHomeHref: string`

Risk level:

* Low

Suggested order:

* 4

### 5. `TeacherStudentsSummaryCards`

What JSX it owns:

* current/future/past/assigned-prep/archived summary card grid

What stays in `page.tsx`:

* `summary` derivation

Expected props:

* `summary: { currentStudents: number; futureStudents: number; pastStudents: number; assignedPrepBooks: number; archivedStudents: number }`

Risk level:

* Low

Suggested order:

* 5

### 6. `TeacherStudentsSearchPanel`

What JSX it owns:

* search card
* label/input
* filtered count copy

What stays in `page.tsx`:

* `studentSearch` state
* `filteredStudents` derivation
* search matching logic

Expected props:

* `value: string`
* `onChange: (value: string) => void`
* `filteredCount: number`
* `totalCount: number`

Risk level:

* Low

Suggested order:

* 6

### 7. `TeacherStudentsEmptyState`

What JSX it owns:

* no linked students empty state
* no search results empty state, if generalized carefully

What stays in `page.tsx`:

* condition deciding which empty state to show
* `setStudentSearch("")` handler for the clear-search button, unless passed in as a prop

Expected props:

* `title: string`
* `description?: string`
* `actionLabel?: string`
* `onAction?: () => void`

Risk level:

* Low-medium. Generalizing two empty states is easy, but do not over-abstract if it makes the call sites harder to read.

Suggested order:

* 7

### 8. `TeacherStudentGroupSection`

What JSX it owns:

* one future/current/past/archived group wrapper
* group title/detail/count
* empty group message
* grid wrapper for cards

What stays in `page.tsx`:

* `groupedStudents`
* group list construction
* task/archive/restore handlers

Expected props:

* `title: string`
* `detail: string`
* `students: StudentCard[]`
* `renderStudent: (student: StudentCard) => React.ReactNode`

Risk level:

* Medium. Safe visually, but can introduce a render-prop or large handler prop chain.

Suggested order:

* 8, or defer if the page already scans well after smaller extractions.

### 9. `TeacherStudentCard`

What JSX it owns:

* current `StudentCardArticle` card JSX

What stays in `page.tsx`:

* relationship helpers for first pass, unless passed as formatted strings/classes
* task/archive/restore handlers
* card data derivation

Expected props:

* same as current `StudentCardArticle`
* `student: StudentCard`
* `onCreateTask: (student: StudentCard) => void`
* `onArchive: (student: StudentCard) => void`
* `onRestore: (student: StudentCard) => void`
* `isUpdatingArchive: boolean`

Risk level:

* Medium. It is already a page-local component, but moving it to a separate file would require exporting or relocating page-local types/helpers. Keep it local for the first pass unless the extraction specifically allows type/helper movement.

Suggested order:

* Defer for first tiny pass.

### 10. `TeacherStudentTaskModal`

What JSX it owns:

* full learning task modal
* task form fields
* active task list
* create/cancel/close controls

What stays in `page.tsx`:

* all task state
* all validation
* `createLearningTask`
* `cancelLearningTask`
* `updateTaskType`
* `closeTaskModal`
* task option constants

Expected props:

* many task state values, setters, option maps, active tasks, and handlers

Risk level:

* High for a first pass. This would create a giant prop basket and the modal is behavior-heavy.

Suggested order:

* Defer until task behavior is stable or extracted behind a focused task-controller boundary.

### 11. `TeacherStudentsFuturePanels`

What JSX it owns:

* the three placeholder cards for Lesson Notes, Assigned Books, and Student Stats

What stays in `page.tsx`:

* decision to show these placeholders

Expected props:

* none, or an array of `{ title: string; description: string }`

Risk level:

* Low

Suggested order:

* 9 if continuing beyond the core header/states/cards.

## Suspicious / Possibly Unused Code

Do not remove anything yet.

* The tracker row line count is stale. The page is currently about 1685 lines, not 1498.
* `summary.totalStudents`, `summary.activeReaders`, and `summary.withRecentActivity` are calculated but do not appear to be displayed in the current summary card grid.
* The page has a local access check even though teacher routes are also expected to be guarded by the teacher layout. This may be useful defense-in-depth, but the duplication should be documented before any centralization.
* Super-teacher loading queries all student-like profiles, not just linked profiles. This appears intentional, but it is a broad visibility path and should stay explicit.
* `relationshipTeacherIdByStudentId` stores one teacher ID per student. For super-teachers with multiple teacher/student links for the same student, archive/restore may operate on the first stored teacher relationship rather than a selected relationship.
* Archive detection uses `studentsWithActiveTeacherLink` to decide whether archived rows should show as archived. A student with both active and archived relationships may be shown as active. This may be intentional, but should be reviewed before changing queue behavior.
* The task modal is visually large and behavior-heavy. It is tempting to extract, but doing so now would likely create a large prop basket.
* There is no explicit invite/prospective-student creation flow in this file, despite the page including future/upcoming learner concepts.
* The header link says `Assigned prep books`, while the newer Teacher Hub model may want clearer placement under Lesson Prep.
* Placeholder cards for Lesson Notes, Assigned Books, and Student Stats may overlap with newer Teacher Hub alert/reminder concepts, but they are static and harmless for now.
* The current `StudentCardArticle` is already a visual component inside the page. It may be a good later extraction target, but it currently depends on page-local types and helpers.

## Recommended First Pass

Start with the safest visual-only components:

1. `TeacherStudentsLoadingState`
2. `TeacherStudentsAccessState`
3. `TeacherStudentsErrorBanner`
4. `TeacherStudentsHeader`
5. `TeacherStudentsSummaryCards`
6. `TeacherStudentsSearchPanel`
7. `TeacherStudentsFuturePanels`

After that, pause and reassess.

The student group/list area is a possible second step, but it is close to archive/restore/task handlers. The task modal should be deferred until a later pass because it carries too much form state, validation, mutation behavior, and task-specific branching.

## Architecture Deferred

* Teacher access helper: defer because teacher route protection, local profile checks, and super-teacher behavior should be reviewed together.
* Teacher/student relationship service: defer because archive/restore, broad super-teacher visibility, and linked-teacher visibility are policy-sensitive.
* Student profile DAO: defer until public/private profile boundaries are settled across teacher pages.
* Linked-student query helper: defer because this page has different regular-teacher and super-teacher behavior.
* Student library context loader: defer because it reads private learner book context and depends on teacher/student boundaries.
* Learning task service: defer because task payload shape, assignment workflow, and learner display behavior may still change.
* Task validation helper: defer until task modes and fields stabilize.
* Archive/restore helper: defer until multi-teacher/multi-relationship behavior is clarified.
* Shared teacher dashboard/list components: defer until Teacher Hub, Lesson Prep, Needs Attention, and Students pages settle visually.

## Browser Smoke Test Suggestions

Manual checklist for later implementation work:

* Teacher can open `/teacher/students`.
* Super-teacher can open `/teacher/students`.
* Regular student/member is blocked by teacher route protection and/or local access state.
* Regular teacher sees only linked students.
* Super-teacher sees the intended broader student list.
* Student list loads and groups future/current/past/archived correctly.
* Search filters by name, username, level, lesson day, status, and current book.
* Student card profile/library/context display is correct.
* Private learner data is not exposed beyond intended teacher access.
* Library links route to the correct student username route.
* Book Hub links route only to accessible user-book hubs.
* Assign Task modal opens for active students and is disabled for archived students.
* Reread page task creation works.
* Book flashcard task creation works for whole book/chapter/page range/saved date range.
* Kanji Reading task creation works without a linked book.
* Listening task creation works.
* Active tasks appear in the modal.
* Cancelling a task removes it from the modal/list.
* Archive action hides a student from active lists and shows archive metadata.
* Restore action returns a student to active lists.
* Empty linked-students state works.
* No-search-results state works and clear search resets the list.
* Mobile-ish visual check for header, summary cards, search, student cards, and task modal.

## Final Recommendation

This page is ready for a small first-pass visual extraction, but only around tiny state/header/card/search/placeholder sections.

Do not start with the task modal. Do not move relationship loading, task creation, or archive/restore behavior yet. The safest first pass should reduce visual noise without touching the teacher/student access boundary or creating a giant task-modal prop basket.

Suggested updated tracker row after map creation:

`- [ ] Refactor map ready / visual pass not started | app/(protected)/teacher/students/page.tsx | 1685 | 1685 | 0 |`
