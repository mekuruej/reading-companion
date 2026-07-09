export type TeacherSnapshotStat = {
  label: string;
  value: string;
  note?: string;
};

type TeacherSnapshotStatGridProps = {
  stats: TeacherSnapshotStat[];
};

export default function TeacherSnapshotStatGrid({
  stats,
}: TeacherSnapshotStatGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        >
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
            {stat.label}
          </div>
          <div className="mt-2 text-2xl font-black text-stone-950">{stat.value}</div>
          {stat.note ? (
            <div className="mt-1 text-xs leading-5 text-stone-500">{stat.note}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
