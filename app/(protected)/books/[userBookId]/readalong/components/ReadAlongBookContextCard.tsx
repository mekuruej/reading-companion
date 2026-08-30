import Link from "next/link";
import type { ReactNode } from "react";

type ReadAlongBookContextCardProps = {
  bookTitle: string;
  bookCover: string | null;
  bookHubHref: string;
  vocabListHref: string;
  timerSlot?: ReactNode;
};

// Book context/navigation card for the Read Along page.
// page.tsx still owns route construction and decides when book context exists;
// this component only renders the book summary and navigation buttons.
export default function ReadAlongBookContextCard({
  bookTitle,
  bookCover,
  bookHubHref,
  vocabListHref,
  timerSlot,
}: ReadAlongBookContextCardProps) {
  return (
    <>
      <Link
        href={bookHubHref}
        className="mb-2 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        ← Back to Book Hub
      </Link>

      <div className="mb-4 grid gap-2 rounded-xl border border-stone-200 bg-white p-2.5 shadow-sm sm:mb-5 lg:grid-cols-[minmax(16rem,1fr)_auto_minmax(8rem,1fr)] lg:items-center">
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
          </div>
        </Link>

        {timerSlot ? (
          <div className="min-w-0 lg:justify-self-center">
            {timerSlot}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 lg:justify-end">
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
