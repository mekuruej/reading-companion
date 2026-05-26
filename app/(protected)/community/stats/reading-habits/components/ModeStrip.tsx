type ModeStripItem = {
  label: string;
  value: number;
  width: string;
  color: string;
};

export default function ModeStrip({
  items,
  formatValue,
}: {
  items: ModeStripItem[];
  formatValue: (value: number) => string;
}) {
  const hasValue = items.some((item) => item.value > 0);

  return (
    <div>
      <div className="flex h-5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        {hasValue ? (
          items.map((item) => (
            <div
              key={item.label}
              className={`h-full ${item.color}`}
              style={{ width: item.width }}
              title={`${item.label}: ${formatValue(item.value)}`}
            />
          ))
        ) : (
          <div className="h-full w-full bg-slate-200" />
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className="text-xs font-medium text-slate-600">
                {item.label}
              </span>
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatValue(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}