type MonthlyStatMiniCardProps = {
  label: string;
  value: number;
  loading: boolean;
};

export default function MonthlyStatMiniCard({
  label,
  value,
  loading,
}: MonthlyStatMiniCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3">
      <p className="text-[11px] font-semibold text-stone-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-stone-900">
        {loading ? "—" : value}
      </p>
    </div>
  );
}