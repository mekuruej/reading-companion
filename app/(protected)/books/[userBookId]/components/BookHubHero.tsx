type BookHubHeroBook = {
  title: string;
  title_reading: string | null;
  author: string | null;
  author_reading: string | null;
  translator: string | null;
  translator_reading: string | null;
  cover_url: string | null;
};

type BookHubBookOption = {
  id: string;
  title: string;
};

type BookHubHeroProps = {
  book: BookHubHeroBook;
  displayedCoverUrl: string | null;
  selectedUserBookId: string;
  bookHubContextLabel: string;
  isViewingStudentBookHub: boolean;
  isTeacherContext: boolean;
  currentlyReadingBooks: BookHubBookOption[];
  otherBooks: BookHubBookOption[];
  onTeacherReview: () => void;
  onSwitchBook: (nextValue: string) => void;
};

export default function BookHubHero({
  book,
  displayedCoverUrl,
  selectedUserBookId,
  bookHubContextLabel,
  isViewingStudentBookHub,
  isTeacherContext,
  currentlyReadingBooks,
  otherBooks,
  onTeacherReview,
  onSwitchBook,
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
      </div>

      <div className="min-w-0">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
              {book.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  isViewingStudentBookHub
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-stone-200 bg-stone-50 text-stone-600"
                }`}
              >
                {bookHubContextLabel}
              </div>

              {isTeacherContext ? (
                <button
                  type="button"
                  onClick={onTeacherReview}
                  className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 transition hover:bg-violet-100"
                >
                  Teacher Review →
                </button>
              ) : null}
            </div>

            {book.title_reading ? (
              <div className="mt-1 text-lg text-stone-500 md:text-xl">
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
                <div className="mt-1 text-base text-stone-500 md:text-lg">
                  {book.author_reading}
                </div>
              ) : null}
            </div>
          ) : null}

          {book.translator ? (
            <div>
              <div className="text-base font-medium text-stone-700 md:text-lg">
                Translated by {book.translator}
              </div>

              {book.translator_reading ? (
                <div className="mt-1 text-sm text-stone-500 md:text-base">
                  {book.translator_reading}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 max-w-sm">
          <div className="mb-1 text-xs uppercase tracking-wide text-stone-500">
            Switch Book
          </div>

          <select
            value={selectedUserBookId}
            onChange={(e) => onSwitchBook(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700"
          >
            <option value="all-book-hubs">All Book Hubs</option>

            {currentlyReadingBooks.length > 0 ? (
              <optgroup label="Currently Reading">
                {currentlyReadingBooks.map((bookOption) => (
                  <option key={bookOption.id} value={bookOption.id}>
                    {bookOption.title}
                  </option>
                ))}
              </optgroup>
            ) : null}

            {otherBooks.length > 0 ? (
              <optgroup label="All Books">
                {otherBooks.map((bookOption) => (
                  <option key={bookOption.id} value={bookOption.id}>
                    {bookOption.title}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </div>
      </div>
    </>
  );
}