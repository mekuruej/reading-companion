import type { ComponentProps } from "react";
import Link from "next/link";
import LibraryColorBadge from "@/components/LibraryColorBadge";
import DictionaryEntryBadges from "./DictionaryEntryBadges";
import DictionaryKanjiInfoPanel from "./DictionaryKanjiInfoPanel";
import DictionaryMeaningsList from "./DictionaryMeaningsList";
import DictionaryRelatedKanjiWordsPanel from "./DictionaryRelatedKanjiWordsPanel";

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

type DictionaryPersonalHistoryItem = {
  id: string;
  bookTitle: string;
  userBookId: string;
  meaning: string | null;
  meaningChoiceIndex: number | null;
  pageNumber: number | null;
  chapterNumber: number | null;
  chapterName: string | null;
  createdAt: string | null;
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
  personalHistory: DictionaryPersonalHistoryItem[];
  chapterDisplay: (chapterNumber: number | null, chapterName: string | null) => string;
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
  personalHistory,
  chapterDisplay,
}: DictionaryResultCardProps) {
  const uniqueBookCount = new Set(personalHistory.map((item) => item.userBookId)).size;

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

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)] lg:items-start">
        <div className="space-y-4">
          <DictionaryKanjiInfoPanel
            isLoading={isKanjiLoading}
            kanjiMeta={kanjiMeta}
          />

          <DictionaryRelatedKanjiWordsPanel groups={kanjiGroups} />
        </div>

        <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-stone-900">Saved in your books</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                This is saved vocabulary history, not a complete lookup log.
              </p>
              <Link
                href="/library/vocab-list-index"
                className="mt-2 inline-flex text-xs font-bold text-sky-700 hover:text-sky-900"
              >
                Open Vocabulary Lists →
              </Link>
            </div>

            <div className="flex gap-2 text-xs font-bold text-stone-600">
              <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1">
                {personalHistory.length} saved
              </span>
              <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1">
                {uniqueBookCount} {uniqueBookCount === 1 ? "book" : "books"}
              </span>
            </div>
          </div>

          {personalHistory.length > 0 ? (
            <div className="mt-3 space-y-2">
              {personalHistory.slice(0, 6).map((item) => {
                const chapter = chapterDisplay(item.chapterNumber, item.chapterName);
                const location = [
                  chapter || null,
                  item.pageNumber != null ? `p. ${item.pageNumber}` : null,
                ].filter(Boolean).join(" · ");

                return (
                  <div key={item.id} className="rounded-xl border border-stone-200 bg-white p-3">
                    <div className="text-sm font-bold text-stone-900">{item.bookTitle}</div>
                    {location ? (
                      <div className="mt-1 text-xs font-medium text-stone-500">{location}</div>
                    ) : null}
                    {item.meaning ? (
                      <div className="mt-2 text-sm leading-6 text-stone-600">
                        {item.meaningChoiceIndex != null ? `Def ${item.meaningChoiceIndex + 1}: ` : ""}
                        {item.meaning}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-500">
              You have not saved {entry.word || fallbackWord} in your book vocabulary yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
