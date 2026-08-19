import Link from "next/link";

type AddWordBookContextCardProps = {
  bookTitle: string;
  bookCover: string;
  contextLine?: string;
  bookHubHref: string;
  vocabListHref: string;
};

export default function AddWordBookContextCard({
  bookTitle,
  bookCover,
  contextLine,
  bookHubHref,
  vocabListHref,
}: AddWordBookContextCardProps) {
  return (
    <>
      <Link
        href={bookHubHref}
        className="mb-2 inline-flex text-sm font-medium text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline"
      >
        ← Back to Book Hub
      </Link>

    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <Link
        href={bookHubHref}
        className="flex min-w-0 items-center gap-4 rounded-xl text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400"
        title={`Go to ${bookTitle} Book Hub`}
      >
        {bookCover ? (
          <img
            src={bookCover}
            alt={`Go to ${bookTitle} Book Hub`}
            className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
          />
        ) : null}

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            For book
          </p>
          <div className="truncate text-base font-semibold text-stone-900 hover:text-stone-700">
            {bookTitle}
          </div>
          {contextLine ? (
            <p className="mt-1 text-sm font-medium text-stone-500">
              {contextLine}
            </p>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Link
          href={vocabListHref}
          className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
        >
          Vocab List
        </Link>

      </div>
    </div>
    </>
  );
}
