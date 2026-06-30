import type { ComponentProps } from "react";

import LibraryColorBadge from "@/components/LibraryColorBadge";

type SupportMode = "full" | "reading" | "meaning";

type LibraryColorBadgeProps = ComponentProps<typeof LibraryColorBadge>;

type WordColorInfo = {
  colorStatus: LibraryColorBadgeProps["colorStatus"];
  stageLabel: LibraryColorBadgeProps["stageLabel"];
};

type ReadAlongWord = {
  id: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  jlpt?: string | null;
  meaning_choice_index?: number | null;
  hide_kanji_in_reading_support?: boolean | null;
};

type ReadAlongWordCardProps = {
  word: ReadAlongWord;
  supportMode: SupportMode;
  isFaded: boolean;
  colorInfo: WordColorInfo | null;
  setWordRef: (wordId: string, element: HTMLDivElement | null) => void;
  onProgressTap: () => void;
};

function normalizeJlptLabel(jlpt?: string | null) {
  const normalized = jlpt?.trim().toUpperCase();

  if (!normalized || normalized === "NON-JLPT" || normalized === "NONE") {
    return null;
  }

  return normalized.startsWith("N") ? normalized : `N${normalized}`;
}

function definitionLabel(index?: number | null) {
  if (typeof index !== "number" || !Number.isFinite(index) || index < 0) {
    return null;
  }

  return `Def. ${index + 1}`;
}

function savedWordBadgeLabel(word: ReadAlongWord) {
  const parts = [normalizeJlptLabel(word.jlpt), definitionLabel(word.meaning_choice_index)].filter(
    Boolean
  );

  return parts.length > 0 ? parts.join(" · ") : "Saved";
}

function savedWordBorderClass(
  colorInfo: WordColorInfo | null,
  isFaded: boolean
) {
  if (isFaded) {
    return "border-stone-200 border-l-stone-200 bg-stone-50 opacity-35";
  }

  const color = colorInfo?.colorStatus?.color;

  switch (color) {
    case "red":
      return "border-stone-200 border-l-red-300 bg-white hover:border-l-red-400 hover:bg-stone-50";
    case "orange":
      return "border-stone-200 border-l-orange-300 bg-white hover:border-l-orange-400 hover:bg-stone-50";
    case "yellow":
      return "border-stone-200 border-l-amber-300 bg-white hover:border-l-amber-400 hover:bg-stone-50";
    case "green":
      return "border-stone-200 border-l-emerald-300 bg-white hover:border-l-emerald-400 hover:bg-stone-50";
    case "blue":
      return "border-stone-200 border-l-sky-300 bg-white hover:border-l-sky-400 hover:bg-stone-50";
    case "purple":
      return "border-stone-200 border-l-violet-300 bg-white hover:border-l-violet-400 hover:bg-stone-50";
    case "grey":
      return "border-stone-200 border-l-slate-300 bg-white hover:border-l-slate-400 hover:bg-stone-50";
    default:
      return "border-stone-200 border-l-stone-200 bg-white hover:bg-stone-50";
  }
}

// One saved-word support card in the Read Along reader.
// page.tsx still owns word mapping, fade progress, refs, scroll behavior,
// support mode state, and Library Study color lookup.
export default function ReadAlongWordCard({
  word,
  supportMode,
  isFaded,
  colorInfo,
  setWordRef,
  onProgressTap,
}: ReadAlongWordCardProps) {
  const displaySurface =
    (word.hide_kanji_in_reading_support
      ? word.reading || word.surface
      : word.surface) || "—";

  return (
    <div
      ref={(element) => {
        setWordRef(word.id, element);
      }}
      onClick={onProgressTap}
      className={`relative cursor-pointer rounded-2xl border border-l-8 px-4 py-3 pr-36 transition sm:pr-40 ${savedWordBorderClass(
        colorInfo,
        isFaded
      )}`}
    >
      {colorInfo ? (
        <div className="absolute right-4 top-3">
          <LibraryColorBadge
            colorStatus={colorInfo.colorStatus}
            label={savedWordBadgeLabel(word)}
          />
        </div>
      ) : null}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="text-xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-2xl">
            {displaySurface}
          </div>

          {(supportMode === "full" || supportMode === "reading") && (
            <div className="text-sm text-stone-500 sm:text-base">
              {word.reading || "—"}
            </div>
          )}
        </div>

        {(supportMode === "full" || supportMode === "meaning") && (
          <div className="mt-2 text-sm leading-6 text-stone-700 sm:text-base">
            {word.meaning || "—"}
          </div>
        )}
      </div>
    </div>
  );
}
