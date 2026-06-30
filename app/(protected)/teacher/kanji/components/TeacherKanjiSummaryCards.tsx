type TeacherKanjiSummary = {
  active: number;
  flagged: number;
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
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
        <p className="text-xs text-indigo-700">Needs attention</p>
        <p className="mt-1 text-2xl font-black text-indigo-950">
          {summary.active}
        </p>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <p className="text-xs text-red-700">Flagged</p>
        <p className="mt-1 text-2xl font-black text-red-900">
          {summary.flagged}
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
