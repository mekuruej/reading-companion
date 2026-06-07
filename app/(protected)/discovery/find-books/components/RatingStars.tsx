type RatingStarsProps = {
  label: string;
  value: number | null;
  tone: "amber" | "sky";
  formatValue: (value: number) => string;
};

export default function RatingStars({
  label,
  value,
  tone,
  formatValue,
}: RatingStarsProps) {
  const safeValue =
    value == null || !Number.isFinite(value)
      ? null
      : Math.max(0, Math.min(5, value));

  const fillWidth = safeValue == null ? 0 : (safeValue / 5) * 100;
  const colorClass = tone === "amber" ? "text-amber-500" : "text-sky-500";
  const cardClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50/70"
      : "border-sky-200 bg-sky-50/70";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${cardClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>

        <span className="text-xs font-black text-slate-700">
          {safeValue == null ? "-" : `${formatValue(safeValue)}/5`}
        </span>
      </div>

      <div
        className="relative mt-1 inline-block whitespace-nowrap text-lg leading-none tracking-[0.08em]"
        aria-hidden="true"
      >
        <span className="text-slate-200">*****</span>

        <span
          className={`absolute inset-y-0 left-0 overflow-hidden ${colorClass}`}
          style={{ width: `${fillWidth}%` }}
        >
          *****
        </span>
      </div>
    </div>
  );
}