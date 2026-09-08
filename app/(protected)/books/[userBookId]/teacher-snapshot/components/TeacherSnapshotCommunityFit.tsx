import TeacherSnapshotStatGrid, { type TeacherSnapshotStat } from "./TeacherSnapshotStatGrid";

export type TeacherSnapshotCommunityAdvice = {
  id: string;
  text: string;
};

type TeacherSnapshotCommunityFitProps = {
  stats: TeacherSnapshotStat[];
  advice: TeacherSnapshotCommunityAdvice[];
  hasEnoughData: boolean;
};

export default function TeacherSnapshotCommunityFit({
  stats,
  hasEnoughData,
}: TeacherSnapshotCommunityFitProps) {
  if (!hasEnoughData) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm text-sm leading-6 text-stone-500">
        Not enough community reader-fit data yet.
      </div>
    );
  }

  return (
    <TeacherSnapshotStatGrid stats={stats} />
  );
}
