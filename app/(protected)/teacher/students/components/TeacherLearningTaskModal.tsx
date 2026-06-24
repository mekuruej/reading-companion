type TaskBookOption = {
  id: string;
  userId: string;
  title: string;
};

type ActiveLearningTask = {
  id: string;
  learner_id: string;
  user_book_id: string | null;
  task_type: string;
  title: string;
  instructions: string | null;
  due_on: string | null;
  created_at: string;
};

type TaskModalStudent = {
  display_name: string | null;
  username: string | null;
};

const LEARNING_TASK_TYPE_OPTIONS = [
  { value: "reread_pages", label: "Reread pages" },
  { value: "review_book_words", label: "Study book flashcards" },
  { value: "kanji_reading_practice", label: "Kanji Reading practice" },
  { value: "listening", label: "Listening" },
];

const REREAD_TASK_MODE_OPTIONS = [
  { value: "fluid_reading_saved_words", label: "Fluid Reading with Saved Word Support" },
  { value: "curiosity_reading", label: "Curiosity Reading" },
  { value: "just_reading", label: "Just Reading" },
  { value: "reader_choice", label: "Reader’s choice / Book Hub" },
];

const BOOK_FLASHCARD_FILTER_OPTIONS = [
  { value: "whole_book", label: "Whole book" },
  { value: "chapter", label: "Chapter" },
  { value: "page_range", label: "Page range" },
  { value: "saved_date_range", label: "Saved date range" },
];

