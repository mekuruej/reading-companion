// Monthly Details

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SessionRow = {
  user_book_id: string;
  read_on: string | null;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  session_mode: string | null;
  is_filler?: boolean | null;
};

type WordRow = {
  id: string;
  user_book_id: string;
  created_at: string;
  surface: string | null;
  meaning: string | null;
};

type UserBookRow = {
  id: string;
  finished_at: string | null;
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
};

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

export default function MonthlyDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [stats, setStats] = useState<MonthlyStats>({
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
  });

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
          setStats({
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
          });
          return;
        }

        const { data: userBooks, error: userBooksError } = await supabase
          .from("user_books")
          .select("id, finished_at")
          .eq("user_id", user.id);

        if (userBooksError) throw userBooksError;

        const books = (userBooks ?? []) as UserBookRow[];
        const userBookIds = books.map((row) => row.id).filter(Boolean);

        if (userBookIds.length === 0) {
          if (!isMounted) return;
          setStats({
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
          });
          return;
        }

        const [
          { data: sessionData, error: sessionError },
          { data: wordData, error: wordError },
        ] = await Promise.all([
          supabase
            .from("user_book_reading_sessions")
            .select(
              "user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler"
            )
            .in("user_book_id", userBookIds),
          supabase
            .from("user_book_words")
            .select("id, user_book_id, created_at, surface, meaning")
            .in("user_book_id", userBookIds),
        ]);

        if (sessionError) throw sessionError;
        if (wordError) throw wordError;

        const sessions = ((sessionData ?? []) as SessionRow[]).filter(
          (row) => !row.is_filler
        );
        const words = (wordData ?? []) as WordRow[];

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

        let pagesRead = 0;
        let curiosityMinutes = 0;
        let fluidMinutes = 0;
        let listeningMinutes = 0;
        let readingSessions = 0;
        let listeningSessions = 0;

        for (const row of filteredSessions) {
          const pages = sessionPages(row);
          const minutes = Number(row.minutes_read) || 0;

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
        });
      } catch (error: any) {
        console.error("Error loading monthly details:", error);
        if (!isMounted) return;
        setErrorMsg(error?.message ?? "Could not load monthly details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMonthlyStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const topStats = useMemo(
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
          A fuller look at your monthly reading rhythm, streaks, pages, words,
          time, and finished books.
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
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
            Reading time
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-900">
            Time by mode
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Reading time counts Curiosity and Fluid sessions. Listening is shown
            separately so it does not blur your reading pace.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-stone-700">
                  Curiosity Reading
                </p>
                <p className="text-lg font-black text-stone-900">
                  {loading ? "—" : formatMinutes(stats.curiosityMinutes)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-stone-700">
                  Fluid Reading
                </p>
                <p className="text-lg font-black text-stone-900">
                  {loading ? "—" : formatMinutes(stats.fluidMinutes)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-stone-700">Listening</p>
                <p className="text-lg font-black text-stone-900">
                  {loading ? "—" : formatMinutes(stats.listeningMinutes)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-500">
            Monthly rhythm
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-900">
            What this month looks like
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            This combines reading sessions and saved words, because looking up
            and saving vocabulary is also part of your reading life.
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-bold text-stone-700">
                Total reading time
              </p>
              <p className="mt-1 text-2xl font-black text-stone-900">
                {loading ? "—" : formatMinutes(totalReadingMinutes)}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-bold text-stone-700">
                Total engagement time
              </p>
              <p className="mt-1 text-2xl font-black text-stone-900">
                {loading ? "—" : formatMinutes(totalEngagementMinutes)}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
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
      </section>
    </main>
  );
}