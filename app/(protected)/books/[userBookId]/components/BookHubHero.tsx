import { getBookIdentity } from "@/lib/books/bookIdentity";

type BookHubHeroBook = {
  title: string;
  title_reading: string | null;
  author: string | null;
  author_english_name?: string | null;
  author_reading: string | null;
  cover_url: string | null;
  language_code?: string | null;
};

type BookHubHeroProps = {
  book: BookHubHeroBook;
  displayedCoverUrl: string | null;
  bookHubContextLabel: string;
  isViewingStudentBookHub: boolean;
  onAboutBook?: () => void;
};

export default function BookHubHero({
  book,
  displayedCoverUrl,
  bookHubContextLabel,
  isViewingStudentBookHub,
  onAboutBook,
}: BookHubHeroProps) {
  const bookIdentity = getBookIdentity(book);

  return (
    <>
      <div className="w-[140px] shrink-0 md:w-[150px]">
        {displayedCoverUrl ? (
          <img
            src={displayedCoverUrl}
            alt={`${bookIdentity.title} cover`}
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
              {bookIdentity.title}
            </h1>

            {bookIdentity.titleReading ? (
              <div className="mt-1 text-sm font-medium text-stone-500">
                {bookIdentity.titleReading}
              </div>
            ) : null}
          </div>

          {bookIdentity.author ? (
            <div>
              <div className="text-xl font-semibold text-stone-900 md:text-2xl">
                {bookIdentity.author}
              </div>

              {bookIdentity.authorReading ? (
                <div className="mt-1 text-sm font-medium text-stone-500">
                  {bookIdentity.authorReading}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {onAboutBook ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAboutBook}
              className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-bold text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-white hover:text-stone-950"
            >
              About this book -&gt;
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
