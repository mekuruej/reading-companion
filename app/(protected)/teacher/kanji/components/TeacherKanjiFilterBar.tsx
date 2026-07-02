type TeacherKanjiFilterBarProps = {
  statusFilter: string;
  jlptFilter: string;
  onStatusFilterChange: (value: string) => void;
  onJlptFilterChange: (value: string) => void;
};

export default function TeacherKanjiFilterBar({
  statusFilter,
  jlptFilter,
  onStatusFilterChange,
  onJlptFilterChange,
}: TeacherKanjiFilterBarProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-semibold text-stone-500">
          Status
        </span>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="active">Needs attention</option>
          <option value="flagged_review">Flagged</option>
          <option value="complete">Complete</option>
          <option value="excluded">Excluded</option>
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-xs font-semibold text-stone-500">
          JLPT
        </span>
        <select
          value={jlptFilter}
          onChange={(event) => onJlptFilterChange(event.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All levels</option>
          <option value="N5">N5</option>
          <option value="N4">N4</option>
          <option value="N3">N3</option>
          <option value="N2">N2</option>
          <option value="N1">N1</option>
          <option value="unlabeled">Unlabeled</option>
        </select>
      </label>
    </div>
  );
}
