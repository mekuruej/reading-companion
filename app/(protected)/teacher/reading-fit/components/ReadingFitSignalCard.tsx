type ReadingFitSignalCardProps = {
  title: string;
  value: string;
  isMissing: boolean;
};

export function ReadingFitSignalCard({
  title,
  value,
  isMissing,
}: ReadingFitSignalCardProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        isMissing
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {title}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}