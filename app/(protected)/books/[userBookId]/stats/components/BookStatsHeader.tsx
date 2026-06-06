type BookStatsHeaderProps = {
  bookTitle: string | null;
  bookTitleReading?: string | null;
  coverUrl?: string | null;
  onOpenBookHub: () => void;
  onOpenVocabList: () => void;
};

export default function BookStatsHeader({
  bookTitle,
  bookTitleReading,
  coverUrl,
  onOpenBookHub,
  onOpenVocabList,
}: BookStatsHeaderProps) {
  const displayTitle = bookTitle ?? "Untitled book";

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onOpenBookHub}
          className="flex min-w-0 items-center gap-4 rounded-xl text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400"
          title={`Go to ${displayTitle} Book Hub`}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`${displayTitle} cover`}
              className="h-32 w-24 shrink-0 rounded-xl border border-stone-200 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-xs text-stone-400 shadow-sm">
              No cover
            </div>
          )}

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Book Stats
            </p>

            <h1 className="mt-1 truncate text-xl font-black tracking-tight text-stone-900 sm:text-2xl">
              {displayTitle}
            </h1>

            {bookTitleReading ? (
              <p className="mt-1 truncate text-sm text-stone-500">
                {bookTitleReading}
              </p>
            ) : null}

            <p className="mt-2 hidden text-sm text-stone-600 sm:block">
              Reading history, time, pace, vocabulary, and difficulty.
            </p>
          </div>
        </button>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onOpenVocabList}
            className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            Vocab List
          </button>

          <button
            type="button"
            onClick={onOpenBookHub}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Book Hub
          </button>
        </div>
      </div>
    </section>
  );
}