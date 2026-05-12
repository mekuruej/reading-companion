// Reading Colors

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  emptyLibraryStudyColorTotals,
  fetchLibraryStudyColorBreakdown,
  type LibraryStudyColorTotals,
} from "@/lib/libraryStudyTotals";
import { supabase } from "@/lib/supabaseClient";

type ColorKey = "red" | "orange" | "yellow" | "green" | "blue" | "purple";

function ymdLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStartDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function previousMonthStartDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function previousMonthComparisonEndDate() {
  const now = new Date();
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthDays = new Date(
    previousStart.getFullYear(),
    previousStart.getMonth() + 1,
    0
  ).getDate();

  const comparisonDays = Math.min(now.getDate(), previousMonthDays);

  return new Date(
    previousStart.getFullYear(),
    previousStart.getMonth(),
    comparisonDays + 1
  );
}

function monthRangeLabel() {
  const now = new Date();
  const start = monthStartDate();

  return `${ymdLocal(start)} → ${ymdLocal(now)}`;
}

function previousMonthRangeLabel() {
  const start = previousMonthStartDate();
  const before = previousMonthComparisonEndDate();
  const end = new Date(before);
  end.setDate(before.getDate() - 1);

  return `${ymdLocal(start)} → ${ymdLocal(end)}`;
}

function ColorDeltaPill({ value }: { value: number | null }) {
  if (value == null) return null;

  if (value === 0) {
    return (
      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-stone-500">
        → 0
      </span>
    );
  }

  const isUp = value > 0;

  return (
    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-stone-700">
      {isUp ? "↗" : "↘"} {isUp ? "+" : ""}
      {value}
    </span>
  );
}

function colorValue(totals: LibraryStudyColorTotals, key: ColorKey) {
  return totals[key] ?? 0;
}

