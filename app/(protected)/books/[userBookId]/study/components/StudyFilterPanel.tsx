import type { LibraryStudyColor } from "@/lib/libraryStudyColor";

function colorDotClass(color: LibraryStudyColor) {
  if (color === "red") return "border-red-700 bg-red-500";
  if (color === "orange") return "border-orange-700 bg-orange-500";
  if (color === "yellow") return "border-yellow-500 bg-yellow-300";
  if (color === "green") return "border-emerald-700 bg-emerald-500";
  if (color === "blue") return "border-sky-700 bg-sky-500";
  if (color === "purple") return "border-violet-700 bg-violet-500";
  if (color === "grey") return "border-slate-700 bg-slate-500";
  return "border-slate-400 bg-slate-300";
}

function colorLabel(color: LibraryStudyColor) {
  if (color === "grey") return "Limbo";
  if (color === "none") return "Not ready";
  return color.charAt(0).toUpperCase() + color.slice(1);
}

type StudyFilterPanelProps = {
  jlptLevels: readonly string[];
  jlptSelected: string[];
  colorOptions: readonly LibraryStudyColor[];
  colorSelected: LibraryStudyColor[];
  chapterFilter: string;
  chapterOptions: { value: string; label: string }[];
  repeatsOnly: boolean;
  onToggleJlpt: (level: string) => void;
  onSelectAllJlpt: () => void;
  onClearJlpt: () => void;
  onToggleColor: (color: LibraryStudyColor) => void;
  onSelectAllColors: () => void;
  onClearColors: () => void;
  onChapterFilterChange: (value: string) => void;
  onRepeatsOnlyChange: (checked: boolean) => void;
};

export default function StudyFilterPanel({
  jlptLevels,
  jlptSelected,
  colorOptions,
  colorSelected,
  chapterFilter,
  chapterOptions,
  repeatsOnly,
  onToggleJlpt,
  onSelectAllJlpt,
  onClearJlpt,
  onToggleColor,
  onSelectAllColors,
  onClearColors,
  onChapterFilterChange,
  onRepeatsOnlyChange,
}: StudyFilterPanelProps) {
  const primaryColorOptions = colorOptions.filter((color) => color !== "grey" && color !== "none");
  const secondaryColorOptions = colorOptions.filter((color) => color === "grey" || color === "none");

  function renderColorOption(color: LibraryStudyColor, showLabel = false) {
    const checkedColor = colorSelected.includes(color);
    const label = colorLabel(color);

    return (
      <label
        key={color}
        title={label}
        className={`flex h-10 w-full items-center justify-center gap-2 rounded-full border px-3 transition ${checkedColor
          ? "border-slate-300 bg-slate-50 shadow-sm"
          : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
      >
        <input
          type="checkbox"
          checked={checkedColor}
          onChange={() => onToggleColor(color)}
          aria-label={`Filter ${label} cards`}
        />
        <span
          className={`h-5 w-5 rounded-full border-2 shadow-sm ${colorDotClass(color)}`}
        />
        {showLabel ? <span className="text-sm text-slate-700">{label}</span> : null}
      </label>
    );
  }

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

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Colors
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {primaryColorOptions.map((color) => renderColorOption(color))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {secondaryColorOptions.map((color) => renderColorOption(color, true))}
          <button
            type="button"
            onClick={onSelectAllColors}
            className="rounded-lg bg-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-300"
          >
            All
          </button>

          <button
            type="button"
            onClick={onClearColors}
            className="rounded-lg bg-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-300"
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
