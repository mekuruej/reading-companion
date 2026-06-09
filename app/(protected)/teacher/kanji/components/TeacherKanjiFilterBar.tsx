type TeacherKanjiFilterBarProps = {
  studentFilter: string;
  bookFilter: string;
  statusFilter: string;
  studentOptions: Array<[string, string]>;
  bookOptions: Array<[string, string]>;
  onStudentFilterChange: (value: string) => void;
  onBookFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
};

export default function TeacherKanjiFilterBar({
  studentFilter,
  bookFilter,
  statusFilter,
  studentOptions,
  bookOptions,
  onStudentFilterChange,
  onBookFilterChange,
  onStatusFilterChange,
}: TeacherKanjiFilterBarProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-semibold text-stone-500">
          Student
        </span>
        <select
          value={studentFilter}
          onChange={(event) => onStudentFilterChange(event.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All students</option>
          {studentOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-xs font-semibold text-stone-500">
          Book
        </span>
        <select
          value={bookFilter}
          onChange={(event) => onBookFilterChange(event.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All books</option>
          {bookOptions.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </label>

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
          <option value="all">All</option>
          <option value="flagged_review">Flagged</option>
          <option value="needs_reading">Needs reading</option>
          <option value="needs_work">Needs work</option>
          <option value="complete">Complete</option>
          <option value="excluded">Excluded</option>
        </select>
      </label>
    </div>
  );
}