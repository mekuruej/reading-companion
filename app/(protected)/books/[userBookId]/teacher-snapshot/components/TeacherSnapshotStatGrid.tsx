import StatCard from "../../stats/components/StatCard";

export type TeacherSnapshotStat = {
  label: string;
  value: string;
  note?: string;
};

type TeacherSnapshotStatGridProps = {
  stats: TeacherSnapshotStat[];
};

export default function TeacherSnapshotStatGrid({ stats }: TeacherSnapshotStatGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
    </div>
  );
}
