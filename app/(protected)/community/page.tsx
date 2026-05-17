// Community Hub
//
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PublicProfileRow = {
  user_id: string;
  jlpt_level_public: string | null;
};

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
};

type UserBookRatingRow = {
  id: string;
  user_id: string;
  rating_overall: number | null;
  rating_difficulty: number | null;
  reader_level: string | null;
  finished_at: string | null;
  books: BookMeta | BookMeta[] | null;
};

type LibraryWordSummaryRow = {
  user_id: string;
  study_identity_key: string;
  first_seen_at: string | null;
};

type RatedBookSignal = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  bookType: string | null;
  readerLevel: string | null;
  entertainmentRating: number | null;
  difficultyRating: number | null;
  finishedAt: string | null;
};

type SortMode = "recent" | "rating" | "ease" | "difficulty";

const mySpaceCards = [
  {
    title: "My Profile",
    href: "/community/profile",
    eyebrow: "Your reader profile",
    description:
      "Edit your profile, reading settings, account details, and public preview.",
    className: "border-slate-200 bg-white text-slate-900",
  },
  {
    title: "My Stats",
    href: "/community/stats",
    eyebrow: "Your progress",
    description:
      "See your reading progress, study patterns, and personal Mekuru stats.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
];

const communityCards = [
  {
    title: "Book Clubs",
    href: "/community/book-clubs",
    eyebrow: "Coming soon",
    description:
      "Future shared reading spaces for groups, guided reading, and book-based community events.",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
  {
    title: "Reader Insights",
    href: "/discovery/reader-insights",
    eyebrow: "Coming soon",
    description:
      "A future space for anonymous comfort ratings, difficulty patterns, and reader-level insights.",
    className: "border-violet-200 bg-violet-50 text-violet-950",
  },
];

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverage(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function daysBetweenInclusive(start: string, end: string) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 1;
  return Math.max(1, Math.floor((endTime - startTime) / 86400000) + 1);
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

function bookSignalSentence(book: RatedBookSignal) {
  const bookType = bookTypeLabel(book.bookType).toLowerCase();
  const reader = formatReaderLevel(book.readerLevel);
  const difficulty =
    book.difficultyRating != null
      ? ` thought this ${bookType} was ${formatAverage(book.difficultyRating)} difficulty`
      : ` rated this ${bookType}`;
  const entertainment =
    book.entertainmentRating != null
      ? ` and gave it an entertainment rating of ${formatAverage(book.entertainmentRating)}/5`
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
          {safeValue == null ? "—" : `${formatAverage(safeValue)}/5`}
        </span>
      </div>

      <div
        className="relative mt-1 inline-block whitespace-nowrap text-lg leading-none tracking-[0.08em]"
        aria-hidden="true"
      >
        <span className="text-slate-200">★★★★★</span>
        <span
          className={`absolute inset-y-0 left-0 overflow-hidden ${colorClass}`}
          style={{ width: `${fillWidth}%` }}
        >
          ★★★★★
        </span>
      </div>
    </div>
  );
}

function RatingStack({ book }: { book: RatedBookSignal }) {
  if (book.difficultyRating == null && book.entertainmentRating == null) {
    return null;
  }

  return (
    <div className="grid min-w-[170px] gap-2 sm:ml-auto sm:w-[190px]">
      <RatingStars label="Difficulty" value={book.difficultyRating} tone="sky" />
      <RatingStars label="Fun" value={book.entertainmentRating} tone="amber" />
    </div>
  );
}

function HubCard({
  title,
  href,
  eyebrow,
  description,
  className,
}: {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
        {eyebrow}
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">{description}</p>
        </div>

        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
          →
        </span>
      </div>
    </Link>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`rounded-3xl border px-4 py-4 shadow-sm ${tone}`}>
      <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

export default function CommunityHubPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<PublicProfileRow[]>([]);
  const [ratingRows, setRatingRows] = useState<UserBookRatingRow[]>([]);
  const [wordSummaries, setWordSummaries] = useState<LibraryWordSummaryRow[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [bookTypeFilter, setBookTypeFilter] = useState("all");

  useEffect(() => {
    let alive = true;

    async function loadCommunitySnapshot() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const [profileResult, ratingResult, wordResult] = await Promise.all([
          supabase
            .from("user_public_profile")
            .select("user_id, jlpt_level_public")
            .limit(500),
          supabase
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
            .limit(1000),
          supabase
            .from("user_library_word_summaries")
            .select("user_id, study_identity_key, first_seen_at")
            .limit(10000),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (ratingResult.error) throw ratingResult.error;
        if (wordResult.error) throw wordResult.error;

        if (!alive) return;

        setProfiles((profileResult.data ?? []) as PublicProfileRow[]);
        setRatingRows((ratingResult.data ?? []) as UserBookRatingRow[]);
        setWordSummaries((wordResult.data ?? []) as LibraryWordSummaryRow[]);
      } catch (error: any) {
        console.error("Error loading community snapshot:", error);
        if (!alive) return;
        setErrorMsg(error?.message ?? "Could not load the community snapshot yet.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadCommunitySnapshot();

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

  const ratedBookSignals = useMemo(() => {
    const rows: RatedBookSignal[] = ratingRows.flatMap((row) => {
      const book = firstBook(row);
      if (!book?.id) return [];
      if (bookTypeFilter !== "all" && book.book_type !== bookTypeFilter) return [];

      return [
        {
          id: row.id,
          title: book.title ?? "Untitled book",
          author: book.author ?? null,
          coverUrl: book.cover_url ?? null,
          bookType: book.book_type ?? null,
          readerLevel: row.reader_level ?? null,
          entertainmentRating: row.rating_overall,
          difficultyRating: row.rating_difficulty,
          finishedAt: row.finished_at,
        },
      ];
    });

    return rows.sort((a, b) => {
      if (sortMode === "ease") {
        return (a.difficultyRating ?? 999) - (b.difficultyRating ?? 999);
      }
      if (sortMode === "difficulty") {
        return (b.difficultyRating ?? -1) - (a.difficultyRating ?? -1);
      }
      if (sortMode === "rating") {
        return (b.entertainmentRating ?? -1) - (a.entertainmentRating ?? -1);
      }
      return (b.finishedAt ?? "").localeCompare(a.finishedAt ?? "");
    });
  }, [ratingRows, sortMode, bookTypeFilter]);

  const ratedBookCount = useMemo(() => {
    const bookIds = new Set<string>();

    for (const row of ratingRows) {
      const book = firstBook(row);
      if (book?.id) bookIds.add(book.id);
    }

    return bookIds.size;
  }, [ratingRows]);

  const publicReaderCount = useMemo(() => {
    const ids = new Set<string>();

    for (const profile of profiles) {
      if (profile.user_id) ids.add(profile.user_id);
    }

    for (const row of ratingRows) {
      if (row.user_id) ids.add(row.user_id);
    }

    for (const row of wordSummaries) {
      if (row.user_id) ids.add(row.user_id);
    }

    return ids.size;
  }, [profiles, ratingRows, wordSummaries]);

  const communityStats = useMemo(() => {
    const ratings = ratingRows
      .map((row) => row.rating_overall)
      .filter((value): value is number => value != null);
    const easeRatings = ratingRows
      .map((row) => row.rating_difficulty)
      .filter((value): value is number => value != null);
    const wordKeys = new Set<string>();
    const seenDates = wordSummaries
      .map((row) => row.first_seen_at)
      .filter((value): value is string => Boolean(value))
      .sort();

    for (const row of wordSummaries) {
      if (!row.user_id || !row.study_identity_key) continue;
      wordKeys.add(`${row.user_id}::${row.study_identity_key}`);
    }

    const activeDays =
      seenDates.length > 0
        ? daysBetweenInclusive(seenDates[0], seenDates[seenDates.length - 1])
        : 0;

    return {
      averageRating: average(ratings),
      averageEase: average(easeRatings),
      savedWordsPerDay: activeDays > 0 ? wordKeys.size / activeDays : null,
    };
  }, [ratingRows, wordSummaries]);

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Community
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Community Hub
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            A small community snapshot: shared book ratings, reader-fit signals, and a quiet pulse
            of how the reading library is growing.
          </p>
        </div>

        {errorMsg ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errorMsg}
          </div>
        ) : null}

        <section className="mb-8">
          <div className="mb-3">
            <h2 className="text-lg font-black text-slate-900">My Space</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your profile, stats, and personal reading identity.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {mySpaceCards.map((card) => (
              <HubCard key={card.href} {...card} />
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-sky-200 bg-sky-50/80 p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">
                Community Snapshot
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Readers are starting to leave footprints.
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {loading ? "Loading..." : "Anonymous counts only. Private review text stays private."}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatPill
              label="Readers"
              value={loading ? "…" : String(publicReaderCount)}
              tone="border-slate-200 bg-white text-slate-950"
            />
            <StatPill
              label="Rated Books"
              value={loading ? "…" : String(ratedBookCount)}
              tone="border-rose-200 bg-rose-50 text-rose-950"
            />
            <StatPill
              label="Avg Rating"
              value={loading ? "…" : formatAverage(communityStats.averageRating)}
              tone="border-amber-200 bg-amber-50 text-amber-950"
            />
            <StatPill
              label="Avg Difficulty"
              value={loading ? "…" : formatAverage(communityStats.averageEase)}
              tone="border-emerald-200 bg-emerald-50 text-emerald-950"
            />
            <StatPill
              label="Saved Words/Day"
              value={loading ? "…" : formatAverage(communityStats.savedWordsPerDay)}
              tone="border-violet-200 bg-violet-50 text-violet-950"
            />
          </div>

          <p className="mt-4 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-600">
            No private notes, reviews, quotes, or personal vocabulary lists are shown here.
            This snapshot is tiny right now, but it will become more useful and more community-shaped
            as more readers join Mekuru.
          </p>
        </section>

        <section className="mb-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Community Ratings
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Recently rated books
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Each row is one anonymous reader signal.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
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
                  <option value="rating">High to Low Rating</option>
                  <option value="difficulty">High to Low Difficulty</option>
                  <option value="ease">Low to High Difficulty</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Loading rated books...</p>
              ) : ratedBookSignals.length === 0 ? (
                <p className="text-sm leading-6 text-slate-500">
                  No shared book ratings yet. The first ratings will show up here.
                </p>
              ) : (
                ratedBookSignals.slice(0, 8).map((book) => (
                  <div
                    key={book.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
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
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {bookSignalSentence(book)}
                        </p>
                      </div>
                    </div>

                    <RatingStack book={book} />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-black text-slate-900">Community Tools</h2>
            <p className="mt-1 text-sm text-slate-500">
              Shared reading features can live here as they grow.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {communityCards.map((card) => (
              <HubCard key={card.href} {...card} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
