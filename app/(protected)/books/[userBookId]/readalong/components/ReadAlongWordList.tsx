import type { ComponentProps, ReactNode } from "react";

import ReadAlongWordCard from "./ReadAlongWordCard";

type ReadAlongWordCardProps = ComponentProps<typeof ReadAlongWordCard>;

type ReadAlongWord = ReadAlongWordCardProps["word"];
type SupportMode = ReadAlongWordCardProps["supportMode"];
type WordColorInfo = ReadAlongWordCardProps["colorInfo"];

type ReadAlongWordListProps = {
  words: ReadAlongWord[];
  supportMode: SupportMode;
  fadedThroughIndex: number;
  getColorInfo: (word: ReadAlongWord) => WordColorInfo;
  setWordRef: (wordId: string, element: HTMLDivElement | null) => void;
  onProgressTap: (index: number, wordId: string) => void;
  canAddAfter?: boolean;
  activeAddAfterWordId?: string | null;
  activeAddPlacement?: "before" | "after";
  renderAddAfterPanel?: (word: ReadAlongWord) => ReactNode;
  onOpenAddAfter?: (word: ReadAlongWord, placement: "before" | "after") => void;
};

// List of saved-word support cards for the current Read Along page.
// page.tsx still owns current page selection, color lookup data, refs,
// fade progress, and tap-to-scroll behavior.
export default function ReadAlongWordList({
  words,
  supportMode,
  fadedThroughIndex,
  getColorInfo,
  setWordRef,
  onProgressTap,
  canAddAfter = false,
  activeAddAfterWordId = null,
  activeAddPlacement = "after",
  renderAddAfterPanel,
  onOpenAddAfter,
}: ReadAlongWordListProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-[60vh]">
      {words.map((word, index) => {
        const isFaded = index <= fadedThroughIndex;
        const colorInfo = getColorInfo(word);

        return (
          <ReadAlongWordCard
            key={word.id}
            word={word}
            supportMode={supportMode}
            isFaded={isFaded}
            colorInfo={colorInfo}
            setWordRef={setWordRef}
            onProgressTap={() => onProgressTap(index, word.id)}
            canAddAfter={canAddAfter}
            canAddBefore={canAddAfter && index === 0}
            isAddAfterOpen={activeAddAfterWordId === word.id && activeAddPlacement === "after"}
            isAddBeforeOpen={activeAddAfterWordId === word.id && activeAddPlacement === "before"}
            addAfterPanel={renderAddAfterPanel?.(word)}
            onOpenAddAfter={() => onOpenAddAfter?.(word, "after")}
            onOpenAddBefore={() => onOpenAddAfter?.(word, "before")}
          />
        );
      })}
    </div>
  );
}
