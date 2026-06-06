type KanjiStudyProgressPanelProps = {
  current: number;
  total: number;
  levelFilter: string;
  onLevelFilterChange: (value: string) => void;
};

export default function KanjiStudyProgressPanel({
  current,
  total,
  levelFilter,
  onLevelFilterChange,
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
          <option value="intermediate">Intermediate: N3/N2</option>
          <option value="advanced">Advanced: N1</option>
          <option value="unlabeled">Unlabeled</option>
          <option value="all">All levels</option>
        </select>

        <div className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-emerald-900">
          Onyomi focus · occasional kunyomi check
        </div>
      </div>
    </>
  );
}