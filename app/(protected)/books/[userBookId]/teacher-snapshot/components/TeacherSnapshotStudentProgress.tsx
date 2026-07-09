export type TeacherSnapshotStudentSummary = {
  total: number;
  reading: number;
  finished: number;
  stopped: number;
};

type TeacherSnapshotStudentProgressProps = {
  summary: TeacherSnapshotStudentSummary;
};

export default function TeacherSnapshotStudentProgress({
  summary,
}: TeacherSnapshotStudentProgressProps) {
  const items = [
    { label: "Students with this book", value: summary.total },
    { label: "Currently reading", value: summary.reading },
    { label: "Finished", value: summary.finished },
    { label: "DNF / stopped", value: summary.stopped },
  ];

  if (summary.total === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-500">
        No linked students are reading this book yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        >
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
            {item.label}
          </div>
          <div className="mt-2 text-2xl font-black text-stone-950">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
