// Community Stats Home

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  emptyLibraryStudyColorTotals,
  fetchLibraryStudyColorBreakdown,
  type LibraryStudyColorTotals,
} from "@/lib/libraryStudyTotals";
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
};

type SnapshotStats = {
  currentStreak: number;
  bestStreak: number;
  pagesRead: number;
  wordsSaved: number;
};

const statCards = [
  {
    title: "Reading Habits",
    description: "Look at reading days, sessions, time, and mode patterns.",
    href: "/community/stats/reading-habits",
    tag: "Consistency",
  },
  {
    title: "Vocabulary Growth",
    description: "Track saved words, vocabulary-heavy books, and saved-word study rhythm.",
    href: "/community/stats/vocabulary",
    tag: "Vocabulary",
  },
  {
    title: "Book Difficulty",
    description: "Explore reader fit, difficulty ratings, and book-level patterns.",
    href: "/community/stats/book-difficulty",
    tag: "Book insight",
  },
  {
    title: "Reading Ability",
    description: "Explore pace, support needs, and reading difficulty by book type.",
    href: "/community/stats/reading-ability",
    tag: "Reading skill",
  },
  {
    title: "Detailed Monthly Stats",
    description: "Review this month’s reading, listening, saved words, and engagement.",
    href: "/community/stats/monthly",
    tag: "Snapshot details",
  },
  {
    title: "Detailed Reading Colors",
    description: "See color meanings, encounter stages, and Ability Check progress.",
    href: "/community/stats/colors",
    tag: "Color details",
  },
];

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

function monthStartDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
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

