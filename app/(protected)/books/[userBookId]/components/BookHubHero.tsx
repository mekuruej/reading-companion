import Link from "next/link";

type BookHubHeroBook = {
  title: string;
  title_reading: string | null;
  author: string | null;
  author_reading: string | null;
  cover_url: string | null;
};

type BookHubHeroProps = {
  book: BookHubHeroBook;
  displayedCoverUrl: string | null;
  bookHubContextLabel: string;
  isViewingStudentBookHub: boolean;
  canOpenTeacherSnapshot: boolean;
  teacherSnapshotHref: string;
};

export default function BookHubHero({
  book,
  displayedCoverUrl,
  bookHubContextLabel,
  isViewingStudentBookHub,
  canOpenTeacherSnapshot,
  teacherSnapshotHref,
}: BookHubHeroProps) {
  return (
    <>
      <div className="w-[140px] shrink-0 md:w-[150px]">
        {displayedCoverUrl ? (
          <img
            src={displayedCoverUrl}
            alt={`${book.title} cover`}
            className="w-full rounded-2xl border border-stone-200 object-cover shadow-sm"
          />
        ) : (
          <div className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-sm text-stone-400">
            No cover
          </div>
        )}

        <div
          className={`mt-3 inline-flex w-full justify-center rounded-full border px-3 py-1 text-center text-xs font-semibold ${
            isViewingStudentBookHub
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-stone-200 bg-stone-50 text-stone-600"
          }`}
        >
          {bookHubContextLabel}
        </div>
      </div>

      <div className="min-w-0">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
              {book.title}
            </h1>

            {book.title_reading ? (
              <div className="mt-1 text-sm font-medium text-stone-500">
                {book.title_reading}
              </div>
            ) : null}
          </div>

          {book.author ? (
            <div>
              <div className="text-xl font-semibold text-stone-900 md:text-2xl">
                {book.author}
              </div>

              {book.author_reading ? (
                <div className="mt-1 text-sm font-medium text-stone-500">
                  {book.author_reading}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {canOpenTeacherSnapshot ? (
          <div className="mt-4">
            <Link
              href={teacherSnapshotHref}
              className="inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-purple-800"
            >
              Teacher Snapshot
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}
