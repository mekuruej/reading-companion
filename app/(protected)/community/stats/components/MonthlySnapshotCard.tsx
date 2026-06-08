import MonthlyStatMiniCard from "./MonthlyStatMiniCard";

type MonthlySnapshotCardProps = {
  items: Array<[string, number]>;
  loading: boolean;
};

export default function MonthlySnapshotCard({
  items,
  loading,
}: MonthlySnapshotCardProps) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
            This month
          </p>

          <h2 className="mt-1 text-2xl font-black text-stone-900">
            Monthly Snapshot
          </h2>
        </div>
      </div>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        A quick check of your reading rhythm this month.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {items.map(([label, value]) => (
          <MonthlyStatMiniCard
            key={label}
            label={label}
            value={value}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}