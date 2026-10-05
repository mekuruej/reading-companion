import { BOOK_TYPE_OPTIONS } from "@/lib/books/bookTypes";

type LibraryViewMode = "cover" | "list";

type LibrarySortMode =
  | "status"
  | "title"
  | "last_engaged"
  | "rating_high"
  | "difficulty_low";

type LibraryViewControlsProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  viewMode: LibraryViewMode;
  onViewModeChange: (value: LibraryViewMode) => void;
  bookTypeFilter: string;
  onBookTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortMode: LibrarySortMode;
  onSortModeChange: (value: LibrarySortMode) => void;
};

export default function LibraryViewControls({
  searchQuery,
  onSearchQueryChange,
  viewMode,
  onViewModeChange,
  bookTypeFilter,
  onBookTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
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
        <input
          type="search"
          aria-label="Search title or author"
          placeholder="Search title or author"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="min-w-[220px] rounded-lg border bg-white px-3 py-2 text-sm text-stone-700"
        />
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
          <option value="last_engaged">Recently Engaged With</option>
          <option value="difficulty_low">Easiest First</option>
          <option value="rating_high">Highest Rated</option>
        </select>
      </div>
    </div>
  );
}
