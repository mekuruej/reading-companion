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
    <div className="grid gap-2 lg:grid-cols-[1fr_1fr_2fr]">
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
          Status
        </div>
        <div className="mt-1 text-lg font-black text-stone-950">{statusLabel}</div>
        {!hasTeacherBook ? (
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Not added to teaching yet.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
          Level
        </div>
        <div className="mt-1 text-lg font-black text-stone-950">
          {recommendedLevel || "Not set"}
        </div>
        {recommendedLevelDescription ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-600">
            {recommendedLevelDescription}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
          Teaching Note
        </div>
        <p className="mt-1 text-sm leading-6 text-stone-700">
          {note?.trim() || "No teacher note yet."}
        </p>
      </div>
    </div>
  );
}
