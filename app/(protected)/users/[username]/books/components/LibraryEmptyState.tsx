type LibraryEmptyStateProps = {
  message?: string;
  onAddBook?: () => void;
  showJapaneseLearningDiscovery?: boolean;
  onLearnJapaneseLearning?: () => void;
};

export default function LibraryEmptyState({
  message = "No books yet.",
  onAddBook,
  showJapaneseLearningDiscovery = false,
  onLearnJapaneseLearning,
}: LibraryEmptyStateProps) {
  return (
    <section className="mt-8 max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        Empty Library
      </p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">{message}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Add your first book to start tracking reading, notes, history, and progress.
      </p>

      {onAddBook ? (
        <button
          type="button"
          onClick={onAddBook}
          className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
        >
          Add Book
        </button>
      ) : null}

      {showJapaneseLearningDiscovery ? (
        <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3">
          <p className="text-sm font-black text-slate-950">Reading Japanese?</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            MEKURU also has extra tools for Japanese books, including Follow-Along,
            saved vocabulary, and study tools. You'll need a Japanese book in your
            Library to use the book-based learning tools.
          </p>
          {onLearnJapaneseLearning ? (
            <button
              type="button"
              onClick={onLearnJapaneseLearning}
              className="mt-3 rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-black text-violet-900 shadow-sm transition hover:bg-violet-100"
            >
              Learn about Japanese Learning
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
