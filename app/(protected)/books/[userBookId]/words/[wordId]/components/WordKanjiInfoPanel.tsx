type KanjiMetaItem = {
  kanji: string;
  strokes: number | null;
  radical: string | null;
};

type WordKanjiInfoPanelProps = {
  dictionaryLoading: boolean;
  kanjiMeta: KanjiMetaItem[];
};

export default function WordKanjiInfoPanel({
  dictionaryLoading,
  kanjiMeta,
}: WordKanjiInfoPanelProps) {
  return (
    <div className="mt-2 rounded-xl border p-4">
      <div className="mb-2 text-sm font-semibold">Kanji Info</div>

      {dictionaryLoading ? (
        <div className="text-sm text-gray-500">Loading kanji info…</div>
      ) : kanjiMeta.length === 0 ? (
        <div className="text-sm text-gray-500">No kanji info for this word.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {kanjiMeta.map((k) => (
            <span
              key={k.kanji}
              className="rounded-full border bg-stone-50 px-3 py-1 text-sm"
            >
              {k.kanji} · {k.strokes ?? "?"} strokes
              {k.radical ? ` · radical ${k.radical}` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}