type StudyEmptyStateProps = {
  onClearFilters: () => void;
  title?: string;
  message?: string;
  showClearFilters?: boolean;
};

export default function StudyEmptyState({
  onClearFilters,
  title = "No matching flashcards",
  message = "No words match your filters (or none have been added to this book yet).",
  showClearFilters = true,
}: StudyEmptyStateProps) {
  return (
    <section className="flex w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div>
        <h1 className="text-xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
      </div>

      {showClearFilters ? (
        <div className="flex gap-2">
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Clear Filters
        </button>
      </div>
      ) : null}
    </section>
  );
}
