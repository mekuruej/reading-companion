type StudyFilterPanelProps = {
  jlptLevels: readonly string[];
  jlptSelected: string[];
  chapterFilter: string;
  chapterOptions: { value: string; label: string }[];
  repeatsOnly: boolean;
  onToggleJlpt: (level: string) => void;
  onSelectAllJlpt: () => void;
  onClearJlpt: () => void;
  onChapterFilterChange: (value: string) => void;
  onRepeatsOnlyChange: (checked: boolean) => void;
};

export default function StudyFilterPanel({
  jlptLevels,
  jlptSelected,
  chapterFilter,
  chapterOptions,
  repeatsOnly,
  onToggleJlpt,
  onSelectAllJlpt,
  onClearJlpt,
  onChapterFilterChange,
  onRepeatsOnlyChange,
}: StudyFilterPanelProps) {
  return (
    <div className="mb-2 w-full max-w-2xl space-y-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {jlptLevels.map((level) => {
            const checkedLevel = jlptSelected.includes(level);

            return (
              <label
                key={level}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={checkedLevel}
                  onChange={() => onToggleJlpt(level)}
                />
                {level}
              </label>
            );
          })}

          <button
            type="button"
            onClick={onSelectAllJlpt}
            className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-300"
          >
            All
          </button>

          <button
            type="button"
            onClick={onClearJlpt}
            className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={chapterFilter}
            onChange={(event) => onChapterFilterChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Chapters</option>
            {chapterOptions.map((chapter) => (
              <option key={chapter.value} value={chapter.value}>
                {chapter.label}
              </option>
            ))}
          </select>

          <label
            className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            title="Show only words that appear 2+ times in this book"
          >
            <input
              type="checkbox"
              checked={repeatsOnly}
              onChange={(event) => onRepeatsOnlyChange(event.target.checked)}
            />
            Repeats only
          </label>
        </div>
      </div>
    </div>
  );
}