type TeacherKanjiFilterBarProps = {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
};

export default function TeacherKanjiFilterBar({
  statusFilter,
  onStatusFilterChange,
}: TeacherKanjiFilterBarProps) {
  return (
    <div className="max-w-xs">
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
    </div>
  );
}
