// Shows labeled values as relative horizontal bars.
// Tiny non-zero bars keep a minimum visible width so low values are still noticeable.
// TODO: Consider moving this to a shared stats component if more stats pages use the same bar strip pattern.

type BarStripItem = {
  label: string;
  value: number;
};

type BarStripProps = {
  items: BarStripItem[];
  colorClass: string;
  valueSuffix?: string;
};

export default function BarStrip({
  items,
  colorClass,
  valueSuffix = "",
}: BarStripProps) {
  // Use at least 1 so empty or all-zero data does not create divide-by-zero widths.
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{item.label}</span>
            <span className="shrink-0 font-medium text-slate-900">
              {item.value}
              {valueSuffix}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${colorClass}`}
              // Keep very small positive values visible instead of letting the bar disappear.
              style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}