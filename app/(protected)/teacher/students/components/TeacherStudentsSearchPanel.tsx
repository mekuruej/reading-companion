type TeacherStudentsSearchPanelProps = {
  value: string;
  onChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
};

export default function TeacherStudentsSearchPanel({
  value,
  onChange,
  filteredCount,
  totalCount,
}: TeacherStudentsSearchPanelProps) {
  const hasSearch = value.trim().length > 0;

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <label className="grid gap-2 text-sm font-semibold text-stone-700">
        Search students
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 outline-none transition focus:border-stone-400"
          placeholder="Search name, username, level, lesson day, or current book"
        />
      </label>

      {hasSearch ? (
        <p className="mt-2 text-xs font-medium text-stone-500">
          Showing {filteredCount} of {totalCount} students.
        </p>
      ) : null}
    </div>
  );
}