export default function CommunityStatsHomePage() {
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [snapshotError, setSnapshotError] = useState("");
  const [snapshot, setSnapshot] = useState<SnapshotStats>({
    currentStreak: 0,
    bestStreak: 0,
    pagesRead: 0,
    wordsSaved: 0,
  });

  const [loadingColors, setLoadingColors] = useState(true);
  const [colorError, setColorError] = useState("");
  const [colorTotals, setColorTotals] = useState<LibraryStudyColorTotals>(
    emptyLibraryStudyColorTotals()
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      setLoadingSnapshot(true);
      setSnapshotError("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          if (!isMounted) return;
          setSnapshot({
            currentStreak: 0,
            bestStreak: 0,
            pagesRead: 0,
            wordsSaved: 0,
          });
          return;
        }

        const { data: userBooks, error: userBooksError } = await supabase
          .from("user_books")
          .select("id")
          .eq("user_id", user.id);

        if (userBooksError) throw userBooksError;

        const userBookIds = (userBooks ?? [])
          .map((row) => row.id)
          .filter(Boolean);

        if (userBookIds.length === 0) {
          if (!isMounted) return;
          setSnapshot({
            currentStreak: 0,
            bestStreak: 0,
            pagesRead: 0,
            wordsSaved: 0,
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
            .select("id, user_book_id, created_at")
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

        const monthlyActiveDays = new Set<string>();

        for (const row of filteredSessions) {
          if (row.read_on) monthlyActiveDays.add(row.read_on);
        }

        for (const row of filteredWords) {
          if (row.created_at) {
            monthlyActiveDays.add(ymdLocal(new Date(row.created_at)));
          }
        }

        let pagesRead = 0;

        for (const row of filteredSessions) {
          if (row.session_mode === "listening") continue;
          pagesRead += sessionPages(row);
        }

        const streaks = buildStreakStats(monthlyActiveDays);

        if (!isMounted) return;

        setSnapshot({
          currentStreak: streaks.currentStreak,
          bestStreak: streaks.bestStreak,
          pagesRead,
          wordsSaved: filteredWords.length,
        });
      } catch (error: any) {
        console.error("Error loading stats snapshot:", error);
        if (!isMounted) return;
        setSnapshotError(error?.message ?? "Could not load stats snapshot.");
      } finally {
        if (isMounted) setLoadingSnapshot(false);
      }
    }

    loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadColorTotals() {
      setLoadingColors(true);
      setColorError("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          if (!isMounted) return;
          setColorTotals(emptyLibraryStudyColorTotals());
          return;
        }

        const since = monthStartDate();

        const breakdown = await fetchLibraryStudyColorBreakdown(user.id, null, { since });

        if (!isMounted) return;

        setColorTotals(breakdown.colorTotals);
      } catch (error: any) {
        console.error("Error loading color snapshot:", error);

        if (!isMounted) return;

        setColorError(error?.message ?? "Could not load color snapshot.");
        setColorTotals(emptyLibraryStudyColorTotals());
      } finally {
        if (isMounted) setLoadingColors(false);
      }
    }

    loadColorTotals();

    return () => {
      isMounted = false;
    };
  }, []);

  const monthlyStats = useMemo(
    () => [
      ["Current streak", snapshot.currentStreak],
      ["Best streak", snapshot.bestStreak],
      ["Pages read", snapshot.pagesRead],
      ["Words saved", snapshot.wordsSaved],
    ],
    [snapshot]
  );

  const colorSnapshotItems = useMemo(
    () => [
      {
        label: "Red",
        value: colorTotals.red,
        cardClasses: "border-red-200 bg-white text-red-700",
        dotClass: "bg-red-500",
        valueClass: "text-red-900",
      },
      {
        label: "Orange",
        value: colorTotals.orange,
        cardClasses: "border-orange-200 bg-white text-orange-700",
        dotClass: "bg-orange-500",
        valueClass: "text-orange-900",
      },
      {
        label: "Yellow",
        value: colorTotals.yellow,
        cardClasses: "border-yellow-200 bg-white text-yellow-700",
        dotClass: "bg-yellow-400",
        valueClass: "text-yellow-900",
      },
      {
        label: "Green",
        value: colorTotals.green,
        cardClasses: "border-green-200 bg-white text-green-700",
        dotClass: "bg-green-500",
        valueClass: "text-green-900",
      },
      {
        label: "Blue",
        value: colorTotals.blue,
        cardClasses: "border-blue-200 bg-white text-blue-700",
        dotClass: "bg-blue-500",
        valueClass: "text-blue-900",
      },
      {
        label: "Purple",
        value: colorTotals.purple,
        cardClasses: "border-purple-200 bg-white text-purple-700",
        dotClass: "bg-purple-500",
        valueClass: "text-purple-900",
      },
    ],
    [colorTotals]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
          Community
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-900 sm:text-4xl">
          Stats Home
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
          A calmer place to check your reading month, your word colors, and the
          deeper patterns behind your Japanese reading life.
        </p>
      </div>

      {snapshotError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {snapshotError}
        </div>
      ) : null}

      {colorError ? (
        <div className="mb-4 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700">
          {colorError}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                This month
              </p>
              <h2 className="mt-1 text-2xl font-black text-stone-900">
                Monthly Snapshot
              </h2>
            </div>
          </div>

          <p className="mt-2 text-sm leading-6 text-stone-600">
            A quick check of your reading rhythm this month.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {monthlyStats.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-stone-200 bg-white p-3"
              >
                <p className="text-[11px] font-semibold text-stone-500">
                  {label}
                </p>
                <p className="mt-1 text-xl font-black text-stone-900">
                  {loadingSnapshot ? "—" : value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-500">
                Reading colors
              </p>
              <h2 className="mt-1 text-2xl font-black text-stone-900">
                Colors Snapshot
              </h2>
            </div>
          </div>

          <p className="mt-2 text-sm leading-6 text-stone-600">
            A quick count of color movement this month.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {colorSnapshotItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border p-3 ${item.cardClasses}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`}
                  />
                  <p className="text-[11px] font-bold">{item.label}</p>
                </div>

                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className={`text-xl font-black ${item.valueClass}`}>
                    {loadingColors ? "—" : item.value}
                  </p>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-stone-500">
                    This month
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] font-medium leading-5 text-stone-500">
            Counts update when you save words, log reading, or study in Ability Check.
            This snapshot shows this month only.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-stone-900">
              Explore more stats
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Open a focused page for each part of your reading life.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                {card.tag}
              </span>
              <h3 className="mt-4 text-lg font-black text-stone-900 group-hover:text-black">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {card.description}
              </p>
              <p className="mt-4 text-sm font-bold text-stone-900">Open →</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
