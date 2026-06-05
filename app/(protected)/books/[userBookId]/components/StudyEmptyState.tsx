type StudyEmptyStateProps = {
  onClearFilters: () => void;
};

export default function StudyEmptyState({
  onClearFilters,
}: StudyEmptyStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
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
    </main>
  );
}