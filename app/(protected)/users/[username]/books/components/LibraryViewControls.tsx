import { BOOK_TYPE_OPTIONS } from "@/lib/books/bookTypes";

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
  sortMode: LibrarySortMode;
  onSortModeChange: (value: LibrarySortMode) => void;
};

export default function LibraryViewControls({
  viewMode,
  onViewModeChange,
  bookTypeFilter,
  onBookTypeFilterChange,
  sortMode,
  onSortModeChange,
}: LibraryViewControlsProps) {
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
    </div>
  );
}
