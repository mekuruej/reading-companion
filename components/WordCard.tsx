"use client";

type WordCardProps = {
  dict: any; // orthography, reading, meaning, jlpt, is_common, is_katakana, strokes
  state: any; // lookup_count, reading_stage, meaning_stage, etc.
  settings: any; // learning_profile, red_stages, orange_stages, yellow_stages, show_badge_numbers, etc.
  appearsIn?: string[];
  onIncrementLookup?: () => void;
  onToggleReadingKnown?: () => void; // "advance" button (reading → meaning → mastered)
};

// --------- helpers: base colour DOES NOT depend on stage settings ----------
function getBaseColour(dict: any, state: any): string {
  const lookupCount = state?.lookup_count ?? 0;
  const isKatakana = !!dict?.is_katakana;

  // 1) Mastered override – stays grey even if katakana
  if (
    state?.reading_stage === "mastered" &&
    state?.meaning_stage === "mastered"
  ) {
    return "grey";
  }

  // 2) Katakana path: red → orange → yellow → purple (infinite purple)
  if (isKatakana) {
    if (lookupCount === 0) return "red";
    if (lookupCount === 1) return "orange";
    if (lookupCount === 2) return "yellow";
    return "purple"; // 3+ lookups = katakana colour
  }

  // 3) Non-katakana: if reading is marked "known" and meaning not fully mastered → blue
  if (state?.reading_stage === "known" && state?.meaning_stage !== "mastered") {
    return "blue";
  }

  // 4) Non-katakana default ladder: red → orange → yellow → green
  if (lookupCount === 0) return "red";
  if (lookupCount === 1) return "orange";
  if (lookupCount === 2) return "yellow";
  if (lookupCount >= 3) return "green";

  return "red";
}

// Map colour name → Tailwind classes
function colourClasses(colour: string) {
  switch (colour) {
    case "red":
      return { text: "text-red-600", badge: "bg-red-100 text-red-700" };
    case "orange":
      return { text: "text-orange-600", badge: "bg-orange-100 text-orange-700" };
    case "yellow":
      return { text: "text-yellow-600", badge: "bg-yellow-100 text-yellow-700" };
    case "green":
      return { text: "text-green-700", badge: "bg-green-100 text-green-700" };
    case "blue":
      return { text: "text-blue-700", badge: "bg-blue-100 text-blue-700" };
    case "purple":
      return { text: "text-purple-700", badge: "bg-purple-100 text-purple-700" };
    case "grey":
    default:
      return { text: "text-gray-700", badge: "bg-gray-100 text-gray-700" };
  }
}

// For red/orange/yellow, slice lookup_count into stages like (2/3)
function getStageForColour(
  baseColour: string,
  lookupCount: number,
  settings: any
) {
  const redStages = settings?.red_stages ?? 1;
  const orangeStages = settings?.orange_stages ?? 1;
  const yellowStages = settings?.yellow_stages ?? 1;

  if (baseColour === "red") {
    const max = redStages;
    const current = Math.min(lookupCount + 1, max); // simple placeholder
    return { currentStage: current, maxStages: max };
  }

  if (baseColour === "orange") {
    const max = orangeStages;
    const current = Math.min(lookupCount + 1, max);
    return { currentStage: current, maxStages: max };
  }

  if (baseColour === "yellow") {
    const max = yellowStages;
    const current = Math.min(lookupCount + 1, max);
    return { currentStage: current, maxStages: max };
  }

  // green/blue/grey/purple → no stages
  return { currentStage: null, maxStages: null };
}

export function WordCard({
  dict,
  state,
  settings,
  appearsIn = [],
  onIncrementLookup,
  onToggleReadingKnown,
}: WordCardProps) {
  const lookupCount = state?.lookup_count ?? 0;

  // 1) Decide main colour – this DOES NOT use stage settings
  const baseColour = getBaseColour(dict, state);
  const { text: textClass, badge: badgeClass } = colourClasses(baseColour);

  const isKatakana = !!dict?.is_katakana;
  const showKatakanaBadge = isKatakana;

  // Button should appear only in the reading/meaning check zones
  const canAdvance =
    !isKatakana && (baseColour === "green" || baseColour === "blue");

  // Label changes based on colour:
  // green → "Reading ?", blue → "Meaning ?"
  let advanceLabel: string | null = null;
  if (baseColour === "green") {
    advanceLabel = "Reading ?";
  } else if (baseColour === "blue") {
    advanceLabel = "Meaning ?";
  }

  // 2) Decide stage badge only if red/orange/yellow
  const { currentStage, maxStages } = getStageForColour(
    baseColour,
    lookupCount,
    settings
  );

  const showBadge =
    settings?.show_badge_numbers &&
    maxStages &&
    maxStages > 1 &&
    currentStage !== null;

  // simple meaning formatting (array or string)
  const meaning =
    Array.isArray(dict?.meaning) ? dict.meaning.join(", ") : dict?.meaning;

  return (
    <div className="rounded-lg bg-gray-100 px-3 py-2 shadow-sm">
      {/* top row: word + badge + toggle + lookup button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-semibold ${textClass}`}>
            {dict?.orthography}
          </span>

          {showBadge && (
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${badgeClass}`}>
              {currentStage}/{maxStages}
            </span>
          )}

          {showKatakanaBadge && (
            <span
              title="Katakana-only word"
              className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white"
            >
              カ
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onToggleReadingKnown && canAdvance && advanceLabel && (
            <button
              type="button"
              onClick={onToggleReadingKnown}
              className="text-[10px] px-2 py-1 rounded bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              {advanceLabel}
            </button>
          )}

          {onIncrementLookup && (
            <button
              type="button"
              onClick={onIncrementLookup}
              className="text-xs px-2 py-1 rounded bg-white border border-gray-300 hover:bg-gray-50"
            >
              ＋{lookupCount}
            </button>
          )}
        </div>
      </div>

      {/* reading under the kanji */}
      {dict?.reading && (
        <p className="mt-0.5 text-sm text-gray-500">
          {dict.reading}
        </p>
      )}

      {/* meaning row */}
      {meaning && (
        <p className="mt-1 text-sm text-gray-700">
          {meaning}
        </p>
      )}

      {/* meta row */}
      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
        {dict?.jlpt && dict.jlpt !== "NON-JLPT" && (
          <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">
            JLPT {dict.jlpt}
          </span>
        )}
        {dict?.is_common && (
          <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">
            Common
          </span>
        )}
        {appearsIn.length > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">
            In: {appearsIn.join(", ")}
          </span>
        )}
      </div>

      {/* learning prompts based on colour (no logic yet, just text) */}
      {baseColour === "green" && (
        <p className="mt-1 text-[11px] text-emerald-700">
          Next check → Did you remember the <span className="font-semibold">reading</span>?{" "}
          <span className="text-gray-500">(Yes → blue / No → stay green)</span>
        </p>
      )}

      {baseColour === "blue" && (
        <p className="mt-1 text-[11px] text-sky-700">
          Next check → Did you remember the <span className="font-semibold">meaning</span>?{" "}
          <span className="text-gray-500">
            (Yes → grey / No → stay blue / Forgot reading → green)
          </span>
        </p>
      )}

      {baseColour === "grey" && (
        <p className="mt-1 text-[11px] text-gray-600">
          Fully known. If you forget it later, mark{" "}
          <span className="font-semibold">reading</span> or{" "}
          <span className="font-semibold">meaning</span> to move back to green/blue.
        </p>
      )}
    </div>
  );
}
