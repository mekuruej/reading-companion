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
      className={`relative cursor-pointer rounded-2xl border px-4 py-3 pr-28 transition ${
        isFaded
          ? "border-stone-200 bg-stone-50 opacity-35"
          : "border-stone-200 bg-white hover:bg-stone-50"
      }`}
    >
      {colorInfo ? (
        <div className="absolute right-4 top-3">
          <LibraryColorBadge
            colorStatus={colorInfo.colorStatus}
            stageLabel={colorInfo.stageLabel}
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