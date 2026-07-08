type TeacherKanjiSummary = {
  total: number;
  flagged: number;
};

type TeacherKanjiSummaryCardsProps = {
  summary: TeacherKanjiSummary;
};

export default function TeacherKanjiSummaryCards({
  summary,
}: TeacherKanjiSummaryCardsProps) {
  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <p className="text-xs text-red-700">Flagged by readers</p>
        <p className="mt-1 text-2xl font-black text-red-900">
          {summary.flagged}
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs text-stone-600">Words in this view</p>
        <p className="mt-1 text-2xl font-black text-stone-900">
          {summary.total}
        </p>
      </div>
    </section>
  );
}
