type AbilityCheckProgressCardProps = {
  label?: string;
  current: number;
  total: number;
  rightLabel?: string;
  rightValue: number | string;
};

export default function AbilityCheckProgressCard({
  label = "Check Progress",
  current,
  total,
  rightLabel = "Cards Left",
  rightValue,
}: AbilityCheckProgressCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {label}
          </p>

          <p className="text-base font-semibold text-slate-800">
            Card {current}/{total}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {rightLabel}
          </p>

          <p className="text-base font-semibold text-slate-800">
            {rightValue}
          </p>
        </div>
      </div>
    </div>
  );
}