type TeacherRatingsFilterPanelProps = {
  search: string;
  statusFilter: string;
  levelFilter: string;
  lessonFitFilter: string;
  sortMode: string;
  levelOptions: string[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onLevelFilterChange: (value: string) => void;
  onLessonFitFilterChange: (value: string) => void;
  onSortModeChange: (value: string) => void;
};

export function TeacherRatingsFilterPanel({
  search,
  statusFilter,
  levelFilter,
  lessonFitFilter,
  sortMode,
  levelOptions,
  onSearchChange,
  onStatusFilterChange,
  onLevelFilterChange,
  onLessonFitFilterChange,
  onSortModeChange,
}: TeacherRatingsFilterPanelProps) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Search
          </span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 outline-none focus:border-stone-400"
            placeholder="Title, author, notes..."
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 outline-none focus:border-stone-400"
          >
            <option value="all">All books</option>
            <option value="rated">Rated</option>
            <option value="needs-rating">Needs rating</option>
            <option value="strong-fit">Strong lesson fit</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Level
          </span>
          <select
            value={levelFilter}
            onChange={(event) => onLevelFilterChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 outline-none focus:border-stone-400"
          >
            <option value="all">All levels</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Lesson Fit
          </span>
          <select
            value={lessonFitFilter}
            onChange={(event) => onLessonFitFilterChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 outline-none focus:border-stone-400"
          >
            <option value="all">All</option>
            <option value="5">5/5</option>
            <option value="4">4/5</option>
            <option value="3">3/5</option>
            <option value="2">2/5</option>
            <option value="1">1/5</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Sort
          </span>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 outline-none focus:border-stone-400"
          >
            <option value="student-use-desc">Best lesson fit</option>
            <option value="recent">Recently added</option>
            <option value="title">Title</option>
          </select>
        </label>
      </div>
    </section>
  );
}
