type RelatedWordItem = {
  word: string;
  reading: string;
  meaning: string;
};

type KanjiGroupItem = {
  kanji: string;
  relatedWords: RelatedWordItem[];
};

type DictionaryRelatedKanjiWordsPanelProps = {
  groups: KanjiGroupItem[];
};

export default function DictionaryRelatedKanjiWordsPanel({
  groups,
}: DictionaryRelatedKanjiWordsPanelProps) {
  return (
    <div className="mt-4 rounded-xl border p-4">
      <div className="mb-2 text-sm font-semibold">
        Words Using These Kanji
      </div>

      {groups.length === 0 ? (
        <div className="text-sm text-stone-500">No related kanji words found.</div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.kanji}>
              <div className="mb-2 text-sm font-semibold text-stone-700">
                Words with {group.kanji}
              </div>

              {group.relatedWords.length === 0 ? (
                <div className="text-sm text-stone-500">No related words found.</div>
              ) : (
                <div className="space-y-2">
                  {group.relatedWords.map((kw, i) => (
                    <div key={`${group.kanji}-${kw.word}-${i}`} className="text-sm">
                      <span className="font-medium text-stone-900">{kw.word}</span>

                      {kw.reading ? (
                        <span className="ml-2 text-stone-600">（{kw.reading}）</span>
                      ) : null}

                      {kw.meaning ? (
                        <div className="mt-0.5 text-stone-500">{kw.meaning}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}