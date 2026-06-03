type ChapterOption = {
  value: string;
  label: string;
};

type BookVocabFilterPanelProps = {
  query: string;
  showHidden: boolean;
  chapterFilter: string;
  chapterOptions: ChapterOption[];
  onQueryChange: (value: string) => void;
  onShowHiddenChange: (value: boolean) => void;
  onChapterFilterChange: (value: string) => void;
};

// Controlled search/filter UI for the book vocabulary list.
// page.tsx still owns the filter state and filtering calculations;
// this component only renders the controls and reports changes upward.
export default function BookVocabFilterPanel({
  query,
  showHidden,
  chapterFilter,
  chapterOptions,
  onQueryChange,
  onShowHiddenChange,
  onChapterFilterChange,
}: BookVocabFilterPanelProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px]">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Try 犬, いぬ, dog, (page) 45, etc."
          className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
        />

        <label className="flex h-14 items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 shadow-sm">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => onShowHiddenChange(e.target.checked)}
            className="h-5 w-5 rounded border-stone-300 text-stone-900 focus:ring-stone-300"
          />
          <span className="font-medium">Hidden Words Only</span>
        </label>

        <select
          value={chapterFilter}
          onChange={(e) => onChapterFilterChange(e.target.value)}
          className="h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
        >
          <option value="all">All chapters</option>
          {chapterOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}