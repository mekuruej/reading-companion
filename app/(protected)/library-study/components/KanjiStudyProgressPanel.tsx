type KanjiStudyProgressPanelProps = {
  current: number;
  total: number;
  levelFilter: string;
  onLevelFilterChange: (value: string) => void;
  summaryText?: string;
};

export default function KanjiStudyProgressPanel({
  current,
  total,
  levelFilter,
  onLevelFilterChange,
  summaryText,
}: KanjiStudyProgressPanelProps) {
  return (
    <>
      <p className="text-sm text-gray-500">
        Card {current}/{total}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
        <span className="font-medium text-stone-700">Level:</span>

        <select
          value={levelFilter}
          onChange={(event) => onLevelFilterChange(event.target.value)}
          className="rounded border bg-white px-3 py-2 text-sm text-stone-800"
        >
          <option value="beginner">Beginner: N5/N4</option>
          <option value="n3">Lower Intermediate: N3</option>
          <option value="n2">Upper Intermediate: N2</option>
          <option value="advanced">Advanced: N1</option>
          <option value="unlabeled">Unlabeled</option>
          <option value="all">All levels</option>
        </select>

        {summaryText ? (
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            {summaryText}
          </div>
        ) : null}
      </div>
    </>
  );
}
