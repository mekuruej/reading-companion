type TeacherPrepSavedItemsHeaderProps = {
  savedCount: number;
  visibleCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  pageFilter: string;
  onPageFilterChange: (value: string) => void;
  pageOptions: number[];
};

export default function TeacherPrepSavedItemsHeader({
  savedCount,
  visibleCount,
  search,
  onSearchChange,
  pageFilter,
  onPageFilterChange,
  pageOptions,
}: TeacherPrepSavedItemsHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-stone-900">Saved prep items</h2>

        {savedCount > 0 ? (
          <p className="mt-1 text-sm text-stone-500">
            Showing {visibleCount} of {savedCount} prep item
            {savedCount === 1 ? "" : "s"}.
          </p>
        ) : null}
      </div>

      {savedCount > 0 ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_140px]">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-stone-500">
              Search
            </span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Word, reading, meaning, note..."
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-stone-500">
              Page
            </span>
            <select
              value={pageFilter}
              onChange={(event) => onPageFilterChange(event.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All pages</option>
              {pageOptions.map((page) => (
                <option key={page} value={String(page)}>
                  Page {page}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}