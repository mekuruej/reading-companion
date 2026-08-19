import Link from "next/link";

type BookStatsHeaderProps = {
  bookTitle: string | null;
  bookTitleReading?: string | null;
  author?: string | null;
  authorReading?: string | null;
  coverUrl?: string | null;
  statusLabel?: string | null;
  languageLabel?: string | null;
  formatLabel?: string | null;
  bookHubHref: string;
  description?: string;
};

export default function BookStatsHeader({
  bookTitle,
  bookTitleReading,
  author,
  authorReading,
  coverUrl,
  statusLabel,
  languageLabel,
  formatLabel,
  bookHubHref,
  description = "Reading history, time, pace, and difficulty.",
}: BookStatsHeaderProps) {
  const displayTitle = bookTitle ?? "Untitled book";
  const metadataPills = [statusLabel, languageLabel, formatLabel].filter(
    (value): value is string => Boolean(value?.trim())
  );

  return (
    <>
      <Link
        href={bookHubHref}
        className="mb-2 inline-flex text-sm font-medium text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline"
      >
        ← Back to Book Hub
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-sky-100 via-amber-50 to-emerald-100 p-7 md:p-10">
          <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
            <Link
              href={bookHubHref}
              className="w-40 rounded-[1.8rem] text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400 md:w-56"
              title={`Go to ${displayTitle} Book Hub`}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={`${displayTitle} cover`}
                  className="aspect-[2/3] w-full rounded-[1.8rem] border-[6px] border-white object-cover shadow-xl"
                />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center rounded-[1.8rem] border-[6px] border-white bg-stone-950 text-4xl font-black text-white shadow-xl">
                  No cover
                </div>
              )}
            </Link>

            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/80 px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-stone-600 shadow-sm">
                  Book Stats
                </span>
                <span className="rounded-full bg-stone-950 px-4 py-1.5 text-xs font-black text-white shadow-sm">
                  Private View
                </span>
              </div>

              <h1 className="text-5xl font-black leading-none text-stone-950 md:text-7xl">
                {displayTitle}
              </h1>

              {bookTitleReading ? (
                <p className="mt-2 text-sm font-semibold text-stone-600 md:text-base">
                  {bookTitleReading}
                </p>
              ) : null}

              {author ? (
                <div className="mt-4">
                  <p className="text-xl font-black text-stone-900 md:text-2xl">
                    {author}
                  </p>
                  {authorReading ? (
                    <p className="mt-1 text-sm font-semibold text-stone-600">
                      {authorReading}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-stone-700 md:text-lg md:leading-8">
                {description}
              </p>

              {metadataPills.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {metadataPills.map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full bg-white/75 px-4 py-2 text-sm font-black text-stone-700 shadow-sm"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
        </div>
      </div>
    </section>
    </>
  );
}
