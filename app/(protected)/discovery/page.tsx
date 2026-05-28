// Discovery Hub
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

type UserBookRatingRow = {
  id: string;
  rating_overall: number | null;
  rating_difficulty: number | null;
  reader_level: string | null;
  finished_at: string | null;
  books: BookMeta | BookMeta[] | null;
};

type BookRatingSignal = {
  id: string;
  readerLevel: string | null;
  entertainmentRating: number | null;
  difficultyRating: number | null;
  finishedAt: string | null;
};

type RatedBookGroup = {
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  bookType: string | null;
  signals: BookRatingSignal[];
  latestFinishedAt: string | null;
  averageEntertainmentRating: number | null;
  averageDifficultyRating: number | null;
};

type SortMode = "recent" | "rating" | "rating_low" | "ease" | "difficulty";

const discoveryCards = [
  {
    title: "Dictionary",
    href: "/discovery/dictionary",
    eyebrow: "Look up words",
    description:
      "Search Japanese words, readings, meanings, kanji, and related vocabulary.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
  {
    title: "Word History",
    href: "/discovery/word-history",
    eyebrow: "Words you have met",
    description:
      "Search across words you have saved from books and see where you met them.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
  },
];

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverage(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(1);
}

function firstBook(row: UserBookRatingRow) {
  if (Array.isArray(row.books)) return row.books[0] ?? null;
  return row.books ?? null;
}

function bookTypeLabel(value: string | null | undefined) {
  if (!value) return "book";
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatReaderLevel(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "A reader";
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
    return description
      ? `A Level ${levelNumber} reader (${description})`
      : `A Level ${levelNumber} reader`;
  }

  return `A ${cleaned} reader`;
}

function bookSignalSentence(signal: BookRatingSignal, bookTypeValue: string | null) {
  const bookType = bookTypeLabel(bookTypeValue).toLowerCase();
  const reader = formatReaderLevel(signal.readerLevel);
  const difficulty =
    signal.difficultyRating != null
      ? ` thought this ${bookType} was ${formatAverage(signal.difficultyRating)} difficulty`
      : ` rated this ${bookType}`;
  const entertainment =
    signal.entertainmentRating != null
      ? ` and gave it an Entertainment Rating of ${formatAverage(signal.entertainmentRating)}/5`
      : "";

  return `${reader}${difficulty}${entertainment}.`;
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

function RatingStack({ signal }: { signal: BookRatingSignal }) {
  if (signal.difficultyRating == null && signal.entertainmentRating == null) {
    return null;
  }

  return (
    <div className="grid min-w-[170px] gap-2 sm:ml-auto sm:w-[190px]">
      <RatingStars label="Difficulty" value={signal.difficultyRating} tone="sky" />
      <RatingStars label="Entertainment" value={signal.entertainmentRating} tone="amber" />
    </div>
  );
}

export default function DiscoveryHubPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ratingRows, setRatingRows] = useState<UserBookRatingRow[]>([]);
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
          .from("user_books")
          .select(
            `
            id,
            rating_overall,
            rating_difficulty,
            reader_level,
            finished_at,
            books:book_id (
              id,
              title,
              author,
              cover_url,
              book_type
            )
          `
          )
          .or("rating_overall.not.is.null,rating_difficulty.not.is.null")
          .order("finished_at", { ascending: false, nullsFirst: false })
          .limit(1000);

        if (error) throw error;
        if (!alive) return;

        setRatingRows((data ?? []) as UserBookRatingRow[]);
      } catch (error: any) {
        console.error("Error loading discovery ratings:", error);
        if (!alive) return;
        setErrorMsg(error?.message ?? "Could not load rated books yet.");
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
      if (book?.book_type) types.add(book.book_type);
    }

    return Array.from(types).sort((a, b) =>
      bookTypeLabel(a).localeCompare(bookTypeLabel(b))
    );
  }, [ratingRows]);

  const readerLevelOptions = useMemo(() => {
    const levels = new Set<string>();

    for (const row of ratingRows) {
      if (row.reader_level) levels.add(row.reader_level);
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
      if (bookTypeFilter !== "all" && book.book_type !== bookTypeFilter) continue;
      if (readerLevelFilter !== "all" && row.reader_level !== readerLevelFilter) continue;

      const existing =
        map.get(book.id) ??
        {
          bookId: book.id,
          title: book.title ?? "Untitled book",
          author: book.author ?? null,
          coverUrl: book.cover_url ?? null,
          bookType: book.book_type ?? null,
          signals: [],
          latestFinishedAt: null,
          averageEntertainmentRating: null,
          averageDifficultyRating: null,
        };

      existing.signals.push({
        id: row.id,
        readerLevel: row.reader_level ?? null,
        entertainmentRating: row.rating_overall,
        difficultyRating: row.rating_difficulty,
        finishedAt: row.finished_at,
      });

      map.set(book.id, existing);
    }

    const groups = Array.from(map.values()).map((group) => {
      const sortedSignals = [...group.signals].sort((a, b) =>
        (b.finishedAt ?? "").localeCompare(a.finishedAt ?? "")
      );
      const latestFinishedAt = sortedSignals[0]?.finishedAt ?? null;

      return {
        ...group,
        signals: sortedSignals,
        latestFinishedAt,
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
      return (b.latestFinishedAt ?? "").localeCompare(a.latestFinishedAt ?? "");
    });
  }, [ratingRows, sortMode, bookTypeFilter, readerLevelFilter]);

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Discovery
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Discovery Hub
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Look up words, revisit your word history, and find books through
            anonymous community ratings.
          </p>
        </div>

        {errorMsg ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {discoveryCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.className}`}
            >
              <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
                {card.eyebrow}
              </div>

              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    {card.description}
                  </p>
                </div>

                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
                  &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Find Your Next Book
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Books readers rated
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Filter anonymous ratings by reader level and book type, then sort by
                  entertainment or difficulty.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
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

            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Loading rated books...</p>
              ) : ratedBookGroups.length === 0 ? (
                <p className="text-sm leading-6 text-slate-500">
                  No shared book ratings match these filters yet.
                </p>
              ) : (
                ratedBookGroups.slice(0, 8).map((book) => (
                  <div
                    key={book.bookId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex min-w-0 gap-3">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt=""
                          className="h-20 w-14 shrink-0 rounded-lg object-cover shadow-sm"
                        />
                      ) : (
                        <div className="h-20 w-14 shrink-0 rounded-lg bg-slate-200" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-950">
                          {book.title}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {book.author || bookTypeLabel(book.bookType)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {book.signals.map((signal) => (
                        <div
                          key={signal.id}
                          className="flex flex-col gap-3 rounded-xl border border-white bg-white/80 p-3 sm:flex-row sm:items-center"
                        >
                          <p className="min-w-0 flex-1 text-sm leading-6 text-slate-700">
                            {bookSignalSentence(signal, book.bookType)}
                          </p>

                          <RatingStack signal={signal} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
