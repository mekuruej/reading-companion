type LibraryReviewEmptyStateProps = {
  title?: string;
  message?: string;
  showWordSkyButton?: boolean;
  onOpenWordSky: () => void;
  onBackToStudyHub: () => void;
};

export default function LibraryReviewEmptyState({
  title = "No words are ready for Library Review yet.",
  message = "Add words from books or use Word Sky to build your practice pool.",
  showWordSkyButton = true,
  onOpenWordSky,
  onBackToStudyHub,
}: LibraryReviewEmptyStateProps) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <button
          type="button"
          onClick={onBackToStudyHub}
          className="mb-4 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Study Hub
        </button>

      <div className="w-full rounded-2xl border bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold text-gray-700">
          {title}
        </p>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          {message}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {showWordSkyButton ? (
            <button
              type="button"
              onClick={onOpenWordSky}
              className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
            >
              Open Word Sky
            </button>
          ) : null}
        </div>
      </div>
      </div>
    </main>
  );
}
