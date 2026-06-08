import type { ComponentProps } from "react";
import LibraryColorBadge from "@/components/LibraryColorBadge";
import DictionaryEntryBadges from "./DictionaryEntryBadges";
import DictionaryKanjiInfoPanel from "./DictionaryKanjiInfoPanel";
import DictionaryMeaningsList from "./DictionaryMeaningsList";
import DictionaryRelatedKanjiWordsPanel from "./DictionaryRelatedKanjiWordsPanel";
import DictionaryWordHistoryLink from "./DictionaryWordHistoryLink";

type DictionaryEntryItem = {
  word: string;
  reading: string;
  meanings: string[];
  isCommon?: boolean | null;
};

type KanjiMetaItem = {
  kanji: string;
  strokes: number | null;
  radical: string | null;
};

type RelatedWordItem = {
  word: string;
  reading: string;
  meaning: string;
};

type KanjiGroupItem = {
  kanji: string;
  relatedWords: RelatedWordItem[];
};

type DictionaryResultCardProps = {
  entry: DictionaryEntryItem;
  fallbackWord: string;
  showBadge: boolean;
  colorStatus: ComponentProps<typeof LibraryColorBadge>["colorStatus"];
  jlptLabel: string;
  isKanjiLoading: boolean;
  kanjiMeta: KanjiMetaItem[];
  kanjiGroups: KanjiGroupItem[];
};

export default function DictionaryResultCard({
  entry,
  fallbackWord,
  showBadge,
  colorStatus,
  jlptLabel,
  isKanjiLoading,
  kanjiMeta,
  kanjiGroups,
}: DictionaryResultCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-2xl font-semibold text-stone-900">
          {entry.word || "—"}
        </div>

        {showBadge ? (
          <LibraryColorBadge colorStatus={colorStatus} size="md" />
        ) : null}
      </div>

      <div className="mt-1 text-base text-stone-500">
        {entry.reading || "—"}
      </div>

      <DictionaryMeaningsList
        word={entry.word}
        reading={entry.reading}
        meanings={entry.meanings}
      />

      <DictionaryEntryBadges
        jlptLabel={jlptLabel}
        isCommon={entry.isCommon}
      />

      <DictionaryKanjiInfoPanel
        isLoading={isKanjiLoading}
        kanjiMeta={kanjiMeta}
      />

      <DictionaryRelatedKanjiWordsPanel groups={kanjiGroups} />

      <DictionaryWordHistoryLink word={entry.word || fallbackWord} />
    </div>
  );
}