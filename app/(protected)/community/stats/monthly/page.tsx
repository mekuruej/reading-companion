// Monthly Details

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SessionMode = "fluid" | "curiosity" | "listening" | string;

type SessionRow = {
  user_book_id: string;
  read_on: string | null;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  session_mode: SessionMode | null;
  is_filler?: boolean | null;
};

type WordRow = {
  id: string;
  user_book_id: string;
  created_at: string;
  surface: string | null;
  meaning: string | null;
};

type RawUserBookRow = {
  id: string;
  finished_at: string | null;
  books:
    | {
        book_type: string | null;
      }
    | {
        book_type: string | null;
      }[]
    | null;
};

type UserBookRow = {
  id: string;
  finished_at: string | null;
  bookType: string;
};

type BookTypeMetric = {
  bookType: string;
  pages: number;
  minutes: number;
  sessions: number;
};

type MonthlyStats = {
  currentStreak: number;
  bestStreak: number;
  daysEngaged: number;
  pagesRead: number;
  wordsSaved: number;
  uniqueWords: number;
  booksFinished: number;
  curiosityMinutes: number;
  fluidMinutes: number;
  listeningMinutes: number;
  readingSessions: number;
  listeningSessions: number;
  bookTypeMetrics: BookTypeMetric[];
};

type PieItem = {
  label: string;
  value: number;
  color: string;
};

const STATS_QUERY_PAGE_SIZE = 1000;
const USER_BOOK_ID_CHUNK_SIZE = 200;

function emptyMonthlyStats(): MonthlyStats {
  return {
    currentStreak: 0,
    bestStreak: 0,
    daysEngaged: 0,
    pagesRead: 0,
    wordsSaved: 0,
    uniqueWords: 0,
    booksFinished: 0,
    curiosityMinutes: 0,
    fluidMinutes: 0,
    listeningMinutes: 0,
    readingSessions: 0,
    listeningSessions: 0,
    bookTypeMetrics: [],
  };
}

function ymdLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthStartYmd() {
  const now = new Date();
  return ymdLocal(new Date(now.getFullYear(), now.getMonth(), 1));
}

function isThisMonth(dateString: string | null | undefined) {
  if (!dateString) return false;
  return dateString >= monthStartYmd();
}

function sessionPages(row: SessionRow) {
  const start = Number(row.start_page);
  const end = Number(row.end_page);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (end <= start) return 0;

  return end - start;
}

function wordKey(surface: string | null, meaning: string | null) {
  return `${surface ?? ""}::${meaning ?? ""}`.trim();
}

