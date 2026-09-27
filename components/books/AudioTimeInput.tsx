"use client";

// The form value is total audio-timeline minutes, never elapsed session minutes.
export default function AudioTimeInput({ value, onChange, label = "Audiobook length (optional)", disabled = false }: {
  value: string; onChange: (value: string) => void; label?: string; disabled?: boolean;
}) {
  const total = value === "" ? null : Number(value);
  const hours = total == null ? "" : Math.floor(total / 60);
  const minutes = total == null ? "" : total % 60;
  function update(part: "hours" | "minutes", raw: string) {
    if (raw !== "" && !/^\d+$/.test(raw)) return;
    const number = Number(raw);
    if (!Number.isSafeInteger(number) || (part === "minutes" && number > 59)) return;
    if (raw === "" && (part === "hours" ? !minutes : !hours)) { onChange(""); return; }
    onChange(String(part === "hours" ? number * 60 + Number(minutes) : Number(hours) * 60 + number));
  }
  return <fieldset disabled={disabled} className="space-y-1">
    <legend className="text-sm font-medium text-stone-600">{label}</legend>
    <div className="flex gap-2">
      <label className="min-w-0 flex-1 text-xs text-stone-500">Hours<input type="number" min="0" step="1" value={hours} onChange={e => update("hours", e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-stone-900" /></label>
      <label className="min-w-0 flex-1 text-xs text-stone-500">Minutes<input type="number" min="0" max="59" step="1" value={minutes} onChange={e => update("minutes", e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-stone-900" /></label>
    </div>
  </fieldset>;
}
