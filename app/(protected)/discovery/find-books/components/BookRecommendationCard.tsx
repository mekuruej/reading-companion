import Link from "next/link";
import RatingStars from "./RatingStars";
import ReaderSignalCard from "./ReaderSignalCard";

type BookRatingSignal = {
  id: string;
  readerLevel: string | null;
  readerAdvice: string | null;
  difficultyRating: number | null;
  entertainmentRating: number | null;
};

type BookRecommendation = {
  bookId: string;
  coverUrl: string | null;
  bookType: string | null;
  title: string;
  author: string | null;
  averageDifficultyRating: number | null;
  averageEntertainmentRating: number | null;
  signals: BookRatingSignal[];
};

type BookRecommendationCardProps = {
  book: BookRecommendation;
  userBookId?: string;
  showAverageRatings: boolean;
  readerCountLabel: string;
  bookTypeLabel: (value: string | null | undefined) => string;
  formatReaderLevel: (value: string | null | undefined) => string;
  formatValue: (value: number) => string;
};

export default function BookRecommendationCard({
  book,
  userBookId,
  showAverageRatings,
  readerCountLabel,
  bookTypeLabel,
  formatReaderLevel,
  formatValue,
}: BookRecommendationCardProps) {
  return (
    <article className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[104px_minmax(0,1fr)]">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt=""
            className="h-36 w-24 rounded-xl object-cover shadow-sm"
          />
        ) : (
          <div className="h-36 w-24 rounded-xl bg-slate-200" />
        )}

        <div className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {bookTypeLabel(book.bookType)}
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {book.title}
              </h2>

              {book.author ? (
                <p className="mt-1 text-sm text-slate-500">
                  {book.author}
                </p>
              ) : null}

              {userBookId ? (
                <Link
                  href={`/books/${userBookId}`}
                  className="mt-3 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  In your library · Open Book Hub →
                </Link>
              ) : null}
            </div>

            {showAverageRatings ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:w-[430px]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Average from {readerCountLabel}
                  </span>
                </div>

                <div className="grid min-w-[180px] gap-2 sm:grid-cols-2">
                  <RatingStars
                    label={`${bookTypeLabel(book.bookType)} Difficulty`}
                    value={book.averageDifficultyRating}
                    tone="sky"
                    formatValue={formatValue}
                  />

                  <RatingStars
                    label="Entertainment"
                    value={book.averageEntertainmentRating}
                    tone="amber"
                    formatValue={formatValue}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2">
            {book.signals.map((signal) => (
              <ReaderSignalCard
                key={signal.id}
                signal={signal}
                bookType={book.bookType}
                bookTypeLabel={bookTypeLabel}
                formatReaderLevel={formatReaderLevel}
                formatValue={formatValue}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}