type TeacherReadingFitSummary = {
  total: number;
  missingReaderLevel: number;
  missingDifficulty: number;
  missingEntertainment: number;
};

type TeacherReadingFitSummaryGridProps = {
  summary: TeacherReadingFitSummary;
};

export function TeacherReadingFitSummaryGrid({
  summary,
}: TeacherReadingFitSummaryGridProps) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="text-3xl font-black text-stone-900">
          {summary.total}
        </div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          books need fit signals
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
        <div className="text-3xl font-black text-stone-900">
          {summary.missingReaderLevel}
        </div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          missing reader level
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
        <div className="text-3xl font-black text-stone-900">
          {summary.missingDifficulty}
        </div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          missing ease rating
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="text-2xl font-black text-stone-900">
          {summary.missingEntertainment}
        </div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          missing entertainment rating
        </div>
      </div>
    </div>
  );
}