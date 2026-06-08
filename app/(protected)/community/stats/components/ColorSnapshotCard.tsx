import ColorSnapshotMiniCard from "./ColorSnapshotMiniCard";

type ColorSnapshotItem = {
  label: string;
  value: number;
  cardClasses: string;
  dotClass: string;
  valueClass: string;
};

type ColorSnapshotCardProps = {
  items: ColorSnapshotItem[];
  loading: boolean;
};

export default function ColorSnapshotCard({
  items,
  loading,
}: ColorSnapshotCardProps) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-500">
            Reading colors
          </p>

          <h2 className="mt-1 text-2xl font-black text-stone-900">
            Colors Snapshot
          </h2>
        </div>
      </div>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        A quick count of color movement this month.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <ColorSnapshotMiniCard
            key={item.label}
            label={item.label}
            value={item.value}
            cardClasses={item.cardClasses}
            dotClass={item.dotClass}
            valueClass={item.valueClass}
            loading={loading}
          />
        ))}
      </div>

      <p className="mt-3 text-[11px] font-medium leading-5 text-stone-500">
        Counts update when you save words, log reading, or study in Ability Check.
        This snapshot shows this month only.
      </p>
    </div>
  );
}