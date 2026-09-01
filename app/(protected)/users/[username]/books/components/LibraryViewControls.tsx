import { BOOK_TYPE_OPTIONS } from "@/lib/books/bookTypes";
import {
  TEACHING_DIFFICULTIES,
  TEACHING_STATUSES,
  teachingDifficultyLabel,
  teachingStatusLabel,
} from "@/lib/teachingStatus";

type LibraryViewMode = "cover" | "list";

type LibrarySortMode =
  | "status"
  | "title"
  | "last_read"
  | "last_engaged"
  | "rating_high"
  | "rating_low"
  | "difficulty_high"
  | "difficulty_low"
  | "pace_fast"
  | "pace_slow";

type LibraryViewControlsProps = {
  viewMode: LibraryViewMode;
  onViewModeChange: (value: LibraryViewMode) => void;
  bookTypeFilter: string;
  onBookTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  showTeachingFilters: boolean;
  teachingStatusFilter: string;
  onTeachingStatusFilterChange: (value: string) => void;
  teachingDifficultyFilter: string;
  onTeachingDifficultyFilterChange: (value: string) => void;
  sortMode: LibrarySortMode;
  onSortModeChange: (value: LibrarySortMode) => void;
};

export default function LibraryViewControls({
  viewMode,
  onViewModeChange,
  bookTypeFilter,
  onBookTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  showTeachingFilters,
  teachingStatusFilter,
  onTeachingStatusFilterChange,
  teachingDifficultyFilter,
  onTeachingDifficultyFilterChange,
  sortMode,
  onSortModeChange,
}: LibraryViewControlsProps) {
  const hasActiveTeachingFilter =
    teachingStatusFilter !== "all" || teachingDifficultyFilter !== "all";

  return (
    <div className="mb-4 space-y-3">
      <div className="inline-flex overflow-hidden rounded-lg border bg-white text-sm">
        <button
          type="button"
          onClick={() => onViewModeChange("cover")}
          className={`px-3 py-1 ${
            viewMode === "cover" ? "bg-stone-800 text-white" : "text-stone-600"
          }`}
        >
          Cover
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange("list")}
          className={`px-3 py-1 ${
            viewMode === "list" ? "bg-stone-800 text-white" : "text-stone-600"
          }`}
        >
          List
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={bookTypeFilter}
          onChange={(event) => onBookTypeFilterChange(event.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm text-stone-700"
        >
          <option value="all">Book Type</option>
          {BOOK_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm text-stone-700"
        >
          <option value="all">All Books</option>
          <option value="reading">Currently Reading</option>
          <option value="want_to_read">Want to Read</option>
          {showTeachingFilters ? (
            <option value="currently_teaching">Currently Teaching</option>
          ) : null}
          <option value="finished">Finished</option>
          <option value="dnf">DNF</option>
        </select>

        <select
          value={sortMode}
          onChange={(event) =>
            onSortModeChange(event.target.value as LibrarySortMode)
          }
          className="rounded-lg border bg-white px-3 py-2 text-sm text-stone-700"
        >
          <option value="status">Book Status</option>
          <option value="title">Title</option>
          <option value="last_read">Recently Finished</option>
          <option value="last_engaged">Last Engaged with</option>
          <option value="rating_high">High to Low Rating</option>
          <option value="rating_low">Low to High Rating</option>
          <option value="difficulty_high">High to Low Difficulty</option>
          <option value="difficulty_low">Low to High Difficulty</option>
          <option value="pace_fast">Fastest to Slowest Pace</option>
          <option value="pace_slow">Slowest to Fastest Pace</option>
        </select>
      </div>

      {showTeachingFilters ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-3">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-sky-800">
            Teaching filters
          </div>

          <select
            value={teachingStatusFilter}
            onChange={(event) => onTeachingStatusFilterChange(event.target.value)}
            className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-stone-700"
          >
            <option value="all">Teaching Status: Any</option>
            {TEACHING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {teachingStatusLabel(status)}
              </option>
            ))}
            <option value="not_assessed">Teaching Status: Not Assessed</option>
          </select>

          <select
            value={teachingDifficultyFilter}
            onChange={(event) => onTeachingDifficultyFilterChange(event.target.value)}
            className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-stone-700"
          >
            <option value="all">Teaching Difficulty: Any</option>
            {TEACHING_DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {teachingDifficultyLabel(difficulty)}
              </option>
            ))}
            <option value="not_assessed">Teaching Difficulty: Not Assessed</option>
          </select>

          {hasActiveTeachingFilter ? (
            <button
              type="button"
              onClick={() => {
                onTeachingStatusFilterChange("all");
                onTeachingDifficultyFilterChange("all");
              }}
              className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
            >
              Clear teaching filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
