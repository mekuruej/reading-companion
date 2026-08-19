import Link from "next/link";

type CuriosityBookContextCardProps = {
  bookTitle: string;
  bookCover: string;
  contextLine?: string;
  bookHubHref: string;
  vocabListHref: string;
};

export default function CuriosityBookContextCard({
  bookTitle,
  bookCover,
  contextLine,
  bookHubHref,
  vocabListHref,
}: CuriosityBookContextCardProps) {
  return (
    <>
      <Link
        href={bookHubHref}
        className="mb-2 inline-flex text-sm font-medium text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline"
      >
        ← Back to Book Hub
      </Link>

      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-2.5 shadow-sm sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={bookHubHref}
          className="flex min-w-0 items-center gap-3 rounded-lg text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400"
          title={`Go to ${bookTitle} Book Hub`}
        >
          {bookCover ? (
            <img
              src={bookCover}
              alt={`Go to ${bookTitle} Book Hub`}
              className="h-14 w-10 shrink-0 rounded-md object-cover shadow-sm"
            />
          ) : null}

          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-stone-500">
              For book
            </p>
            <div className="truncate text-sm font-semibold text-stone-900 hover:text-stone-700">
              {bookTitle}
            </div>
            {contextLine ? (
              <p className="mt-0.5 truncate text-xs font-medium text-stone-500">
                {contextLine}
              </p>
            ) : null}
          </div>
        </Link>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link
            href={vocabListHref}
            className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            Vocab List
          </Link>
        </div>
      </div>
    </>
  );
}
