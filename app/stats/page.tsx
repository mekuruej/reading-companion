"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ColorLegend from "@/components/ColorLegend";

type Stage =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "grey"
  | "pink"
  | "black";

type ProgressRow = {
  stage: Stage;
  lookup_count: number;
  last_lookup_at: string | null;
};

type ProfileRow = {
  level: string | null;
};

const MAIN_STAGES: Stage[] = ["red", "orange", "yellow", "green", "blue", "grey"];
const SPECIAL_STAGES: Stage[] = ["purple", "black", "pink"];

function stageLabel(stage: Stage) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function stageBadgeClass(stage: Stage) {
  const base = "rounded-full px-2 py-1 text-xs font-semibold";

  if (stage === "red") return `${base} bg-red-600 text-white`;
  if (stage === "orange") return `${base} bg-orange-500 text-white`;
  if (stage === "yellow") return `${base} bg-yellow-300 text-slate-900`;
  if (stage === "green") return `${base} bg-green-600 text-white`;
  if (stage === "blue") return `${base} bg-blue-600 text-white`;
  if (stage === "purple") return `${base} bg-purple-600 text-white`;
  if (stage === "pink") return `${base} bg-pink-500 text-white`;
  if (stage === "black") return `${base} bg-black text-white`;
  return `${base} bg-slate-500 text-white`; // grey
}

function stageNickname(stage: Stage) {
  if (stage === "red") return '"Fresh"';
  if (stage === "orange") return '"Warm"';
  if (stage === "yellow") return '"Almost"';
  if (stage === "green") return '"Reading-Check"';
  if (stage === "blue") return '"Meaning-Check"';
  if (stage === "grey") return '"Mastered"';
  if (stage === "purple") return "Kana Tome";
  if (stage === "pink") return "Culture Stack";
  if (stage === "black") return "Kanji Tome";
  return "";
}

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

