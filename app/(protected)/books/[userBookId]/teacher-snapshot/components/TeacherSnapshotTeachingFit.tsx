type TeacherSnapshotTeachingFitProps = {
  statusLabel: string;
  note: string | null;
  recommendedLevel: string | null;
  recommendedLevelDescription: string | null;
  hasTeacherBook: boolean;
};

export default function TeacherSnapshotTeachingFit({
  statusLabel,
  note,
  recommendedLevel,
  recommendedLevelDescription,
  hasTeacherBook,
}: TeacherSnapshotTeachingFitProps) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
          Teacher Use Status
        </div>
        <div className="mt-2 text-xl font-black text-stone-950">{statusLabel}</div>
        {!hasTeacherBook ? (
          <p className="mt-2 text-sm leading-6 text-stone-500">
            No Teacher Book record is linked yet.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
          Teaching Level
        </div>
        <div className="mt-2 text-xl font-black text-stone-950">
          {recommendedLevel || "No teaching level set yet."}
        </div>
        {recommendedLevelDescription ? (
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {recommendedLevelDescription}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 md:col-span-2">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
          Teaching Note
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          {note?.trim() || "No teacher note yet."}
        </p>
      </div>
    </div>
  );
}
