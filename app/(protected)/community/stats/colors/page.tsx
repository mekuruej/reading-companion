// Reading Colors

"use client";

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
import ReadingColorsHeader from "./components/ReadingColorsHeader";
import ReadingColorsErrorBanner from "./components/ReadingColorsErrorBanner";

type ColorKey = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
type MainStage = ColorKey | "grey";

function ymdLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function previousMonthComparisonDateLabel() {
  const before = previousMonthComparisonEndDate();
  const end = new Date(before);
  end.setDate(before.getDate() - 1);

  return ymdLocal(end);
}

function ColorDeltaPill({
  value,
  className,
}: {
  value: number | null;
  className: string;
}) {
  if (value == null) return null;

  const icon = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  const label = value > 0 ? `+${value}` : String(value);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black shadow-sm ${className}`}>
      <span className="text-lg leading-none">{icon}</span>
      {label}
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

function colorLabel(stage: MainStage) {
  if (stage === "grey") return "Limbo";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function stagePill(stage: MainStage) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold";

  if (stage === "red") return `${base} bg-red-600 text-white`;
  if (stage === "orange") return `${base} bg-orange-500 text-white`;
  if (stage === "yellow") return `${base} bg-yellow-300 text-stone-900`;
  if (stage === "green") return `${base} bg-green-600 text-white`;
  if (stage === "blue") return `${base} bg-blue-600 text-white`;
  if (stage === "purple") return `${base} bg-purple-600 text-white`;
  return `${base} bg-slate-500 text-white`;
}

function GroupLabel({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200" />
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {title}
        </div>
        <div className="h-px flex-1 bg-stone-200" />
      </div>
      <p className="mt-2 text-center text-xs leading-5 text-stone-500">
        {detail}
      </p>
    </div>
  );
}

function ColorStepCard({
  stage,
  title,
  detail,
  note,
}: {
  stage: MainStage;
  title: string;
  detail: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <span className={stagePill(stage)}>{colorLabel(stage)}</span>
      <div className="mt-2 text-sm font-semibold leading-5 text-stone-900">
        {title}
      </div>
      <div className="mt-1 text-xs leading-5 text-stone-600">{detail}</div>
      <div className="mt-2 text-[11px] leading-4 text-stone-500">{note}</div>
    </div>
  );
}

export default function ReadingColorsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [previousTotals, setPreviousTotals] =
    useState<LibraryStudyColorTotals | null>(null);
  const [allTimeTotals, setAllTimeTotals] = useState<LibraryStudyColorTotals>(
    emptyLibraryStudyColorTotals()
  );

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
          setPreviousTotals(null);
          setAllTimeTotals(emptyLibraryStudyColorTotals());

          setPreviousLimboTotals(null);
          setAllTimeLimboTotals(emptyLibraryStudyLimboTotals());
          return;
        }

        const previousBefore = previousMonthComparisonEndDate();

        const [previousBreakdown, allTimeBreakdown] =
          await Promise.all([
            fetchLibraryStudyColorBreakdown(user.id, null, {
              before: previousBefore,
            }),
            fetchLibraryStudyColorBreakdown(user.id, null, {}),
          ]);

        if (!isMounted) return;

        setPreviousTotals(previousBreakdown.colorTotals);
        setAllTimeTotals(allTimeBreakdown.colorTotals);

        setPreviousLimboTotals(previousBreakdown.limboTotals);
        setAllTimeLimboTotals(allTimeBreakdown.limboTotals);
      } catch (error: any) {
        console.error("Error loading reading colors:", error);

        if (!isMounted) return;

        setErrorMsg(error?.message ?? "Could not load reading colors.");
        setPreviousTotals(null);
        setAllTimeTotals(emptyLibraryStudyColorTotals());

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
        cardClasses: "border-red-200 bg-white text-red-700",
        deltaClass: "bg-red-50 text-red-800 ring-1 ring-red-200",
        dotClass: "bg-red-500",
        valueClass: "text-red-900",
      },
      {
        key: "orange" as const,
        label: "Orange",
        shortMeaning: "Starting to repeat",
        cardClasses: "border-orange-200 bg-white text-orange-700",
        deltaClass: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
        dotClass: "bg-orange-500",
        valueClass: "text-orange-900",
      },
      {
        key: "yellow" as const,
        label: "Yellow",
        shortMeaning: "Readiness checkpoint",
        cardClasses: "border-yellow-200 bg-white text-yellow-700",
        deltaClass: "bg-yellow-50 text-yellow-900 ring-1 ring-yellow-200",
        dotClass: "bg-yellow-400",
        valueClass: "text-yellow-900",
      },
      {
        key: "green" as const,
        label: "Green",
        shortMeaning: "Reading Gate",
        cardClasses: "border-green-200 bg-white text-green-700",
        deltaClass: "bg-green-50 text-green-800 ring-1 ring-green-200",
        dotClass: "bg-green-500",
        valueClass: "text-green-900",
      },
      {
        key: "blue" as const,
        label: "Blue",
        shortMeaning: "Meaning Gate",
        cardClasses: "border-blue-200 bg-white text-blue-700",
        deltaClass: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
        dotClass: "bg-blue-500",
        valueClass: "text-blue-900",
      },
      {
        key: "purple" as const,
        label: "Purple",
        shortMeaning: "Mastered",
        cardClasses: "border-purple-200 bg-white text-purple-700",
        deltaClass: "bg-purple-50 text-purple-800 ring-1 ring-purple-200",
        dotClass: "bg-purple-500",
        valueClass: "text-purple-900",
      },
    ],
    []
  );

  const limboItems = useMemo(
    () => [
      {
        key: "reading_gate_support" as const,
        label: "Reading Gate Missed",
        shortMeaning: "Reading needs support",
        detail:
          "Words that reached the Reading Gate from Green, missed the reading check, and need support before moving toward Blue.",
        cardClasses: "border-slate-300 bg-white text-slate-800",
        deltaClass: "bg-slate-100 text-slate-800 ring-1 ring-slate-300",
        dotClass: "bg-slate-500",
        valueClass: "text-slate-900",
      },
      {
        key: "meaning_gate_support" as const,
        label: "Meaning Gate Missed",
        shortMeaning: "Meaning needs support",
        detail:
          "Words that reached the Meaning Gate from Blue, missed the meaning check, and need support before moving toward Purple.",
        cardClasses: "border-slate-400 bg-white text-slate-900",
        deltaClass: "bg-slate-200 text-slate-950 ring-1 ring-slate-400",
        dotClass: "bg-slate-700",
        valueClass: "text-slate-950",
      },
    ],
    []
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <ReadingColorsHeader />
        <details className="group mt-4 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4 shadow-sm sm:p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">
                Why colors?
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Mekuru uses colors to notice words, track movement, and separate
                reading encounters from Ability Check gates.
              </p>
            </div>

            <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm group-open:hidden">
              Open
            </span>
            <span className="hidden rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm group-open:inline-flex">
              Close
            </span>
          </summary>

          <div className="mt-5 border-t border-sky-100 pt-5">
            <div className="flex items-start gap-3">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm">
                <img
                  src="/parrot.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="space-y-3 text-sm leading-6 text-stone-700 sm:text-base">
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

            <div className="mt-6 space-y-6 rounded-2xl border border-white/80 bg-white/80 p-4">
              <div>
                <GroupLabel
                  title="Based on encounters"
                  detail="Red, orange, and yellow come from real reading encounters, not quiz answers. After yellow, you can decide to repeat these three levels if you are not ready for the Reading Gate."
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <ColorStepCard
                    stage="red"
                    title="Early encounter support"
                    detail="You have started meeting this word in real reading, but it is still too new for Ability Check."
                    note="If a word feels far above your level, Mekuru can give it more time."
                  />
                  <ColorStepCard
                    stage="orange"
                    title="Repeated encounter support"
                    detail="The word is showing up again, but Mekuru is still gathering reading support before testing it."
                    note="Encounters keep building quietly in the background."
                  />
                  <ColorStepCard
                    stage="yellow"
                    title="Ready for gate checks"
                    detail="Yellow means the word has enough encounter support to ask whether it is ready for Ability Check."
                    note="Yellow is the readiness checkpoint before the Reading Gate."
                  />
                </div>
              </div>

              <div>
                <GroupLabel
                  title="Based on ability"
                  detail="Green, blue, purple, and Limbo come from Ability Check results."
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <ColorStepCard
                    stage="green"
                    title="Reading Gate"
                    detail="The word is ready for a reading question in Ability Check."
                    note="Pass this gate to move toward meaning."
                  />
                  <ColorStepCard
                    stage="blue"
                    title="Meaning Gate"
                    detail="The reading is supported, and the word is ready for a meaning question."
                    note="Advanced words may care about the saved definition number."
                  />
                  <ColorStepCard
                    stage="purple"
                    title="Mastered"
                    detail="The word has cleared the major study gates and is no longer demanding regular attention."
                    note="Purple cards return only occasionally."
                  />
                  <ColorStepCard
                    stage="grey"
                    title="Limbo: between gates"
                    detail="Limbo only appears after a word has entered the gate path: between Green and Blue, or between Blue and Purple."
                    note="Choosing Not yet after Yellow repeats Red, Orange, and Yellow instead."
                  />
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <ReadingColorsErrorBanner message={errorMsg} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {colorItems.map((item) => {
          const previousValue =
            previousTotals == null ? null : colorValue(previousTotals, item.key);
          const allTimeValue = colorValue(allTimeTotals, item.key);
          const delta =
            previousValue == null ? null : allTimeValue - previousValue;

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

                {!loading ? (
                  <ColorDeltaPill value={delta} className={item.deltaClass} />
                ) : null}
              </div>

              <p className="mt-1 text-sm font-bold">{item.shortMeaning}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/70 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                    On {previousMonthComparisonDateLabel()}
                  </p>
                  <p className={`mt-1 text-2xl font-black ${item.valueClass}`}>
                    {loading || previousValue == null ? "—" : previousValue}
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
            Limbo words are not failed words. They sit between Green and Blue after
            a missed Reading Gate, or between Blue and Purple after a missed Meaning Gate.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-amber-200 bg-white p-5 text-amber-900 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                Red 2
              </span>
              <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-black text-white">
                Orange 2
              </span>
              <span className="rounded-full bg-yellow-300 px-2.5 py-1 text-xs font-black text-stone-900">
                Yellow 2
              </span>
            </div>
            <h3 className="mt-4 text-lg font-black">Extra encounter support</h3>
            <p className="mt-1 text-sm font-bold">Chosen before the reading gate</p>
            <p className="mt-4 text-sm leading-6 text-stone-700">
              If a word reaches Yellow but still feels too far above your level,
              you can send it into another encounter loop. Red 2, Orange 2, and
              Yellow 2 mean Mekuru is waiting for more real reading encounters
              before asking again. The number can keep growing: Red 3, Orange 3,
              Yellow 3, and so on.
            </p>
          </div>

          {limboItems.map((item) => {
            const previousValue =
              previousLimboTotals == null
                ? null
                : limboValue(previousLimboTotals, item.key);
            const allTimeValue = limboValue(allTimeLimboTotals, item.key);
            const delta =
              previousValue == null ? null : allTimeValue - previousValue;

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

                  {!loading ? (
                    <ColorDeltaPill value={delta} className={item.deltaClass} />
                  ) : null}
                </div>

                <p className="mt-1 text-sm font-bold">{item.shortMeaning}</p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/70 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                      On {previousMonthComparisonDateLabel()}
                    </p>
                    <p className={`mt-1 text-2xl font-black ${item.valueClass}`}>
                      {loading || previousValue == null ? "—" : previousValue}
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
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm font-black text-stone-900">
              Reading encounters
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Saving words and meeting them again across books gives MEKURU real
              reading encounters to count. These encounters build the early color
              stages: red, orange, and yellow.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm font-black text-stone-900">
              Ability Check gates
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Ability Check moves words through gates: readiness, reading,
              meaning, and eventually mastery. Book Study and Kanji practice help
              you review, but they do not directly move Reading Colors.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm font-black text-stone-900">
              Limbo / support
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Limbo means a word has already entered the gate path and needs support
              between Green and Blue, or between Blue and Purple.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
