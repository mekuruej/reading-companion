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
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-500">
        Not enough community reader-fit data yet.
      </div>
    );
  }

  return (
    <TeacherSnapshotStatGrid stats={stats} compact />
  );
}