function bookTypeLabel(value: string | null | undefined) {
  if (!value) return "Other";

  const labels: Record<string, string> = {
    picture_book: "Picture books",
    early_reader: "Early readers",
    chapter_book: "Chapter books",
    middle_grade: "Middle grade",
    young_adult: "Young adult",
    ya: "YA",
    adult: "Adult",
    novel: "Novels",
    manga: "Manga",
    graded_reader: "Graded readers",
    nonfiction: "Nonfiction",
    short_story: "Short stories",
    "short story": "Short stories",
    essay: "Essays",
    textbook: "Textbooks",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function buildStreakStats(activeDays: Set<string>) {
  const today = new Date();
  let currentStreak = 0;

  for (let i = 0; i < 366; i += 1) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);

    if (activeDays.has(ymdLocal(checkDate))) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  const sortedDays = Array.from(activeDays).sort();

  let bestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  for (const day of sortedDays) {
    const currentDate = new Date(`${day}T00:00:00`);

    if (!previousDate) {
      runningStreak = 1;
    } else {
      const diffDays =
        (currentDate.getTime() - previousDate.getTime()) /
        (1000 * 60 * 60 * 24);

      runningStreak = diffDays === 1 ? runningStreak + 1 : 1;
    }

    bestStreak = Math.max(bestStreak, runningStreak);
    previousDate = currentDate;
  }

  return { currentStreak, bestStreak };
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remainingMinutes} min`;
}

function formatPageCount(value: number) {
  return `${value} page${value === 1 ? "" : "s"}`;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

async function fetchMonthlySessionsForBooks(
  userBookIds: string[],
  monthStart: string
) {
  const allRows: SessionRow[] = [];

  for (const idChunk of chunkArray(userBookIds, USER_BOOK_ID_CHUNK_SIZE)) {
    let from = 0;

    while (true) {
      const to = from + STATS_QUERY_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("user_book_reading_sessions")
        .select(
          "user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler"
        )
        .in("user_book_id", idChunk)
        .gte("read_on", monthStart)
        .range(from, to);

      if (error) throw error;

      const rows = (data ?? []) as SessionRow[];
      allRows.push(...rows);

      if (rows.length < STATS_QUERY_PAGE_SIZE) break;

      from += STATS_QUERY_PAGE_SIZE;
    }
  }

  return allRows;
}

async function fetchMonthlyWordsForBooks(
  userBookIds: string[],
  monthStart: string
) {
  const allRows: WordRow[] = [];

  for (const idChunk of chunkArray(userBookIds, USER_BOOK_ID_CHUNK_SIZE)) {
    let from = 0;

    while (true) {
      const to = from + STATS_QUERY_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("user_book_words")
        .select("id, user_book_id, created_at, surface, meaning")
        .in("user_book_id", idChunk)
        .gte("created_at", `${monthStart}T00:00:00`)
        .range(from, to);

      if (error) throw error;

      const rows = (data ?? []) as WordRow[];
      allRows.push(...rows);

      if (rows.length < STATS_QUERY_PAGE_SIZE) break;

      from += STATS_QUERY_PAGE_SIZE;
    }
  }

  return allRows;
}

function PieChart({
  items,
  size = 220,
  centerLabel = "Total",
  totalLabel,
  valueLabel = (value) => String(value),
}: {
  items: PieItem[];
  size?: number;
  centerLabel?: string;
  totalLabel?: string;
  valueLabel?: (value: number) => string;
}) {
  const filtered = items.filter((item) => item.value > 0);
  const total = filtered.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;

  if (total <= 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl bg-stone-50 text-sm text-stone-500">
        No chart data yet
      </div>
    );
  }

  let running = -Math.PI / 2;

  const paths = filtered.map((item) => {
    const angle = (item.value / total) * Math.PI * 2;
    const startAngle = running;
    const endAngle = running + angle;
    running = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return {
      ...item,
      d,
      percent: Math.round((item.value / total) * 100),
    };
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto"
      >
        {paths.length === 1 ? (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={paths[0].color}
            stroke="white"
            strokeWidth="3"
          />
        ) : (
          paths.map((item) => (
            <path
              key={item.label}
              d={item.d}
              fill={item.color}
              stroke="white"
              strokeWidth="3"
            />
          ))
        )}

        <circle cx={cx} cy={cy} r={radius * 0.48} fill="white" />

        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-stone-500 text-[11px] font-bold uppercase"
        >
          {centerLabel}
        </text>

        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          className="fill-stone-900 text-[14px] font-black"
        >
          {totalLabel ?? String(total)}
        </text>
      </svg>

      <div className="space-y-3">
        {paths.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 truncate text-sm font-semibold text-stone-700">
                {item.label}
              </span>
            </div>

            <div className="shrink-0 text-sm font-bold text-stone-900">
              {valueLabel(item.value)}{" "}
              <span className="text-stone-500">({item.percent}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MonthlyDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [stats, setStats] = useState<MonthlyStats>(emptyMonthlyStats());

  useEffect(() => {
    let isMounted = true;

    async function loadMonthlyStats() {
      setLoading(true);
      setErrorMsg("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          if (!isMounted) return;
          setStats(emptyMonthlyStats());
          return;
        }

        const { data: userBooks, error: userBooksError } = await supabase
          .from("user_books")
          .select(
            `
              id,
              finished_at,
              books:book_id (
                book_type
              )
            `
          )
          .eq("user_id", user.id);

        if (userBooksError) throw userBooksError;

        const books: UserBookRow[] = ((userBooks ?? []) as RawUserBookRow[]).map(
          (row) => {
            const book = Array.isArray(row.books)
              ? row.books[0] ?? null
              : row.books ?? null;

            return {
              id: row.id,
              finished_at: row.finished_at,
              bookType: book?.book_type ?? "other",
            };
          }
        );

        const userBookIds = books
          .map((row) => row.id)
          .filter((id): id is string => Boolean(id));

        if (userBookIds.length === 0) {
          if (!isMounted) return;
          setStats(emptyMonthlyStats());
          return;
        }

        const monthStart = monthStartYmd();

        const [sessionData, wordData] = await Promise.all([
          fetchMonthlySessionsForBooks(userBookIds, monthStart),
          fetchMonthlyWordsForBooks(userBookIds, monthStart),
        ]);

        const sessions = sessionData.filter((row) => !row.is_filler);
        const words = wordData;

        const filteredSessions = sessions.filter((row) =>
          isThisMonth(row.read_on)
        );

        const filteredWords = words.filter((row) =>
          isThisMonth(row.created_at)
        );

        const activeDays = new Set<string>();

        for (const row of filteredSessions) {
          if (row.read_on) activeDays.add(row.read_on);
        }

        for (const row of filteredWords) {
          if (row.created_at) {
            activeDays.add(ymdLocal(new Date(row.created_at)));
          }
        }

        const bookTypeByUserBookId = new Map(
          books.map((row) => [row.id, row.bookType])
        );

        const bookTypeMap = new Map<string, BookTypeMetric>();

        let pagesRead = 0;
        let curiosityMinutes = 0;
        let fluidMinutes = 0;
        let listeningMinutes = 0;
        let readingSessions = 0;
        let listeningSessions = 0;

        for (const row of filteredSessions) {
          const pages =
            row.session_mode === "listening" ? 0 : sessionPages(row);
          const minutes = Number(row.minutes_read) || 0;
          const bookType = bookTypeLabel(bookTypeByUserBookId.get(row.user_book_id));
          const bookTypeMetric =
            bookTypeMap.get(bookType) ??
            {
              bookType,
              pages: 0,
              minutes: 0,
              sessions: 0,
            };

          bookTypeMetric.pages += pages;
          bookTypeMetric.minutes += minutes;
          bookTypeMetric.sessions += 1;
          bookTypeMap.set(bookType, bookTypeMetric);

          if (row.session_mode === "curiosity") {
            pagesRead += pages;
            curiosityMinutes += minutes;
            readingSessions += 1;
          } else if (row.session_mode === "listening") {
            listeningMinutes += minutes;
            listeningSessions += 1;
          } else {
            pagesRead += pages;
            fluidMinutes += minutes;
            readingSessions += 1;
          }
        }

        const streaks = buildStreakStats(activeDays);

        const uniqueWords = new Set(
          filteredWords.map((row) => wordKey(row.surface, row.meaning))
        ).size;

        const booksFinished = books.filter((row) =>
          isThisMonth(row.finished_at)
        ).length;

        const bookTypeMetrics = Array.from(bookTypeMap.values()).sort(
          (a, b) => b.pages - a.pages || b.sessions - a.sessions
        );

        if (!isMounted) return;

        setStats({
          currentStreak: streaks.currentStreak,
          bestStreak: streaks.bestStreak,
          daysEngaged: activeDays.size,
          pagesRead,
          wordsSaved: filteredWords.length,
          uniqueWords,
          booksFinished,
          curiosityMinutes,
          fluidMinutes,
          listeningMinutes,
          readingSessions,
          listeningSessions,
          bookTypeMetrics,
        });
      } catch (error: any) {
        console.error("Error loading monthly details:", error);

        if (!isMounted) return;

        setErrorMsg(error?.message ?? "Could not load monthly details.");
        setStats(emptyMonthlyStats());
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMonthlyStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const topStats = useMemo<[string, string | number][]>(
    () => [
      ["Current streak", stats.currentStreak],
      ["Best streak", stats.bestStreak],
      ["Days engaged", stats.daysEngaged],
      ["Pages read", stats.pagesRead],
      ["Words saved", stats.wordsSaved],
      ["Unique words", stats.uniqueWords],
      ["Books finished", stats.booksFinished],
      ["Reading sessions", stats.readingSessions],
      ["Listening sessions", stats.listeningSessions],
    ],
    [stats]
  );

  const totalReadingMinutes = stats.curiosityMinutes + stats.fluidMinutes;
  const totalEngagementMinutes = totalReadingMinutes + stats.listeningMinutes;

  const timeByModePie = useMemo<PieItem[]>(
    () => [
      {
        label: "Curiosity",
        value: stats.curiosityMinutes,
        color: "#f59e0b",
      },
      {
        label: "Fluid",
        value: stats.fluidMinutes,
        color: "#34d399",
      },
      {
        label: "Listening",
        value: stats.listeningMinutes,
        color: "#38bdf8",
      },
    ],
    [stats]
  );

  const bookTypePalette = [
    "#8b5cf6",
    "#ec4899",
    "#38bdf8",
    "#f59e0b",
    "#14b8a6",
    "#f97316",
    "#22c55e",
    "#64748b",
  ];

  const bookTypePie = useMemo<PieItem[]>(
    () =>
      stats.bookTypeMetrics.map((item, index) => ({
        label: item.bookType,
        value: item.pages,
        color: bookTypePalette[index % bookTypePalette.length],
      })),
    [stats.bookTypeMetrics]
  );

  const monthlyMood =
    stats.daysEngaged === 0
      ? {
          title: "Waiting to wake up",
          description:
            "No monthly rhythm yet. One tiny reading or listening session is enough to start the page.",
        }
      : stats.listeningMinutes > totalReadingMinutes
        ? {
            title: "Ear-training month",
            description:
              "Listening took the lead this month. That still counts as engagement with Japanese, just through your ears.",
          }
        : stats.curiosityMinutes > stats.fluidMinutes
          ? {
              title: "Curiosity-led month",
              description:
                "You spent more time reading slowly, noticing words, and letting the text teach you.",
            }
          : {
              title: "Flow-forward month",
              description:
                "Fluid reading took the lead this month, which means you spent more time moving with the story.",
            };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <Link
          href="/community/stats"
          className="text-sm font-bold text-stone-500 hover:text-stone-900"
        >
          ← Back to Stats Home
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
          Monthly stats
        </p>

        <h1 className="mt-2 text-3xl font-black text-stone-900 sm:text-4xl">
          Monthly Details
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
          A colorful snapshot of this month’s reading rhythm: pages, time,
          listening, saved words, and the kinds of books you spent time with.
        </p>
      </div>

      {errorMsg ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topStats.map(([label, value]) => (
          <div
            key={label}
            className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              {label}
            </p>
            <p className="mt-3 text-3xl font-black text-stone-900">
              {loading ? "—" : value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-sky-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">
            Reading time
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-900">
            Time by mode
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Reading time counts Curiosity and Fluid sessions. Listening is shown
            separately so it does not blur your reading pace.
          </p>

          <div className="mt-5">
            <PieChart
              items={timeByModePie}
              centerLabel="Time"
              totalLabel={formatMinutes(totalEngagementMinutes)}
              valueLabel={formatMinutes}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-violet-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            Book mix
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-900">
            Book types read this month
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            This chart uses page movement from Fluid and Curiosity sessions, so
            listening is not included here.
          </p>

          <div className="mt-5">
            <PieChart
              items={bookTypePie}
              centerLabel="Pages"
              totalLabel={formatPageCount(stats.pagesRead)}
              valueLabel={formatPageCount}
            />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
            Monthly rhythm
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-900">
            What this month looks like
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            This combines reading sessions, listening, and saved words because
            looking up and saving vocabulary is also part of your reading life.
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-bold text-stone-700">
                Total reading time
              </p>
              <p className="mt-1 text-2xl font-black text-stone-900">
                {loading ? "—" : formatMinutes(totalReadingMinutes)}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-bold text-stone-700">
                Total engagement time
              </p>
              <p className="mt-1 text-2xl font-black text-stone-900">
                {loading ? "—" : formatMinutes(totalEngagementMinutes)}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-bold text-stone-700">
                Average pages per engaged day
              </p>
              <p className="mt-1 text-2xl font-black text-stone-900">
                {loading || stats.daysEngaged === 0
                  ? "—"
                  : (stats.pagesRead / stats.daysEngaged).toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
            Monthly mood
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-900">
            {monthlyMood.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {monthlyMood.description}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                Reading
              </p>
              <p className="mt-2 text-xl font-black text-stone-900">
                {loading ? "—" : formatMinutes(totalReadingMinutes)}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                Listening
              </p>
              <p className="mt-2 text-xl font-black text-stone-900">
                {loading ? "—" : formatMinutes(stats.listeningMinutes)}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                Saved words
              </p>
              <p className="mt-2 text-xl font-black text-stone-900">
                {loading ? "—" : stats.wordsSaved}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
