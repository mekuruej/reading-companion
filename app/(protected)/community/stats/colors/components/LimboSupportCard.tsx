import ColorDeltaPill from "./ColorDeltaPill";

type LimboSupportCardProps = {
  label: string;
  shortMeaning: string;
  detail: string;
  cardClasses: string;
  dotClass: string;
  deltaClass: string;
  valueClass: string;
  loading: boolean;
  previousValue: number | null;
  allTimeValue: number;
  delta: number | null;
  comparisonDateLabel: string;
};

export default function LimboSupportCard({
  label,
  shortMeaning,
  detail,
  cardClasses,
  dotClass,
  deltaClass,
  valueClass,
  loading,
  previousValue,
  allTimeValue,
  delta,
  comparisonDateLabel,
}: LimboSupportCardProps) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${cardClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${dotClass}`} />
          <h3 className="text-lg font-black">{label}</h3>
        </div>

        {!loading ? <ColorDeltaPill value={delta} className={deltaClass} /> : null}
      </div>

      <p className="mt-1 text-sm font-bold">{shortMeaning}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
            On {comparisonDateLabel}
          </p>
          <p className={`mt-1 text-2xl font-black ${valueClass}`}>
            {loading || previousValue == null ? "—" : previousValue}
          </p>
        </div>

        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
            Current total
          </p>
          <p className={`mt-1 text-2xl font-black ${valueClass}`}>
            {loading ? "—" : allTimeValue}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-stone-700">{detail}</p>
    </div>
  );
}