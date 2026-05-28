type BookVocabContextCardProps = {
  bookTitle: string | null;
  bookCover: string | null;
  totalCount: number;
  visibleCount: number;
  onOpenBookHub: () => void;
};

// Clickable book summary card for the book-specific vocabulary list.
// page.tsx keeps the router/navigation and count calculations;
// this component only renders the visual book context card.
export default function BookVocabContextCard({
  bookTitle,
  bookCover,
  totalCount,
  visibleCount,
  onOpenBookHub,
}: BookVocabContextCardProps) {
  const displayTitle = bookTitle || "Words";
  const titleText = `Go to ${bookTitle || "this book"} Book Hub`;

  return (
    <button
      type="button"
      onClick={onOpenBookHub}
      className="flex w-full flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-left shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400 sm:flex-row sm:items-center sm:justify-between sm:p-4"
      title={titleText}
    >
      <div className="flex min-w-0 items-center gap-4">
        {bookCover ? (
          <img
            src={bookCover}
            alt={titleText}
            className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
          />
        ) : null}

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            For book
          </p>
          <div className="truncate text-base font-semibold text-stone-900 hover:text-stone-700">
            {displayTitle}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Total: {totalCount} • Showing: {visibleCount}
          </p>
        </div>
      </div>

      <span className="inline-flex w-fit rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">
        Book Hub
      </span>
    </button>
  );
}