export default function TeacherLearningTaskModal({
  student,
  taskType,
  onTaskTypeChange,
  taskUserBookId,
  onTaskUserBookIdChange,
  taskLearnerId,
  taskBooks,
  taskReadingMode,
  onTaskReadingModeChange,
  taskFlashcardFilter,
  onTaskFlashcardFilterChange,
  taskChapterNumber,
  onTaskChapterNumberChange,
  taskSavedFrom,
  onTaskSavedFromChange,
  taskSavedTo,
  onTaskSavedToChange,
  taskKanjiCardCount,
  onTaskKanjiCardCountChange,
  taskTitle,
  onTaskTitleChange,
  taskInstructions,
  onTaskInstructionsChange,
  taskPageStart,
  onTaskPageStartChange,
  taskPageEnd,
  onTaskPageEndChange,
  taskSaving,
  taskMessage,
  activeTasks,
  taskBooksByStudentId,
  cancellingTaskId,
  learningTaskTypeLabel,
  onClose,
  onCreateTask,
  onCancelTask,
}: {
  student: TaskModalStudent;
  taskType: string;
  onTaskTypeChange: (value: string) => void;
  taskUserBookId: string;
  onTaskUserBookIdChange: (value: string) => void;
  taskLearnerId: string;
  taskBooks: TaskBookOption[];
  taskReadingMode: string;
  onTaskReadingModeChange: (value: string) => void;
  taskFlashcardFilter: string;
  onTaskFlashcardFilterChange: (value: string) => void;
  taskChapterNumber: string;
  onTaskChapterNumberChange: (value: string) => void;
  taskSavedFrom: string;
  onTaskSavedFromChange: (value: string) => void;
  taskSavedTo: string;
  onTaskSavedToChange: (value: string) => void;
  taskKanjiCardCount: string;
  onTaskKanjiCardCountChange: (value: string) => void;
  taskTitle: string;
  onTaskTitleChange: (value: string) => void;
  taskInstructions: string;
  onTaskInstructionsChange: (value: string) => void;
  taskPageStart: string;
  onTaskPageStartChange: (value: string) => void;
  taskPageEnd: string;
  onTaskPageEndChange: (value: string) => void;
  taskSaving: boolean;
  taskMessage: string | null;
  activeTasks: ActiveLearningTask[];
  taskBooksByStudentId: Record<string, TaskBookOption[]>;
  cancellingTaskId: string | null;
  learningTaskTypeLabel: (taskType: string) => string;
  onClose: () => void;
  onCreateTask: () => void;
  onCancelTask: (taskId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/40 px-4 py-8">
      <section className="w-full max-w-3xl rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Learning Tasks
            </p>
            <h2 className="mt-1 text-lg font-black text-stone-900">
              Create a task for {student.display_name || student.username || "this learner"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              A small manual task for a learner. Tasks appear on the learner’s Library page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={taskSaving}
            className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Task type
            <select
              value={taskType}
              onChange={(event) => onTaskTypeChange(event.target.value)}
              className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
            >
              {LEARNING_TASK_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {taskType === "kanji_reading_practice" ? (
            <div className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm text-stone-600">
              Kanji Reading tasks are global, so they do not need a linked book.
            </div>
          ) : (
            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Linked book
              <select
                value={taskUserBookId}
                onChange={(event) => onTaskUserBookIdChange(event.target.value)}
                className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
              >
                <option value="">No linked book</option>
                {taskBooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {taskType === "reread_pages" ? (
            <label className="grid gap-1 text-sm font-semibold text-stone-700 lg:col-span-2">
              Reading type
              <select
                value={taskReadingMode}
                onChange={(event) => onTaskReadingModeChange(event.target.value)}
                className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
              >
                {REREAD_TASK_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {taskType === "review_book_words" ? (
            <>
              <label className="grid gap-1 text-sm font-semibold text-stone-700">
                Flashcard set
                <select
                  value={taskFlashcardFilter}
                  onChange={(event) => onTaskFlashcardFilterChange(event.target.value)}
                  className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                >
                  {BOOK_FLASHCARD_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {taskFlashcardFilter === "chapter" ? (
                <label className="grid gap-1 text-sm font-semibold text-stone-700">
                  Chapter number
                  <input
                    value={taskChapterNumber}
                    onChange={(event) => onTaskChapterNumberChange(event.target.value)}
                    inputMode="numeric"
                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                    placeholder="Example: 2"
                  />
                </label>
              ) : null}

              {taskFlashcardFilter === "saved_date_range" ? (
                <>
                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Saved from
                    <input
                      type="date"
                      value={taskSavedFrom}
                      onChange={(event) => onTaskSavedFromChange(event.target.value)}
                      className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-semibold text-stone-700">
                    Saved to
                    <input
                      type="date"
                      value={taskSavedTo}
                      onChange={(event) => onTaskSavedToChange(event.target.value)}
                      className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                    />
                  </label>
                </>
              ) : null}
            </>
          ) : null}

          {taskType === "kanji_reading_practice" ? (
            <label className="grid gap-1 text-sm font-semibold text-stone-700 lg:col-span-2">
              Kanji cards
              <input
                value={taskKanjiCardCount}
                onChange={(event) => onTaskKanjiCardCountChange(event.target.value)}
                inputMode="numeric"
                className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                placeholder="10"
              />
            </label>
          ) : null}

          <label className="grid gap-1 text-sm font-semibold text-stone-700 lg:col-span-2">
            Title
            <input
              value={taskTitle}
              onChange={(event) => onTaskTitleChange(event.target.value)}
              className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-stone-700 lg:col-span-2">
            Instructions
            <textarea
              value={taskInstructions}
              onChange={(event) => onTaskInstructionsChange(event.target.value)}
              rows={3}
              className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
            />
          </label>

          {taskType !== "kanji_reading_practice" &&
          (taskType !== "review_book_words" || taskFlashcardFilter === "page_range") ? (
            <>
              <label className="grid gap-1 text-sm font-semibold text-stone-700">
                Start page
                <input
                  value={taskPageStart}
                  onChange={(event) => onTaskPageStartChange(event.target.value)}
                  inputMode="numeric"
                  className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                  placeholder="Optional"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-stone-700">
                End page
                <input
                  value={taskPageEnd}
                  onChange={(event) => onTaskPageEndChange(event.target.value)}
                  inputMode="numeric"
                  className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                  placeholder="Optional"
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCreateTask}
            disabled={taskSaving}
            className="rounded-2xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50"
          >
            {taskSaving ? "Creating..." : "Create Task"}
          </button>

          {taskMessage ? (
            <p className="text-sm font-medium text-emerald-900">{taskMessage}</p>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-stone-900">
                Active tasks for this learner
              </h3>
              <p className="text-xs leading-5 text-stone-500">
                Cancel a task here if it should disappear from their Library page.
              </p>
            </div>
          </div>

          {activeTasks.length > 0 ? (
            <div className="mt-3 space-y-2">
              {activeTasks.map((task) => {
                const linkedBook = (taskBooksByStudentId[task.learner_id] ?? []).find(
                  (book) => book.id === task.user_book_id
                );

                return (
                  <div
                    key={task.id}
                    className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                        {learningTaskTypeLabel(task.task_type)}
                        {linkedBook ? ` · ${linkedBook.title}` : ""}
                      </div>
                      <div className="mt-1 text-sm font-black text-stone-900">
                        {task.title}
                      </div>
                      {task.instructions ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">
                          {task.instructions}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => onCancelTask(task.id)}
                      disabled={cancellingTaskId === task.id}
                      className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      {cancellingTaskId === task.id ? "Cancelling..." : "Cancel task"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-500">
              No active tasks from you right now.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}