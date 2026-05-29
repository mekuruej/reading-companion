type ChapterOption = {
  key: string;
  label: string;
  wordCount: number;
};

type ReadAlongChapterSelectorProps = {
  selectedChapterKey: string;
  selectedChapterLabel: string;
  chapterOptions: ChapterOption[];
  onSelectedChapterKeyChange: (value: string) => void;
};

// Chapter selector for Read Along saved-word support.
// page.tsx still owns chapter option calculation, chapter filtering,
// and selected-chapter reset behavior.
export default function ReadAlongChapterSelector({
  selectedChapterKey,
  selectedChapterLabel,
  chapterOptions,
  onSelectedChapterKeyChange,
}: ReadAlongChapterSelectorProps) {
  return (
    <section className="mb-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-stone-900">
            {selectedChapterLabel}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Choose a chapter, or add a page number below for a more exact spot.
          </p>
        </div>

        <label className="w-full text-sm sm:w-72">
          <select
            value={selectedChapterKey}
            onChange={(event) =>
              onSelectedChapterKeyChange(event.target.value)
            }
            className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All chapters</option>
            {chapterOptions.map((chapter) => (
              <option key={chapter.key} value={chapter.key}>
                {chapter.label} · {chapter.wordCount} words
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}