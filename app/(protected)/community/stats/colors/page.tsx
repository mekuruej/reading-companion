// Reading Colors

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  emptyLibraryStudyColorTotals,
  emptyLibraryStudyLimboTotals,
  fetchLibraryStudyColorBreakdown,
  type LibraryStudyColorTotals,
  type LibraryStudyLimboReason,
  type LibraryStudyLimboTotals,
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

function limboValue(
  totals: LibraryStudyLimboTotals,
  key: LibraryStudyLimboReason
) {
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

  const [monthLimboTotals, setMonthLimboTotals] =
    useState<LibraryStudyLimboTotals>(emptyLibraryStudyLimboTotals());
  const [previousLimboTotals, setPreviousLimboTotals] =
    useState<LibraryStudyLimboTotals | null>(null);
  const [allTimeLimboTotals, setAllTimeLimboTotals] =
    useState<LibraryStudyLimboTotals>(emptyLibraryStudyLimboTotals());

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

          setMonthLimboTotals(emptyLibraryStudyLimboTotals());
          setPreviousLimboTotals(null);
          setAllTimeLimboTotals(emptyLibraryStudyLimboTotals());
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

        setMonthLimboTotals(monthBreakdown.limboTotals);
        setPreviousLimboTotals(previousBreakdown.limboTotals);
        setAllTimeLimboTotals(allTimeBreakdown.limboTotals);
      } catch (error: any) {
        console.error("Error loading reading colors:", error);

        if (!isMounted) return;

        setErrorMsg(error?.message ?? "Could not load reading colors.");
        setMonthTotals(emptyLibraryStudyColorTotals());
        setPreviousTotals(null);
        setAllTimeTotals(emptyLibraryStudyColorTotals());

        setMonthLimboTotals(emptyLibraryStudyLimboTotals());
        setPreviousLimboTotals(null);
        setAllTimeLimboTotals(emptyLibraryStudyLimboTotals());
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
        shortMeaning: "New / needs support",
        detail:
          "Words that are still new, difficult, or not ready for Ability Check yet. These need more encounters, more time, or gentler support.",
        cardClasses: "border-red-200 bg-red-50 text-red-700",
        dotClass: "bg-red-500",
        valueClass: "text-red-900",
      },
      {
        key: "orange" as const,
        label: "Orange",
        shortMeaning: "Starting to repeat",
        detail:
          "Words that are beginning to show up again. They may feel familiar, but they are still building enough reading history for a readiness check.",
        cardClasses: "border-orange-200 bg-orange-50 text-orange-700",
        dotClass: "bg-orange-500",
        valueClass: "text-orange-900",
      },
      {
        key: "yellow" as const,
        label: "Yellow",
        shortMeaning: "Readiness checkpoint",
        detail:
          "Words with enough encounters to pause and ask: is this ready for the Reading Gate, too hard right now, or better saved for later?",
        cardClasses: "border-yellow-200 bg-yellow-50 text-yellow-700",
        dotClass: "bg-yellow-400",
        valueClass: "text-yellow-900",
      },
      {
        key: "green" as const,
        label: "Green",
        shortMeaning: "Reading Gate",
        detail:
          "Words at the reading gate. Ability Check should focus on whether you can recognize or produce the reading before moving the word forward.",
        cardClasses: "border-green-200 bg-green-50 text-green-700",
        dotClass: "bg-green-500",
        valueClass: "text-green-900",
      },
      {
        key: "blue" as const,
        label: "Blue",
        shortMeaning: "Meaning Gate",
        detail:
          "Words at the meaning gate. Ability Check should focus on whether you understand the saved meaning or definition target.",
        cardClasses: "border-blue-200 bg-blue-50 text-blue-700",
        dotClass: "bg-blue-500",
        valueClass: "text-blue-900",
      },
      {
        key: "purple" as const,
        label: "Purple",
        shortMeaning: "Mastered",
        detail:
          "Words that have passed the main gates. Purple words should leave normal Ability Check and only return later through a light 久しぶり review mode.",
        cardClasses: "border-purple-200 bg-purple-50 text-purple-700",
        dotClass: "bg-purple-500",
        valueClass: "text-purple-900",
      },
    ],
    []
  );

  const limboItems = useMemo(
    () => [
      {
        key: "pre_reading_support" as const,
        label: "Before Reading Gate",
        shortMeaning: "Not ready yet",
        detail:
          "Words being held before the Reading Gate. These may need more encounters, more time, or gentler support before Ability Check.",
        cardClasses: "border-slate-200 bg-slate-50 text-slate-700",
        dotClass: "bg-slate-300",
        valueClass: "text-slate-800",
      },
      {
        key: "reading_gate_support" as const,
        label: "Reading Gate Missed",
        shortMeaning: "Reading needs support",
        detail:
          "Words that struggled at the reading check. These are not failures — they are words that need more reading support before moving forward.",
        cardClasses: "border-slate-300 bg-slate-100 text-slate-800",
        dotClass: "bg-slate-500",
        valueClass: "text-slate-900",
      },
      {
        key: "meaning_gate_support" as const,
        label: "Meaning Gate Missed",
        shortMeaning: "Meaning needs support",
        detail:
          "Words that struggled at the meaning check. These need more meaning support before they can move toward mastery.",
        cardClasses: "border-slate-400 bg-slate-200 text-slate-900",
        dotClass: "bg-slate-700",
        valueClass: "text-slate-950",
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

        <div className="mt-4 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm">
              <img
                src="/parrot.svg"
                alt=""
                aria-hidden="true"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">
                Why colors?
              </p>

              <div className="mt-2 space-y-3 text-sm leading-6 text-stone-700 sm:text-base">
                <p>
                  Do you ever look up a word and feel sure you have looked it up
                  before? Or feel like you should know a word, only to realize it is
                  very similar to another word you met somewhere else?
                </p>

                <p>
                  That feeling is the backbone of Mekuru's Reading Colors. Mekuru
                  treats noticing words while you read as part of the learning process,
                  not just something that happens before “real” study begins.
                </p>

                <p>
                  Colors and counts help words pop out when they need attention, then
                  gradually take a backseat as they become more familiar or wait until
                  you are ready for them. These numbers are movement, not a grade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {errorMsg ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-500">
          How to read this page
        </p>
        <h2 className="mt-1 text-xl font-black text-stone-900">
          How to read the movement
        </h2>
        <p className="mt-2 text-xs leading-5 text-stone-600 sm:text-sm">
          Counts update when words gain reading encounters or move through Ability
          Check. The arrows compare <strong>this month so far</strong> with{" "}
          <strong>the same stretch last month</strong>, so the comparison stays
          fair on both the 1st and the 30th.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
              This month so far
            </p>
            <p className="mt-1 text-xs font-semibold text-stone-800 sm:text-sm">
              {monthRangeLabel()}
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
              Compared with
            </p>
            <p className="mt-1 text-xs font-semibold text-stone-800 sm:text-sm">
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
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            Between gates
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-900">
            Words waiting for support
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Limbo words are not failed words. They are words being held before a
            gate or sent back for more support after a check.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {limboItems.map((item) => {
            const monthValue = limboValue(monthLimboTotals, item.key);
            const previousValue =
              previousLimboTotals == null
                ? null
                : limboValue(previousLimboTotals, item.key);
            const delta =
              previousValue == null ? null : monthValue - previousValue;
            const allTimeValue = limboValue(allTimeLimboTotals, item.key);

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
                    <h3 className="text-lg font-black">{item.label}</h3>
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
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black text-stone-900">
          When do colors change?
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-black text-stone-900">
              Reading encounters
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Saving words and meeting them again across books gives MEKURU real
              reading encounters to count. These encounters build the early color
              stages: red, orange, and yellow.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-black text-stone-900">
              Ability Check gates
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Ability Check moves words through gates: readiness, reading,
              meaning, and eventually mastery. Book Study and Kanji practice help
              you review, but they do not directly move Reading Colors.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-black text-stone-900">
              Limbo / support
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Limbo means a word is being held between gates or sent back for more
              support. It is not failure — it usually means the word needs more
              encounters, more time, or a lighter review path.
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-stone-600">
          In the yellow stage, you can decide if a word is ready for
          Ability Check. If not, you may move it back to Red. This does not mean your
          encounter history is erased. It just means the word gets more time to become
          familiar before Mekuru asks you to check it.
        </p>
      </section>
    </main>
  );
}