import type { ComponentProps } from "react";

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
          />
        );
      })}
    </div>
  );
}