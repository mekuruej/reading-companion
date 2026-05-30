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
  user_id: string | null;
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
    title: "Find Your Next Book",
    href: "/discovery/find-books",
    eyebrow: "Reader-fit search",
    description:
      "Filter anonymous book ratings by learner level, book type, entertainment, and difficulty.",
    className: "border-violet-200 bg-violet-50 text-violet-950",
  },
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

function effectiveReaderLevel(
  row: UserBookRatingRow,
  profileLevelsByUserId: Record<string, string | null>
) {
  return row.reader_level ?? (row.user_id ? profileLevelsByUserId[row.user_id] ?? null : null);
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

function HubDifficultyRating({
  signal,
  bookType,
}: {
  signal: BookRatingSignal;
  bookType: string | null;
}) {
  if (signal.difficultyRating == null) {
    return null;
  }

  const label = `${bookTypeLabel(bookType)} Difficulty`;

  return (
    <div className="mt-2 w-full">
      <RatingStars label={label} value={signal.difficultyRating} tone="sky" />
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
  const [profileLevelsByUserId, setProfileLevelsByUserId] = useState<Record<string, string | null>>({});

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
            user_id,
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

        const rows = (data ?? []) as UserBookRatingRow[];
        setRatingRows(rows);

        const userIds = Array.from(
          new Set(
            rows
              .map((row) => row.user_id)
              .filter((userId): userId is string => !!userId)
          )
        );

        if (userIds.length === 0) {
          setProfileLevelsByUserId({});
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, level")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error loading discovery profile levels:", profilesError);
          if (alive) setProfileLevelsByUserId({});
          return;
        }

        if (!alive) return;

        setProfileLevelsByUserId(
          Object.fromEntries(
            (profiles ?? []).map((profile) => [
              profile.id as string,
              (profile.level as string | null) ?? null,
            ])
          )
        );
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
      const level = effectiveReaderLevel(row, profileLevelsByUserId);
      if (level) levels.add(level);
    }

    return Array.from(levels).sort((a, b) =>
      formatReaderLevel(a).localeCompare(formatReaderLevel(b))
    );
  }, [ratingRows, profileLevelsByUserId]);

  const ratedBookGroups = useMemo(() => {
    const map = new Map<string, RatedBookGroup>();

    for (const row of ratingRows) {
      const book = firstBook(row);
      if (!book?.id) continue;
      if (bookTypeFilter !== "all" && book.book_type !== bookTypeFilter) continue;
      const readerLevel = effectiveReaderLevel(row, profileLevelsByUserId);
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
          bookType: book.book_type ?? null,
          signals: [],
          latestFinishedAt: null,
          averageEntertainmentRating: null,
          averageDifficultyRating: null,
        };

      existing.signals.push({
        id: row.id,
        readerLevel,
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
  }, [ratingRows, sortMode, bookTypeFilter, readerLevelFilter, profileLevelsByUserId]);

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

        <div className="grid gap-4 md:grid-cols-3">
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
                  Recently rated books
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  A quick peek at reader-fit signals. Open the full page to filter and compare.
                </p>
              </div>

              <Link
                href="/discovery/find-books"
                className="inline-flex rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-black"
              >
                Open Find Your Next Book
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading rated books...</p>
              ) : ratedBookGroups.length === 0 ? (
                <p className="text-sm leading-6 text-slate-500">
                  No shared book ratings match these filters yet.
                </p>
              ) : (
                ratedBookGroups.slice(0, 4).map((book) => {
                  const latestSignal = book.signals[0] ?? null;

                  return (
                    <div
                      key={book.bookId}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5"
                    >
                      <div className="flex min-w-0 gap-2.5">
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt=""
                            className="h-16 w-11 shrink-0 rounded-lg object-cover shadow-sm"
                          />
                        ) : (
                          <div className="h-16 w-11 shrink-0 rounded-lg bg-slate-200" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-sm font-black leading-tight text-slate-950">
                            {book.title}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {book.author || bookTypeLabel(book.bookType)}
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-600">
                            {formatReaderLevel(latestSignal?.readerLevel)}
                          </div>
                        </div>
                      </div>

                      {latestSignal ? (
                        <HubDifficultyRating
                          signal={latestSignal}
                          bookType={book.bookType}
                        />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
