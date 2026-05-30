type MonthlyStatCardProps = {
  label: string;
  value: string | number;
  loading: boolean;
};

export default function MonthlyStatCard({
  label,
  value,
  loading,
}: MonthlyStatCardProps) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-stone-900">
        {loading ? "—" : value}
      </p>
    </div>
  );
}