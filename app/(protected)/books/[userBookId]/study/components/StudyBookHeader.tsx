type StudyBookHeaderProps = {
  bookTitle: string;
  bookCover: string;
  onOpenBookHub: () => void;
  onOpenVocabList: () => void;
};

export default function StudyBookHeader({
  bookTitle,
  bookCover,
  onOpenBookHub,
  onOpenVocabList,
}: StudyBookHeaderProps) {
  return (
    <div className="mb-4 mt-4 flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <button
        type="button"
        onClick={onOpenBookHub}
        className="flex min-w-0 items-center gap-4 rounded-xl text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400"
        title={`Go to ${bookTitle || "this book"} Book Hub`}
      >
        {bookCover ? (
          <img
            src={bookCover}
            alt={`Go to ${bookTitle || "this book"} Book Hub`}
            className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
          />
        ) : null}

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            For book
          </p>

          <div className="truncate text-base font-semibold text-stone-900 hover:text-stone-700">
            {bookTitle || "Book Flashcards"}
          </div>

          <p className="mt-1 text-sm font-medium text-stone-500">
            Review this book&apos;s saved words.
          </p>
        </div>
      </button>

      <div className="flex flex-wrap gap-2 sm:justify-end"> <button type="button" onClick={onOpenVocabList} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100" > Vocab List </button> <button type="button" onClick={onOpenBookHub} className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800" > Book Hub </button> </div>
    </div>
  );
}
