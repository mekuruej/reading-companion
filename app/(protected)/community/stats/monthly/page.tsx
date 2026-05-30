// Monthly Details

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import MonthlyStatsPageHeader from "./components/MonthlyStatsPageHeader";
import MonthlyStatsErrorBanner from "./components/MonthlyStatsErrorBanner";
import MonthlyTopStatsGrid from "./components/MonthlyTopStatsGrid";
import MonthlyChartPanel from "./components/MonthlyChartPanel";
import PieChart, { type PieItem } from "./components/PieChart";
import MonthlyRhythmSection from "./components/MonthlyRhythmSection";
import MonthlyMoodSection from "./components/MonthlyMoodSection";

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

  const averagePagesPerEngagedDayLabel =
    stats.daysEngaged === 0
      ? "—"
      : (stats.pagesRead / stats.daysEngaged).toFixed(1);

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
      <MonthlyStatsPageHeader />
      <MonthlyStatsErrorBanner errorMsg={errorMsg} />
      <MonthlyTopStatsGrid items={topStats} loading={loading} />
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <MonthlyChartPanel
          tone="sky"
          eyebrow="Reading time"
          title="Time by mode"
          description="Reading time counts Curiosity and Fluid sessions. Listening is shown separately so it does not blur your reading pace."
        >
          <PieChart
            items={timeByModePie}
            centerLabel="Time"
            totalLabel={formatMinutes(totalEngagementMinutes)}
            valueLabel={formatMinutes}
          />
        </MonthlyChartPanel>

        <MonthlyChartPanel
          tone="violet"
          eyebrow="Book mix"
          title="Book types read this month"
          description="This chart uses page movement from Fluid and Curiosity sessions, so listening is not included here."
        >
          <PieChart
            items={bookTypePie}
            centerLabel="Pages"
            totalLabel={formatPageCount(stats.pagesRead)}
            valueLabel={formatPageCount}
          />
        </MonthlyChartPanel>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <MonthlyRhythmSection
          loading={loading}
          totalReadingTimeLabel={formatMinutes(totalReadingMinutes)}
          totalEngagementTimeLabel={formatMinutes(totalEngagementMinutes)}
          averagePagesPerEngagedDayLabel={averagePagesPerEngagedDayLabel}
        />
        <MonthlyMoodSection
          loading={loading}
          title={monthlyMood.title}
          description={monthlyMood.description}
          readingTimeLabel={formatMinutes(totalReadingMinutes)}
          listeningTimeLabel={formatMinutes(stats.listeningMinutes)}
          savedWordsLabel={stats.wordsSaved}
        />
      </section>
    </main>
  );
}
