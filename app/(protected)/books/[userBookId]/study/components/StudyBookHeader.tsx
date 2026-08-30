import Link from "next/link";

type StudyBookHeaderProps = {
  bookTitle: string;
  bookCover: string;
  bookHubHref: string;
  backHref?: string;
  backLabel?: string;
  vocabListHref: string;
};

export default function StudyBookHeader({
  bookTitle,
  bookCover,
  bookHubHref,
  backHref = bookHubHref,
  backLabel = "Back to Book Hub",
  vocabListHref,
}: StudyBookHeaderProps) {
  return (
    <div className="w-full max-w-3xl">
      <Link
        href={backHref}
        className="mb-2 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        ← {backLabel}
      </Link>

    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <Link
        href={bookHubHref}
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

          <p className="mt-2 text-sm font-semibold leading-6 text-blue-700">
            Recommendation: make a small pool with filters, then work through all study modes.
          </p>
        </div>
      </Link>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Link
          href={vocabListHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
        >
          Vocab List
        </Link>
      </div>
    </div>
    </div>
  );
}
