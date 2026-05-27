// TODO: Consider moving this to a shared stats component if more stats pages use the same card pattern.

export default function StatCard({
  label,
  value,
  hint,
  tone = "border-slate-200 bg-white",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm ${tone}`}>
      <div className="text-xs font-medium uppercase text-slate-600">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}