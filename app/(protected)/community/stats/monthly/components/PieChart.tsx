// TODO: Consider moving this to a shared stats component if more stats pages use the same pie chart pattern.

export type PieItem = {
  label: string;
  value: number;
  color: string;
};

type PieChartProps = {
  items: PieItem[];
  size?: number;
  centerLabel?: string;
  totalLabel?: string;
  valueLabel?: (value: number) => string;
};

export default function PieChart({
  items,
  size = 220,
  centerLabel = "Total",
  totalLabel,
  valueLabel = (value) => String(value),
}: PieChartProps) {
  const filtered = items.filter((item) => item.value > 0);
  const total = filtered.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;

  if (total <= 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl bg-stone-50 text-sm text-stone-500">
        No chart data yet
      </div>
    );
  }

  let running = -Math.PI / 2;

  const paths = filtered.map((item) => {
    const angle = (item.value / total) * Math.PI * 2;
    const startAngle = running;
    const endAngle = running + angle;
    running = endAngle;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    return {
      ...item,
      d,
      percent: Math.round((item.value / total) * 100),
    };
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto"
      >
        {paths.length === 1 ? (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={paths[0].color}
            stroke="white"
            strokeWidth="3"
          />
        ) : (
          paths.map((item) => (
            <path
              key={item.label}
              d={item.d}
              fill={item.color}
              stroke="white"
              strokeWidth="3"
            />
          ))
        )}

        <circle cx={cx} cy={cy} r={radius * 0.48} fill="white" />

        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-stone-500 text-[11px] font-bold uppercase"
        >
          {centerLabel}
        </text>

        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          className="fill-stone-900 text-[14px] font-black"
        >
          {totalLabel ?? String(total)}
        </text>
      </svg>

      <div className="space-y-3">
        {paths.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 truncate text-sm font-semibold text-stone-700">
                {item.label}
              </span>
            </div>

            <div className="shrink-0 text-sm font-bold text-stone-900">
              {valueLabel(item.value)}{" "}
              <span className="text-stone-500">({item.percent}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}