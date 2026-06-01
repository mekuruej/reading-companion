import ColorDeltaPill from "./ColorDeltaPill";

export type ReadingColorTotalRow = {
  key: string;
  label: string;
  shortMeaning: string;
  cardClasses: string;
  dotClass: string;
  deltaClass: string;
  valueClass: string;
  previousValue: number | null;
  allTimeValue: number;
  delta: number | null;
};

type ReadingColorTotalsGridProps = {
  // Totals and previous-month comparison values are shaped in page.tsx.
  // This component only displays the already-scoped color rows.
  rows: ReadingColorTotalRow[];
  loading: boolean;
  comparisonDateLabel: string;
};

export default function ReadingColorTotalsGrid({
  rows,
  loading,
  comparisonDateLabel,
}: ReadingColorTotalsGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((item) => (
        <div
          key={item.key}
          className={`rounded-3xl border p-5 shadow-sm ${item.cardClasses}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${item.dotClass}`} />
              <h2 className="text-xl font-black">{item.label}</h2>
            </div>

            {!loading ? (
              <ColorDeltaPill
                value={item.delta}
                className={item.deltaClass}
              />
            ) : null}
          </div>

          <p className="mt-1 text-sm font-bold">{item.shortMeaning}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/70 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                On {comparisonDateLabel}
              </p>
              <p className={`mt-1 text-2xl font-black ${item.valueClass}`}>
                {loading || item.previousValue == null
                  ? "—"
                  : item.previousValue}
              </p>
            </div>

            <div className="rounded-2xl bg-white/70 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                Current total
              </p>
              <p className={`mt-1 text-2xl font-black ${item.valueClass}`}>
                {loading ? "—" : item.allTimeValue}
              </p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}