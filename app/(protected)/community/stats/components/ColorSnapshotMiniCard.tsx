type ColorSnapshotMiniCardProps = {
  label: string;
  value: number;
  cardClasses: string;
  dotClass: string;
  valueClass: string;
  loading: boolean;
};

export default function ColorSnapshotMiniCard({
  label,
  value,
  cardClasses,
  dotClass,
  valueClass,
  loading,
}: ColorSnapshotMiniCardProps) {
  return (
    <div className={`rounded-2xl border p-3 ${cardClasses}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />

        <p className="text-[11px] font-bold">
          {label}
        </p>
      </div>

      <div className="mt-1 flex items-end justify-between gap-2">
        <p className={`text-xl font-black ${valueClass}`}>
          {loading ? "—" : value}
        </p>

        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-stone-500">
          This month
        </span>
      </div>
    </div>
  );
}