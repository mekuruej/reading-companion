type MonthlySmallMetricCardProps = {
  label: string;
  value: string | number;
  loading?: boolean;
  labelStyle?: "plain" | "eyebrow";
  valueSize?: "xl" | "2xl";
};

export default function MonthlySmallMetricCard({
  label,
  value,
  loading = false,
  labelStyle = "plain",
  valueSize = "2xl",
}: MonthlySmallMetricCardProps) {
  const labelClassName =
    labelStyle === "eyebrow"
      ? "text-xs font-bold uppercase tracking-[0.14em] text-stone-500"
      : "text-sm font-bold text-stone-700";

  const valueClassName =
    valueSize === "xl"
      ? "mt-2 text-xl font-black text-stone-900"
      : "mt-1 text-2xl font-black text-stone-900";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className={labelClassName}>{label}</p>
      <p className={valueClassName}>{loading ? "—" : value}</p>
    </div>
  );
}