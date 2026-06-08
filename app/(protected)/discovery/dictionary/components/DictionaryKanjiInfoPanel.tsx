type KanjiMetaItem = {
  kanji: string;
  strokes: number | null;
  radical: string | null;
};

type DictionaryKanjiInfoPanelProps = {
  isLoading: boolean;
  kanjiMeta: KanjiMetaItem[];
};

export default function DictionaryKanjiInfoPanel({
  isLoading,
  kanjiMeta,
}: DictionaryKanjiInfoPanelProps) {
  return (
    <div className="mt-4 rounded-xl border p-4">
      <div className="mb-2 text-sm font-semibold">Kanji Info</div>

      {isLoading ? (
        <div className="text-sm text-stone-500">Loading kanji info…</div>
      ) : kanjiMeta.length === 0 ? (
        <div className="text-sm text-stone-500">No kanji info found.</div>
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