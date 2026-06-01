// Find Your Next Book
//
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
};

type RecommendationSignalRow = {
  id: string;
  reader_level: string | null;
  book_type: string | null;
  difficulty_rating: number | null;
  entertainment_rating: number | null;
  reader_advice: string | null;
  updated_at: string | null;
  books: BookMeta | BookMeta[] | null;
};

type BookRatingSignal = {
  id: string;
  readerLevel: string | null;
  entertainmentRating: number | null;
  difficultyRating: number | null;
  readerAdvice: string | null;
  updatedAt: string | null;
};

type RatedBookGroup = {
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  bookType: string | null;
  signals: BookRatingSignal[];
  latestSignalAt: string | null;
  averageEntertainmentRating: number | null;
  averageDifficultyRating: number | null;
};

type SortMode = "recent" | "rating" | "rating_low" | "ease" | "difficulty";

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverage(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(1);
}

function firstBook(row: RecommendationSignalRow) {
  if (Array.isArray(row.books)) return row.books[0] ?? null;
  return row.books ?? null;
}

function cleanReaderAdvice(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  return cleaned ? cleaned.slice(0, 120) : null;
}

function bookTypeLabel(value: string | null | undefined) {
  if (!value) return "Book";
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatReaderLevel(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "Reader level not shared";
  const levelMatch = cleaned.match(/^Level\s+(\d+)$/i) ?? cleaned.match(/^(\d+)$/);
  const levelNumber = levelMatch?.[1];

  if (levelNumber) {
    const levelDescriptions: Record<string, string> = {
      "1": "pre-N5",
      "2": "early N5",
      "3": "solid N5",
      "4": "lower N4",
      "5": "upper N4",
      "6": "lower N3",
      "7": "upper N3",
      "8": "lower N2",
      "9": "lower N1",
      "10": "upper N1",
    };

    const description = levelDescriptions[levelNumber];
    return description ? `Level ${levelNumber} (${description})` : `Level ${levelNumber}`;
  }

  return cleaned;
}

function RatingStars({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "amber" | "sky";
}) {
  const safeValue =
    value == null || !Number.isFinite(value)
      ? null
      : Math.max(0, Math.min(5, value));
  const fillWidth = safeValue == null ? 0 : (safeValue / 5) * 100;
  const colorClass = tone === "amber" ? "text-amber-500" : "text-sky-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>
        <span className="text-xs font-black text-slate-700">
          {safeValue == null ? "-" : `${formatAverage(safeValue)}/5`}
        </span>
      </div>

      <div
        className="relative mt-1 inline-block whitespace-nowrap text-lg leading-none tracking-[0.08em]"
        aria-hidden="true"
      >
        <span className="text-slate-200">*****</span>
        <span
          className={`absolute inset-y-0 left-0 overflow-hidden ${colorClass}`}
          style={{ width: `${fillWidth}%` }}
        >
          *****
        </span>
      </div>
    </div>
  );
}

