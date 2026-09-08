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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Status
        </div>
        <div className="mt-2 text-2xl font-black text-stone-950">{statusLabel}</div>
        {!hasTeacherBook ? (
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Not added to teaching yet.
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Level
        </div>
        <div className="mt-2 text-2xl font-black text-stone-950">
          {recommendedLevel || "Not set"}
        </div>
        {recommendedLevelDescription ? (
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {recommendedLevelDescription}
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Teaching Note
        </div>
        <p className="mt-1 text-sm leading-6 text-stone-700">
          {note?.trim() || "No teacher note yet."}
        </p>
      </div>
    </div>
  );
}
