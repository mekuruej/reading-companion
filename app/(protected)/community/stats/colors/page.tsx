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
import ColorGuideGroupLabel from "./components/ColorGuideGroupLabel";
import ColorGuideStepCard from "./components/ColorGuideStepCard";
import ReadingColorsGuide from "./components/ReadingColorsGuide";
import ReadingColorTotalsGrid, {
  type ReadingColorTotalRow,
} from "./components/ReadingColorTotalsGrid";
import SupportLoopCard from "./components/SupportLoopCard";
import LimboSupportCard from "./components/LimboSupportCard";
import ReadingColorSupportSection from "./components/ReadingColorSupportSection";
import ColorMovementInfoSection from "./components/ColorMovementInfoSection";

type ColorKey = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
type MainStage = ColorKey | "grey";

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

export default function ReadingColorsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [allTimeTotals, setAllTimeTotals] = useState<LibraryStudyColorTotals>(
    emptyLibraryStudyColorTotals()
  );

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

          setAllTimeTotals(emptyLibraryStudyColorTotals());

          setAllTimeLimboTotals(emptyLibraryStudyLimboTotals());
          return;
        }

        const allTimeBreakdown = await fetchLibraryStudyColorBreakdown(user.id);
        if (!isMounted) return;



        setAllTimeTotals(allTimeBreakdown.colorTotals);
        setAllTimeLimboTotals(allTimeBreakdown.limboTotals);
      } catch (error: any) {
        console.error("Error loading reading colors:", error);

        if (!isMounted) return;

        setErrorMsg(error?.message ?? "Could not load reading colors.");

        setAllTimeTotals(emptyLibraryStudyColorTotals());

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
        key: "purple" as const,
        label: "Purple",
        shortMeaning: "Mastered",
        cardClasses: "border-purple-200 bg-white text-purple-700",

        dotClass: "bg-purple-500",
        valueClass: "text-purple-900",
      },
      {
        key: "blue" as const,
        label: "Blue",
        shortMeaning: "Meaning Gate",
        cardClasses: "border-blue-200 bg-white text-blue-700",

        dotClass: "bg-blue-500",
        valueClass: "text-blue-900",
      },
      {
        key: "green" as const,
        label: "Green",
        shortMeaning: "Reading Gate",
        cardClasses: "border-green-200 bg-white text-green-700",

        dotClass: "bg-green-500",
        valueClass: "text-green-900",
      },
      {
        key: "yellow" as const,
        label: "Yellow",
        shortMeaning: "Readiness checkpoint",
        cardClasses: "border-yellow-200 bg-white text-yellow-700",

        dotClass: "bg-yellow-400",
        valueClass: "text-yellow-900",
      },
      {
        key: "orange" as const,
        label: "Orange",
        shortMeaning: "Starting to repeat",
        cardClasses: "border-orange-200 bg-white text-orange-700",

        dotClass: "bg-orange-500",
        valueClass: "text-orange-900",
      },
      {
        key: "red" as const,
        label: "Red",
        shortMeaning: "New / needs support",
        cardClasses: "border-red-200 bg-white text-red-700",

        dotClass: "bg-red-500",
        valueClass: "text-red-900",
      },
    ],
    []
  );

  const colorTotalRows: ReadingColorTotalRow[] = useMemo(
    () =>
      colorItems.map((item) => {
        const allTimeValue = colorValue(allTimeTotals, item.key);

        return {
          key: item.key,
          label: item.label,
          shortMeaning: item.shortMeaning,
          cardClasses: item.cardClasses,
          dotClass: item.dotClass,

          valueClass: item.valueClass,

          allTimeValue,

        };
      }),
    [allTimeTotals, colorItems]
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
        <ReadingColorsGuide colorLabel={colorLabel} stagePill={stagePill} />
      </div>
      <ReadingColorsErrorBanner message={errorMsg} />
      <ReadingColorTotalsGrid
        rows={colorTotalRows}
        loading={loading}

      />
      <ReadingColorSupportSection>
        <SupportLoopCard />

        {limboItems.map((item) => {
          const allTimeValue = limboValue(allTimeLimboTotals, item.key);

          return (
            <LimboSupportCard
              key={item.key}
              label={item.label}
              shortMeaning={item.shortMeaning}
              detail={item.detail}
              cardClasses={item.cardClasses}
              dotClass={item.dotClass}

              valueClass={item.valueClass}
              loading={loading}

              allTimeValue={allTimeValue}


            />
          );
        })}
      </ReadingColorSupportSection>
      <ColorMovementInfoSection />
    </main>
  );
}