export default function FindBooksPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ratingRows, setRatingRows] = useState<RecommendationSignalRow[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [bookTypeFilter, setBookTypeFilter] = useState("all");
  const [readerLevelFilter, setReaderLevelFilter] = useState("all");

  useEffect(() => {
    let alive = true;

    async function loadRatedBooks() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data, error } = await supabase
          .from("book_recommendation_signals")
          .select(
            `
            id,
            reader_level,
            book_type,
            difficulty_rating,
            entertainment_rating,
            reader_advice,
            updated_at,
            books:book_id (
              id,
              title,
              author,
              cover_url,
              book_type
            )
          `
          )
          .eq("is_active", true)
          .or("difficulty_rating.not.is.null,entertainment_rating.not.is.null,reader_advice.not.is.null")
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(1000);

        if (error) throw error;
        if (!alive) return;

        const rows = (data ?? []) as RecommendationSignalRow[];
        setRatingRows(rows);
      } catch (error: any) {
        console.error("Error loading find-books recommendation signals:", error);
        if (!alive) return;
        setErrorMsg(error?.message ?? "Could not load book recommendations yet.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadRatedBooks();

    return () => {
      alive = false;
    };
  }, []);

  const bookTypeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const row of ratingRows) {
      const book = firstBook(row);
      const type = row.book_type ?? book?.book_type ?? null;
      if (type) types.add(type);
    }
    return Array.from(types).sort((a, b) =>
      bookTypeLabel(a).localeCompare(bookTypeLabel(b))
    );
  }, [ratingRows]);

  const readerLevelOptions = useMemo(() => {
    const levels = new Set<string>();
    for (const row of ratingRows) {
      const level = row.reader_level;
      if (level) levels.add(level);
    }
    return Array.from(levels).sort((a, b) =>
      formatReaderLevel(a).localeCompare(formatReaderLevel(b))
    );
  }, [ratingRows]);

  const ratedBookGroups = useMemo(() => {
    const map = new Map<string, RatedBookGroup>();

    for (const row of ratingRows) {
      const book = firstBook(row);
      if (!book?.id) continue;
      const bookType = row.book_type ?? book.book_type ?? null;
      if (bookTypeFilter !== "all" && bookType !== bookTypeFilter) continue;
      const readerLevel = row.reader_level;
      if (readerLevelFilter !== "all" && readerLevel !== readerLevelFilter) {
        continue;
      }

      const existing =
        map.get(book.id) ??
        {
          bookId: book.id,
          title: book.title ?? "Untitled book",
          author: book.author ?? null,
          coverUrl: book.cover_url ?? null,
          bookType,
          signals: [],
          latestSignalAt: null,
          averageEntertainmentRating: null,
          averageDifficultyRating: null,
        };

      existing.signals.push({
        id: row.id,
        readerLevel,
        entertainmentRating: row.entertainment_rating,
        difficultyRating: row.difficulty_rating,
        readerAdvice: cleanReaderAdvice(row.reader_advice),
        updatedAt: row.updated_at,
      });

      map.set(book.id, existing);
    }

    const groups = Array.from(map.values()).map((group) => {
      const sortedSignals = [...group.signals].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
      );

      return {
        ...group,
        signals: sortedSignals,
        latestSignalAt: sortedSignals[0]?.updatedAt ?? null,
        averageEntertainmentRating: average(
          sortedSignals
            .map((signal) => signal.entertainmentRating)
            .filter((value): value is number => value != null)
        ),
        averageDifficultyRating: average(
          sortedSignals
            .map((signal) => signal.difficultyRating)
            .filter((value): value is number => value != null)
        ),
      };
    });

    return groups.sort((a, b) => {
      if (sortMode === "ease") {
        return (a.averageDifficultyRating ?? 999) - (b.averageDifficultyRating ?? 999);
      }
      if (sortMode === "difficulty") {
        return (b.averageDifficultyRating ?? -1) - (a.averageDifficultyRating ?? -1);
      }
      if (sortMode === "rating") {
        return (b.averageEntertainmentRating ?? -1) - (a.averageEntertainmentRating ?? -1);
      }
      if (sortMode === "rating_low") {
        return (a.averageEntertainmentRating ?? 999) - (b.averageEntertainmentRating ?? 999);
      }
      return (b.latestSignalAt ?? "").localeCompare(a.latestSignalAt ?? "");
    });
  }, [ratingRows, sortMode, bookTypeFilter, readerLevelFilter]);

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/discovery" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            &larr; Discovery Hub
          </Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Discovery
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Find Your Next Book
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Search anonymous reader-fit ratings by book type, reader level, and rating direction.
            Ratings stay anonymous and are meant to help you find a better match.
          </p>
        </div>

        {errorMsg ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errorMsg}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Reader-fit filters</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Filters work together. Narrow by level and type, then sort the remaining books.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <select
                value={readerLevelFilter}
                onChange={(event) => setReaderLevelFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="all">All Reader Levels</option>
                {readerLevelOptions.map((level) => (
                  <option key={level} value={level}>
                    {formatReaderLevel(level)}
                  </option>
                ))}
              </select>

              <select
                value={bookTypeFilter}
                onChange={(event) => setBookTypeFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="all">All Book Types</option>
                {bookTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {bookTypeLabel(type)}
                  </option>
                ))}
              </select>

              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="recent">Recently Finished</option>
                <option value="rating">High to Low Entertainment</option>
                <option value="rating_low">Low to High Entertainment</option>
                <option value="difficulty">High to Low Difficulty</option>
                <option value="ease">Low to High Difficulty</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
              Loading rated books...
            </div>
          ) : ratedBookGroups.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm leading-6 text-slate-500 shadow-sm">
              No shared book ratings match these filters yet.
            </div>
          ) : (
            ratedBookGroups.map((book) => {
              const shouldShowAverageRatings = book.signals.length >= 5;

              return (
                <article
                  key={book.bookId}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
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
                        </div>

                        {shouldShowAverageRatings ? (
                          <div className="grid min-w-[180px] gap-2 sm:grid-cols-2 lg:w-[390px]">
                            <RatingStars
                              label={`Avg ${bookTypeLabel(book.bookType)} Difficulty`}
                              value={book.averageDifficultyRating}
                              tone="sky"
                            />
                            <RatingStars
                              label="Avg Entertainment"
                              value={book.averageEntertainmentRating}
                              tone="amber"
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-3">
                        {book.signals.map((signal) => (
                          <div
                            key={signal.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_390px]">
                              <div>
                                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                  Anonymous reader signal
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">
                                  {formatReaderLevel(signal.readerLevel)}
                                </div>

                                {signal.readerAdvice ? (
                                  <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-600">
                                    <span className="font-semibold text-slate-900">
                                      Advice to the reader:
                                    </span>{" "}
                                    {signal.readerAdvice}
                                  </div>
                                ) : null}
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2">
                                <RatingStars
                                  label={`${bookTypeLabel(book.bookType)} Difficulty`}
                                  value={signal.difficultyRating}
                                  tone="sky"
                                />
                                <RatingStars
                                  label="Entertainment"
                                  value={signal.entertainmentRating}
                                  tone="amber"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
