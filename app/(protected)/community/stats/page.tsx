// Community Stats Home

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { supabase } from "@/lib/supabaseClient";
import CommunityStatsHeader from "./components/CommunityStatsHeader";
import StatsExploreSection from "./components/StatsExploreSection";

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
  daysActive: number;
  pagesRead: number;
  minutesSpent: number;
  wordsSaved: number;
};

const statCards = [
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
    tag: "Snapshot details",
  },
  {
    title: "Reading Habits",
    description: "Look at reading days, sessions, time, and mode patterns.",
    href: "/community/stats/reading-habits",
    tag: "Consistency",
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
    title: "Vocabulary Growth",
    description: "Track saved words, vocabulary-heavy books, and saved-word study rhythm.",
    href: "/community/stats/vocabulary",
    tag: "Vocabulary",
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

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMinutes(total: number) {
  if (total <= 0) return "0m";

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function SnapshotCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "amber" | "emerald" | "sky" | "violet";
}) {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    sky: "border-sky-200 bg-sky-50 text-sky-950",
    violet: "border-violet-200 bg-violet-50 text-violet-950",
  };

  return (
    <div className={`rounded-[1.25rem] border p-4 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-black leading-tight md:text-3xl">{value}</p>
      <p className="mt-3 text-sm font-black opacity-75">{detail}</p>
    </div>
  );
}

export default function CommunityStatsHomePage() {
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [canSeeLearningSnapshots, setCanSeeLearningSnapshots] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotStats>({
    daysActive: 0,
    pagesRead: 0,
    minutesSpent: 0,
    wordsSaved: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      setLoadingSnapshot(true);
      setCanSeeLearningSnapshots(false);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          if (!isMounted) return;
          setSnapshot({
            daysActive: 0,
            pagesRead: 0,
            minutesSpent: 0,
            wordsSaved: 0,
          });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_super_teacher, app_access_type, app_access_expires_at")
          .eq("id", user.id)
          .maybeSingle();

        const appStatus = getAppAccessStatus({
          role: profile?.role ?? null,
          is_super_teacher: (profile as any)?.is_super_teacher ?? null,
          app_access_type: (profile as any)?.app_access_type ?? null,
          app_access_expires_at: (profile as any)?.app_access_expires_at ?? null,
        });
        const featureAccess = getFeatureAccess({
          role: profile?.role ?? null,
          isSuperTeacher: (profile as any)?.is_super_teacher ?? null,
          hasFullAccess: appStatus.hasFullAccess,
          isTrialActive: appStatus.isTrialActive,
        });
        const canShowLearningSnapshots = featureAccess.hasPaidAccess;

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
            daysActive: 0,
            pagesRead: 0,
            minutesSpent: 0,
            wordsSaved: 0,
          });
          return;
        }

        const [
          { data: sessionData, error: sessionError },
          wordResponse,
        ] = await Promise.all([
          supabase
            .from("user_book_reading_sessions")
            .select(
              "user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler"
            )
            .in("user_book_id", userBookIds),
          canShowLearningSnapshots
            ? supabase
              .from("user_book_words")
              .select("id, user_book_id, created_at")
              .in("user_book_id", userBookIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (sessionError) throw sessionError;
        if (wordResponse.error) throw wordResponse.error;

        const sessions = ((sessionData ?? []) as SessionRow[]).filter(
          (row) => !row.is_filler
        );
        const words = (wordResponse.data ?? []) as WordRow[];

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
        let minutesSpent = 0;

        for (const row of filteredSessions) {
          if (row.session_mode === "listening") continue;
          pagesRead += sessionPages(row);
        }

        for (const row of filteredSessions) {
          minutesSpent += row.minutes_read ?? 0;
        }

        if (!isMounted) return;

        setSnapshot({
          daysActive: monthlyActiveDays.size,
          pagesRead,
          minutesSpent,
          wordsSaved: filteredWords.length,
        });
        setCanSeeLearningSnapshots(canShowLearningSnapshots);
      } catch (error) {
        console.error("Error loading stats snapshot:", error);
        if (!isMounted) return;
        setSnapshot({
          daysActive: 0,
          pagesRead: 0,
          minutesSpent: 0,
          wordsSaved: 0,
        });
        setCanSeeLearningSnapshots(false);
      } finally {
        if (isMounted) setLoadingSnapshot(false);
      }
    }

    loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f5efe7] px-4 py-5">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/discovery"
          className="mb-4 inline-flex text-sm font-semibold text-stone-500 hover:text-stone-900"
        >
          ← Back to Discovery Hub
        </Link>

        <CommunityStatsHeader
          eyebrow="Stats"
          title="Stats Home"
          description="See your reading habits, vocabulary growth, book difficulty, reading ability, monthly rhythm, and reading color progress."
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SnapshotCard
            label="Active Days"
            value={loadingSnapshot ? "..." : formatCount(snapshot.daysActive)}
            detail="Reading/listening days this calendar month"
            tone="amber"
          />
          <SnapshotCard
            label="Pages Read"
            value={loadingSnapshot ? "..." : formatCount(snapshot.pagesRead)}
            detail="Page-tracked reading this calendar month"
            tone="emerald"
          />
          <SnapshotCard
            label="Time Spent"
            value={loadingSnapshot ? "..." : formatMinutes(snapshot.minutesSpent)}
            detail="Logged reading/listening this calendar month"
            tone="violet"
          />
          <SnapshotCard
            label="Words Saved"
            value={
              loadingSnapshot
                ? "..."
                : canSeeLearningSnapshots
                  ? formatCount(snapshot.wordsSaved)
                  : "Japanese Learning 🔒"
            }
            detail={canSeeLearningSnapshots ? "Saved this calendar month" : "Upgrade to track saved words"}
            tone="sky"
          />
        </section>

        <StatsExploreSection cards={statCards} />
      </div>
    </main>
  );
}
