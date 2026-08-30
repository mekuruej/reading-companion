type LibraryReviewFullAccessLockedStateProps = {
  message: string;
  onBackToStudyHub: () => void;
  onViewReadingStats: () => void;
};

export default function LibraryReviewFullAccessLockedState({
  message,
  onBackToStudyHub,
  onViewReadingStats,
}: LibraryReviewFullAccessLockedStateProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onBackToStudyHub}
          className="mb-4 inline-flex text-sm font-semibold text-stone-500 hover:text-stone-950"
        >
          ← Back to Study Hub
        </button>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
            Full access feature
          </p>

          <h1 className="mt-2 text-2xl font-black text-stone-950">
            Library Review uses saved vocabulary
          </h1>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message}
          </p>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            Your saved vocabulary and color progress are kept safe. Library Review is available
            with full Mekuru access.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onViewReadingStats}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              View Reading Stats
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
