type ReadingRangeValue = {
  value: string;
  title: string;
};

export default function ReadingRangeCard({
  title,
  fastest,
  slowest,
  emptyText,
  tone,
}: {
  title: string;
  fastest: ReadingRangeValue | null;
  slowest: ReadingRangeValue | null;
  emptyText: string;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm ${tone}`}>
      <div className="text-xs font-medium uppercase text-slate-600">
        {title}
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <div className="text-xs text-slate-500">Fastest</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {fastest?.value ?? "—"}
          </div>
          <div className="truncate text-sm text-slate-700">
            {fastest?.title ?? emptyText}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <div className="text-xs text-slate-500">Slowest</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {slowest?.value ?? "—"}
          </div>
          <div className="truncate text-sm text-slate-700">
            {slowest?.title ?? emptyText}
          </div>
        </div>
      </div>
    </div>
  );
}