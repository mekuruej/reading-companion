import { displayBookTitle } from "@/lib/books/bookIdentity";

type LibraryBookCardBook = {
  title: string;
  language_code?: string | null;
  cover_url: string | null;
};

type LibraryBookCardRow = {
  id: string;
  isTeachingOnly?: boolean;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  books: LibraryBookCardBook | null;
};

type LibraryBookCardStats = {
  progressPercent: number | null;
  furthestPage: number | null;
  lastEngagedAt: string | null;
};

type LibraryBookCardProps = {
  row: LibraryBookCardRow;
  stats: LibraryBookCardStats | undefined;
  href: string;
  formatRelativeDate: (value: string) => string;
  secondaryActionHref?: string | null;
  secondaryActionLabel?: string;
};

export default function LibraryBookCard({
  row,
  stats,
  href,
  formatRelativeDate,
  secondaryActionHref = null,
  secondaryActionLabel = "Open",
}: LibraryBookCardProps) {
  const book = row.books;
  if (!book) return null;
  const displayTitle = displayBookTitle(book);

  return (
    <li className="flex flex-col items-center rounded-lg p-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/40">
      <a
        href={href}
        onClick={(event) => event.stopPropagation()}
        className="block"
      >
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`${displayTitle} cover`}
            className="h-48 w-32 rounded-md object-cover shadow-md"
          />
        ) : (
          <div className="flex h-48 w-32 items-center justify-center rounded-md bg-gray-200 text-sm text-gray-400">
            No cover
          </div>
        )}
      </a>

      <a
        href={href}
        onClick={(event) => event.stopPropagation()}
        className="mt-2 text-center text-sm font-medium underline hover:text-blue-700"
      >
        {displayTitle}
      </a>

      {row.isTeachingOnly ? (
        <div className="mt-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-sky-700">
          Teaching Only
        </div>
      ) : null}

      <div className="mt-2 w-full text-center">
        {row.finished_at ? (
          <div className="space-y-1 text-[11px] text-gray-500">
            {row.started_at ? (
              <div>Started: {new Date(row.started_at).toLocaleDateString()}</div>
            ) : null}
            <div>Finished: {new Date(row.finished_at).toLocaleDateString()}</div>
          </div>
        ) : row.dnf_at ? (
          <div className="text-[11px] text-gray-400">
            DNF: {new Date(row.dnf_at).toLocaleDateString()}
          </div>
        ) : row.started_at ? (
          <div className="space-y-1">
            <div className="text-[11px] text-gray-600">
              {stats?.progressPercent != null && stats?.furthestPage != null
                ? `${stats.progressPercent}% · p.${stats.furthestPage}`
                : "In progress"}
            </div>

            <div className="mx-auto h-3 w-20 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-gray-700 transition-all"
                style={{
                  width:
                    stats?.progressPercent != null
                      ? `${stats.progressPercent}%`
                      : "8%",
                }}
              />
            </div>

            {stats?.lastEngagedAt ? (
              <div className="mt-1 text-[10px] text-gray-500">
                Last engaged with {formatRelativeDate(stats.lastEngagedAt)}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-[11px] text-gray-400">Not started</div>
        )}
      </div>

      {secondaryActionHref ? (
        <a
          href={secondaryActionHref}
          onClick={(event) => event.stopPropagation()}
          className="mt-3 rounded-full border border-amber-600 bg-amber-50 px-3 py-1.5 text-center text-xs font-semibold text-amber-800 hover:bg-amber-100"
        >
          {secondaryActionLabel}
        </a>
      ) : null}
    </li>
  );
}
