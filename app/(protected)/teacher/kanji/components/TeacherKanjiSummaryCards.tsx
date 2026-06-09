type TeacherKanjiSummary = {
  total: number;
  flagged: number;
  needsReading: number;
  needsWork: number;
  complete: number;
  excluded: number;
};

type TeacherKanjiSummaryCardsProps = {
  summary: TeacherKanjiSummary;
};

export default function TeacherKanjiSummaryCards({
  summary,
}: TeacherKanjiSummaryCardsProps) {
  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
        <p className="text-xs text-indigo-700">Total tracked</p>
        <p className="mt-1 text-2xl font-black text-indigo-950">
          {summary.total}
        </p>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <p className="text-xs text-red-700">Flagged</p>
        <p className="mt-1 text-2xl font-black text-red-900">
          {summary.flagged}
        </p>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
        <p className="text-xs text-sky-700">Needs reading</p>
        <p className="mt-1 text-2xl font-black text-sky-950">
          {summary.needsReading}
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p className="text-xs text-amber-700">Needs work</p>
        <p className="mt-1 text-2xl font-black text-amber-900">
          {summary.needsWork}
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <p className="text-xs text-emerald-700">Complete</p>
        <p className="mt-1 text-2xl font-black text-emerald-900">
          {summary.complete}
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-100 p-4 shadow-sm">
        <p className="text-xs text-stone-600">Excluded</p>
        <p className="mt-1 text-2xl font-black text-stone-800">
          {summary.excluded}
        </p>
      </div>
    </section>
  );
}