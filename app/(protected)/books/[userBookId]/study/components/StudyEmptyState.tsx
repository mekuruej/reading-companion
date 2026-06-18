type StudyEmptyStateProps = {
  onClearFilters: () => void;
};

export default function StudyEmptyState({
  onClearFilters,
}: StudyEmptyStateProps) {
  return (
    <section className="flex w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <p>No words match your filters (or none have been added to this book yet).</p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Clear Filters
        </button>
      </div>
    </section>
  );
}
