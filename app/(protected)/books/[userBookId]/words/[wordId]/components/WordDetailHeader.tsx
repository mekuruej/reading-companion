import Link from "next/link";

type WordDetailHeaderProps = {
  bookTitle: string;
  bookCover: string | null;
  chapter: string;
  pageNumber: number | null;
  bookHubHref: string;
  vocabListHref: string;
};

export default function WordDetailHeader({
  bookTitle,
  bookCover,
  chapter,
  pageNumber,
  bookHubHref,
  vocabListHref,
}: WordDetailHeaderProps) {
  return (
    <>
      <Link
        href={vocabListHref}
        className="mb-4 inline-flex text-sm font-semibold text-stone-500 hover:text-stone-950"
      >
        ← Back to Vocab List
      </Link>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
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
              {bookTitle || "Book"}
            </div>
            <p className="mt-1 truncate text-sm text-stone-500">
              {chapter ? chapter : null}
              {pageNumber != null ? ` • p. ${pageNumber}` : null}
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link
            href={vocabListHref}
            className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            Vocab List
          </Link>

          <Link
            href={bookHubHref}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Book Hub
          </Link>
        </div>
      </div>
    </>
  );
}
