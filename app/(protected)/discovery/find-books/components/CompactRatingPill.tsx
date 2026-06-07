type CompactRatingPillProps = {
  label: string;
  value: number | null;
  tone: "amber" | "sky";
  formatValue: (value: number) => string;
};

export default function CompactRatingPill({
  label,
  value,
  tone,
  formatValue,
}: CompactRatingPillProps) {
  const colorClass = tone === "amber" ? "text-amber-500" : "text-sky-500";
  const hasValue = value != null && Number.isFinite(value);
  const safeValue = hasValue ? Math.max(0, Math.min(5, value)) : 0;
  const roundedValue = hasValue ? Math.round(safeValue) : 0;

  const pillClass = hasValue
    ? "bg-white text-slate-700 ring-slate-200"
    : "bg-slate-100/80 text-slate-400 ring-slate-200";

  return (
    <div className={`rounded-lg px-3 py-2 ring-1 ring-inset ${pillClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>

        <span className="text-xs font-black text-slate-700">
          {hasValue ? `${formatValue(safeValue)}/5` : "-"}
        </span>
      </div>

      <div
        className={`mt-1 text-sm leading-none tracking-[0.08em] ${
          hasValue ? colorClass : "text-slate-200"
        }`}
      >
        {"*".repeat(roundedValue)}

        <span className="text-slate-200">
          {"*".repeat(5 - roundedValue)}
        </span>
      </div>
    </div>
  );
}