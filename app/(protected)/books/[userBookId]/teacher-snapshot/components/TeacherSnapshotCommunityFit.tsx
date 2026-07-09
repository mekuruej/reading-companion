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
  advice,
  hasEnoughData,
}: TeacherSnapshotCommunityFitProps) {
  if (!hasEnoughData) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-500">
        Not enough community reader-fit data yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TeacherSnapshotStatGrid stats={stats} />

      {advice.length > 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
            Anonymous Reader Advice
          </div>

          <div className="mt-3 grid gap-2">
            {advice.map((item) => (
              <blockquote
                key={item.id}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-stone-700"
              >
                {item.text}
              </blockquote>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