export default function ReadingColorsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [monthTotals, setMonthTotals] = useState<LibraryStudyColorTotals>(
    emptyLibraryStudyColorTotals()
  );
  const [previousTotals, setPreviousTotals] =
    useState<LibraryStudyColorTotals | null>(null);
  const [allTimeTotals, setAllTimeTotals] = useState<LibraryStudyColorTotals>(
    emptyLibraryStudyColorTotals()
  );

  useEffect(() => {
    let isMounted = true;

    async function loadColorDetails() {
      setLoading(true);
      setErrorMsg("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          if (!isMounted) return;
          setMonthTotals(emptyLibraryStudyColorTotals());
          setPreviousTotals(null);
          setAllTimeTotals(emptyLibraryStudyColorTotals());
          return;
        }

        const since = monthStartDate();
        const previousSince = previousMonthStartDate();
        const previousBefore = previousMonthComparisonEndDate();

        const [monthBreakdown, previousBreakdown, allTimeBreakdown] =
          await Promise.all([
            fetchLibraryStudyColorBreakdown(user.id, null, { since }),
            fetchLibraryStudyColorBreakdown(user.id, null, {
              since: previousSince,
              before: previousBefore,
            }),
            fetchLibraryStudyColorBreakdown(user.id, null, {}),
          ]);

        if (!isMounted) return;

        setMonthTotals(monthBreakdown.colorTotals);
        setPreviousTotals(previousBreakdown.colorTotals);
        setAllTimeTotals(allTimeBreakdown.colorTotals);
      } catch (error: any) {
        console.error("Error loading reading colors:", error);

        if (!isMounted) return;

        setErrorMsg(error?.message ?? "Could not load reading colors.");
        setMonthTotals(emptyLibraryStudyColorTotals());
        setPreviousTotals(null);
        setAllTimeTotals(emptyLibraryStudyColorTotals());
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadColorDetails();

    return () => {
      isMounted = false;
    };
  }, []);

  const colorItems = useMemo(
    () => [
      {
        key: "red" as const,
        label: "Red",
        shortMeaning: "New / early encounters",
        detail:
          "Words that are still very new. These usually need more encounters before they become useful reading support.",
        cardClasses: "border-red-200 bg-red-50 text-red-700",
        dotClass: "bg-red-500",
        valueClass: "text-red-900",
      },
      {
        key: "orange" as const,
        label: "Orange",
        shortMeaning: "Starting to repeat",
        detail:
          "Words that are beginning to show up again. They may feel familiar, but they are not stable yet.",
        cardClasses: "border-orange-200 bg-orange-50 text-orange-700",
        dotClass: "bg-orange-500",
        valueClass: "text-orange-900",
      },
      {
        key: "yellow" as const,
        label: "Yellow",
        shortMeaning: "Seen several times",
        detail:
          "Words with enough encounters to feel worth watching. These are moving toward stronger reading support.",
        cardClasses: "border-yellow-200 bg-yellow-50 text-yellow-700",
        dotClass: "bg-yellow-400",
        valueClass: "text-yellow-900",
      },
      {
        key: "green" as const,
        label: "Green",
        shortMeaning: "Reading-ready",
        detail:
          "Words that are becoming useful for recognition while reading. You may not fully own the meaning yet.",
        cardClasses: "border-green-200 bg-green-50 text-green-700",
        dotClass: "bg-green-500",
        valueClass: "text-green-900",
      },
      {
        key: "blue" as const,
        label: "Blue",
        shortMeaning: "Meaning-ready",
        detail:
          "Words that are closer to meaning confidence. These are stronger candidates for active review.",
        cardClasses: "border-blue-200 bg-blue-50 text-blue-700",
        dotClass: "bg-blue-500",
        valueClass: "text-blue-900",
      },
      {
        key: "purple" as const,
        label: "Purple",
        shortMeaning: "Mastered",
        detail:
          "Words that have moved into the strongest study status. These should feel much more stable.",
        cardClasses: "border-purple-200 bg-purple-50 text-purple-700",
        dotClass: "bg-purple-500",
        valueClass: "text-purple-900",
      },
    ],
    []
  );

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
          Study colors
        </p>

        <h1 className="mt-2 text-3xl font-black text-stone-900 sm:text-4xl">
          Reading Colors
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
          A deeper look at how your saved words move through MEKURU’s color
          stages.
        </p>
      </div>

      {errorMsg ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <section className="mb-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-500">
          How to read this page
        </p>
        <h2 className="mt-2 text-2xl font-black text-stone-900">
          These numbers are movement, not a grade
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Counts update when you save words, log reading, or study. The arrows
          compare <strong>this month so far</strong> with{" "}
          <strong>the same stretch last month</strong>, so the comparison stays
          fair on both the 1st and the 30th.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
              This month so far
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-800">
              {monthRangeLabel()}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
              Compared with
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-800">
              {previousMonthRangeLabel()}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {colorItems.map((item) => {
          const monthValue = colorValue(monthTotals, item.key);
          const previousValue =
            previousTotals == null ? null : colorValue(previousTotals, item.key);
          const delta =
            previousValue == null ? null : monthValue - previousValue;
          const allTimeValue = colorValue(allTimeTotals, item.key);

          return (
            <div
              key={item.key}
              className={`rounded-3xl border p-5 shadow-sm ${item.cardClasses}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${item.dotClass}`}
                  />
                  <h2 className="text-xl font-black">{item.label}</h2>
                </div>

                {!loading ? <ColorDeltaPill value={delta} /> : null}
              </div>

              <p className="mt-1 text-sm font-bold">{item.shortMeaning}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/70 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                    This month
                  </p>
                  <p className={`mt-1 text-2xl font-black ${item.valueClass}`}>
                    {loading ? "—" : monthValue}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/70 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                    Current total
                  </p>
                  <p className={`mt-1 text-2xl font-black ${item.valueClass}`}>
                    {loading ? "—" : allTimeValue}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-stone-700">
                {item.detail}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black text-stone-900">
          When do colors change?
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-black text-stone-900">
              When you save words
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              New saved vocabulary gives MEKURU more word encounters to count.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-black text-stone-900">
              When you log reading
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Reading sessions can strengthen encounter patterns across your
              books.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-black text-stone-900">
              When you study
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Study activity can move words toward stronger reading and meaning
              confidence.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}