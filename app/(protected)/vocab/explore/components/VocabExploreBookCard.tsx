type VocabExploreBookCardProps = {
  bookTitle: string;
  bookCover?: string | null;
  onOpenBookHub: () => void;
  onOpenVocabList: () => void;
};

export default function VocabExploreBookCard({
  bookTitle,
  bookCover,
  onOpenBookHub,
  onOpenVocabList,
}: VocabExploreBookCardProps) {
  return (
    <div className="mb-6 mt-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onOpenBookHub}
        className="flex min-w-0 items-center gap-3 rounded-xl text-left transition hover:opacity-90"
      >
        {bookCover ? (
          <img
            src={bookCover}
            alt=""
            className="h-20 w-14 shrink-0 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[10px] font-semibold text-stone-400">
            No cover
          </div>
        )}

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
            Word history inside this book
          </p>

          <h2 className="mt-1 truncate text-lg font-bold text-stone-900">
            {bookTitle}
          </h2>
        </div>
      </button>

      <div className="flex shrink-0 flex-wrap gap-2">
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
  );
}