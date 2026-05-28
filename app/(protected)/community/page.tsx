// Community Hub
//
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LibraryWordSummaryRow = {
  user_id: string;
  study_identity_key: string;
  first_seen_at: string | null;
};

type LibraryWordProgressRow = {
  user_id: string;
  study_identity_key: string;
  reading_gate_status: "not_started" | "passed" | "failed" | null;
  meaning_gate_status: "not_started" | "passed" | "failed" | null;
  mastered: boolean | null;
  mastered_at: string | null;
  reading_gate_failed_at: string | null;
  meaning_gate_failed_at: string | null;
  last_studied_at: string | null;
};

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
];

function formatAverage(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function ymdLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function yesterdayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 1);
  const end = new Date(today);

  return {
    start,
    end,
    label: ymdLocal(start),
  };
}

function isInRange(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= start.getTime() && time < end.getTime();
}

function incrementCount(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function averageCount(map: Map<string, number>, userCount: number) {
  if (userCount <= 0) return null;
  const total = Array.from(map.values()).reduce((sum, value) => sum + value, 0);
  return total / userCount;
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
  detail,
}: {
  label: string;
  value: string;
  tone: string;
  detail?: string;
}) {
  return (
    <div className={`rounded-3xl border px-4 py-4 shadow-sm ${tone}`}>
      <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black">{value}</div>
      {detail ? (
        <div className="mt-1 text-xs font-semibold opacity-65">{detail}</div>
      ) : null}
    </div>
  );
}

export default function CommunityHubPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wordSummaries, setWordSummaries] = useState<LibraryWordSummaryRow[]>([]);
  const [wordProgressRows, setWordProgressRows] = useState<LibraryWordProgressRow[]>([]);

  useEffect(() => {
    let alive = true;

    async function loadCommunitySnapshot() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const [wordResult, progressResult] = await Promise.all([
          supabase
            .from("user_library_word_summaries")
            .select("user_id, study_identity_key, first_seen_at")
            .limit(10000),
          supabase
            .from("user_library_word_progress")
            .select(
              "user_id, study_identity_key, reading_gate_status, meaning_gate_status, mastered, mastered_at, reading_gate_failed_at, meaning_gate_failed_at, last_studied_at"
            )
            .limit(10000),
        ]);

        if (wordResult.error) throw wordResult.error;
        if (progressResult.error) throw progressResult.error;

        if (!alive) return;

        setWordSummaries((wordResult.data ?? []) as LibraryWordSummaryRow[]);
        setWordProgressRows((progressResult.data ?? []) as LibraryWordProgressRow[]);
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

  const yesterday = useMemo(() => yesterdayRange(), []);

  const dailyStudyStats = useMemo(() => {
    const activeUsers = new Set<string>();
    const newWordsByUser = new Map<string, number>();
    const passedReadingByUser = new Map<string, number>();
    const passedMeaningByUser = new Map<string, number>();
    const masteredByUser = new Map<string, number>();
    const forgottenByUser = new Map<string, number>();
    const seenNewWords = new Set<string>();

    for (const row of wordSummaries) {
      if (!row.user_id || !row.study_identity_key) continue;
      if (!isInRange(row.first_seen_at, yesterday.start, yesterday.end)) continue;

      const key = `${row.user_id}::${row.study_identity_key}`;
      if (seenNewWords.has(key)) continue;

      seenNewWords.add(key);
      activeUsers.add(row.user_id);
      incrementCount(newWordsByUser, row.user_id);
    }

    for (const row of wordProgressRows) {
      if (!row.user_id || !row.study_identity_key) continue;

      const hadDailyStudy = isInRange(
        row.last_studied_at,
        yesterday.start,
        yesterday.end
      );
      if (!hadDailyStudy) continue;

      const masteredYesterday =
        isInRange(row.mastered_at, yesterday.start, yesterday.end) ||
        (row.mastered && !row.mastered_at);
      const forgottenCount =
        (isInRange(row.reading_gate_failed_at, yesterday.start, yesterday.end) ? 1 : 0) +
        (isInRange(row.meaning_gate_failed_at, yesterday.start, yesterday.end) ? 1 : 0);

      activeUsers.add(row.user_id);

      if (forgottenCount > 0) {
        incrementCount(forgottenByUser, row.user_id, forgottenCount);
      } else if (masteredYesterday) {
        incrementCount(masteredByUser, row.user_id);
      } else if (row.meaning_gate_status === "passed") {
        incrementCount(passedMeaningByUser, row.user_id);
      } else if (row.reading_gate_status === "passed") {
        incrementCount(passedReadingByUser, row.user_id);
      }
    }

    const activeUserCount = activeUsers.size;
    return {
      activeUserCount,
      averageNewWords: averageCount(newWordsByUser, activeUserCount),
      averagePassedReading: averageCount(passedReadingByUser, activeUserCount),
      averagePassedMeaning: averageCount(passedMeaningByUser, activeUserCount),
      averageMastered: averageCount(masteredByUser, activeUserCount),
      averageForgotten: averageCount(forgottenByUser, activeUserCount),
    };
  }, [wordSummaries, wordProgressRows, yesterday]);

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
            A small community snapshot: reading color movement, shared spaces, and a quiet pulse
            of how the study library is growing.
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
                Yesterday's color movement.
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {loading
                ? "Loading..."
                : `Anonymous daily averages from ${dailyStudyStats.activeUserCount} active reader${dailyStudyStats.activeUserCount === 1 ? "" : "s"} on ${yesterday.label}.`}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatPill
              label="Avg New Words"
              value={loading ? "…" : formatAverage(dailyStudyStats.averageNewWords)}
              detail="New"
              tone="border-red-200 bg-white text-red-950"
            />
            <StatPill
              label="Avg Green"
              value={loading ? "…" : formatAverage(dailyStudyStats.averagePassedReading)}
              detail="Passed reading"
              tone="border-emerald-200 bg-white text-emerald-950"
            />
            <StatPill
              label="Avg Blue"
              value={loading ? "…" : formatAverage(dailyStudyStats.averagePassedMeaning)}
              detail="Passed meaning"
              tone="border-sky-200 bg-white text-sky-950"
            />
            <StatPill
              label="Avg Purple"
              value={loading ? "…" : formatAverage(dailyStudyStats.averageMastered)}
              detail="Mastered"
              tone="border-purple-200 bg-white text-purple-950"
            />
            <StatPill
              label="Avg Forgotten"
              value={loading ? "…" : formatAverage(dailyStudyStats.averageForgotten)}
              detail="Back to support"
              tone="border-slate-300 bg-white text-slate-950"
            />
          </div>

          <p className="mt-4 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-600">
            No private notes, reviews, quotes, or vocabulary lists are shown here.
            These are anonymous averages from yesterday's Library Study activity. A studied
            word is counted once in its strongest color bucket, with forgotten words counted
            separately.
          </p>
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
