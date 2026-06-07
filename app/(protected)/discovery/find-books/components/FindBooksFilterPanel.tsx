type SortMode = "recent" | "rating" | "rating_low" | "ease" | "difficulty";

type FindBooksFilterPanelProps = {
  readerLevelFilter: string;
  bookTypeFilter: string;
  sortMode: SortMode;
  readerLevelOptions: string[];
  bookTypeOptions: string[];
  formatReaderLevel: (value: string | null | undefined) => string;
  bookTypeLabel: (value: string | null | undefined) => string;
  onReaderLevelChange: (value: string) => void;
  onBookTypeChange: (value: string) => void;
  onSortModeChange: (value: SortMode) => void;
};

export default function FindBooksFilterPanel({
  readerLevelFilter,
  bookTypeFilter,
  sortMode,
  readerLevelOptions,
  bookTypeOptions,
  formatReaderLevel,
  bookTypeLabel,
  onReaderLevelChange,
  onBookTypeChange,
  onSortModeChange,
}: FindBooksFilterPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            Reader-fit filters
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Filters work together. Narrow by level and type, then sort the remaining books.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <select
            value={readerLevelFilter}
            onChange={(event) => onReaderLevelChange(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All Reader Levels</option>

            {readerLevelOptions.map((level) => (
              <option key={level} value={level}>
                {formatReaderLevel(level)}
              </option>
            ))}
          </select>

          <select
            value={bookTypeFilter}
            onChange={(event) => onBookTypeChange(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All Book Types</option>

            {bookTypeOptions.map((type) => (
              <option key={type} value={type}>
                {bookTypeLabel(type)}
              </option>
            ))}
          </select>

          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as SortMode)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="recent">Recently Finished</option>
            <option value="rating">High to Low Entertainment</option>
            <option value="rating_low">Low to High Entertainment</option>
            <option value="difficulty">High to Low Difficulty</option>
            <option value="ease">Low to High Difficulty</option>
          </select>
        </div>
      </div>
    </section>
  );
}