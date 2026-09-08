import StatCard from "../../stats/components/StatCard";

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
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm text-sm leading-6 text-stone-500">
        No linked students are reading this book yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