// ✅ local YYYY-MM-DD (avoids JST/UTC bucket mismatch)
function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [level, setLevel] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);

  // weekly lookups (optional if lookup_events exists)
  const [weeklyLookups, setWeeklyLookups] = useState<number | null>(null);
  const [dailySeries, setDailySeries] = useState<Array<{ day: string; count: number }> | null>(
    null
  );
  const [eventsAvailable, setEventsAvailable] = useState<boolean | null>(null);

  const since7d = useMemo(() => {
    const now = new Date();
    return addDays(now, -6); // include today => 7 calendar days
  }, []);

  const totalsByStage = useMemo(() => {
    const map = new Map<Stage, number>();
    [...MAIN_STAGES, ...SPECIAL_STAGES].forEach((s) => map.set(s, 0));
    for (const row of progress) {
      map.set(row.stage, (map.get(row.stage) ?? 0) + 1);
    }
    return map;
  }, [progress]);

  const totalCards = useMemo(() => progress.length, [progress]);

  const totalLookupsLifetime = useMemo(() => {
    return progress.reduce((sum, r) => sum + (r.lookup_count ?? 0), 0);
  }, [progress]);

  const cardsTouched7d = useMemo(() => {
    const cutoff = since7d.getTime();
    return progress.filter((r) =>
      r.last_lookup_at ? new Date(r.last_lookup_at).getTime() >= cutoff : false
    ).length;
  }, [progress, since7d]);

  async function loadStats() {
    setLoading(true);
    setErrorMsg(null);
    setNeedsSignIn(false);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setNeedsSignIn(true);
        setProgress([]);
        setLevel(null);
        setWeeklyLookups(null);
        setDailySeries(null);
        setEventsAvailable(null);
        return;
      }

      // profile level
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("level")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr) throw profileErr;
      setLevel((profileData as ProfileRow | null)?.level ?? "beginner");

      // progress rows
      const { data: progData, error: progErr } = await supabase
        .from("user_card_progress")
        .select("stage,lookup_count,last_lookup_at")
        .eq("user_id", user.id);

      if (progErr) throw progErr;
      setProgress((progData ?? []) as ProgressRow[]);

      // OPTIONAL: if lookup_events exists, compute last 7 days lookups + daily counts
      const cutoffISO = startOfDayISO(since7d);

      try {
        const { data: evData, error: evErr } = await supabase
          .from("lookup_events")
          .select("created_at")
          .gte("created_at", cutoffISO);

        if (evErr) throw evErr;

        setEventsAvailable(true);

        const events = (evData ?? []) as Array<{ created_at: string }>;
        setWeeklyLookups(events.length);

        // build daily buckets for last 7 days (local YYYY-MM-DD)
        const buckets = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
          const dayKey = ymdLocal(addDays(since7d, i));
          buckets.set(dayKey, 0);
        }

        for (const e of events) {
          const dayKey = ymdLocal(new Date(e.created_at));
          if (buckets.has(dayKey)) buckets.set(dayKey, (buckets.get(dayKey) ?? 0) + 1);
        }

        setDailySeries(Array.from(buckets.entries()).map(([day, count]) => ({ day, count })));
      } catch {
        // lookup_events table probably doesn't exist (or no permission) — that's ok.
        setEventsAvailable(false);
        setWeeklyLookups(null);
        setDailySeries(null);
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <div className="text-sm text-slate-600">Loading…</div>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <h1 className="text-2xl font-bold">Stats</h1>
        <div className="mt-4 rounded-2xl border p-4 text-sm text-slate-700">
          Please{" "}
          <Link className="underline" href="/login">
            sign in
          </Link>{" "}
          to see your stats.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">THIS PAGE IS CURRENTLY UNDER CONSTRUCTION: Stats</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your colors are based on lookup behavior — not self-reports.
          </p>
        </div>

        <button
          onClick={loadStats}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* ✅ Color guide toggle */}
      <ColorLegend level={level} />

      {errorMsg && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-slate-500">Level</div>
          <div className="mt-1 text-lg font-semibold">{level ?? "beginner"}</div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs text-slate-500">Cards tracked</div>
          <div className="mt-1 text-lg font-semibold">{totalCards}</div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs text-slate-500">Total lookups (lifetime)</div>
          <div className="mt-1 text-lg font-semibold">{totalLookupsLifetime}</div>
        </div>
      </div>

      {/* Weekly */}
      <div className="mt-3 rounded-2xl border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Last 7 days</div>
            <div className="text-xs text-slate-500">
              Cutoff: {ymdLocal(since7d)} → today
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Cards touched</div>
            <div className="text-lg font-semibold">{cardsTouched7d}</div>
          </div>
        </div>

        {eventsAvailable === false ? (
          <div className="mt-3 text-sm text-slate-600">
            Want true “lookups per day”? Add the optional <code>lookup_events</code> table.
          </div>
        ) : eventsAvailable === true ? (
          <div className="mt-3">
            <div className="text-sm text-slate-700">
              Lookups (7 days): <span className="font-semibold">{weeklyLookups ?? 0}</span>
            </div>

            {dailySeries ? (
              <div className="mt-3 grid grid-cols-7 gap-2">
                {dailySeries.map((d) => (
                  <div key={d.day} className="rounded-xl border p-2 text-center">
                    <div className="text-[11px] text-slate-500">{d.day.slice(5)}</div>
                    <div className="text-sm font-semibold">{d.count}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Color totals + Special collections */}
      <div className="mt-6 rounded-2xl border p-4">
        <div className="text-sm font-semibold">Color totals</div>

        {/* Main ladder */}
        <div className="grid grid-cols-3 gap-3">
          {MAIN_STAGES.map((s) => (
            <div key={s} className="rounded-2xl border p-3">
              <div className="flex items-center justify-between">
                <span className={stageBadgeClass(s)}>{stageLabel(s)}</span>
                <span className="text-lg font-bold">{totalsByStage.get(s) ?? 0}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">{stageNickname(s)}</div>
            </div>
          ))}
        </div>

        {/* Special collections divider */}
        <div className="mt-5 flex items-center gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Special collections
          </div>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {SPECIAL_STAGES.map((s) => (
            <div key={s} className="rounded-2xl border p-3">
              <div className="flex items-center justify-between">
                <span className={stageBadgeClass(s)}>{stageLabel(s)}</span>
                <span className="text-lg font-bold">{totalsByStage.get(s) ?? 0}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">{stageNickname(s)}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
