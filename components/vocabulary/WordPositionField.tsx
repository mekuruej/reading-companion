import type { ProgressTrackingMethod } from "@/lib/books/readingProgress";
import { positionLabel } from "@/lib/vocabulary/wordPosition";

export default function WordPositionField({ value, unit, onChange, onUnitChange, disabled = false }: {
  value: string;
  unit: ProgressTrackingMethod;
  onChange: (value: string) => void;
  onUnitChange?: (unit: ProgressTrackingMethod) => void;
  disabled?: boolean;
}) {
  return <div className="min-w-0 space-y-1">
    <label className="block text-sm font-medium text-stone-700">
      <span className="mb-1 block">{positionLabel(unit)}</span>
      <input type="number" min={0} max={unit === "percent" ? 100 : undefined}
        step={unit === "percent" ? "any" : 1} inputMode={unit === "percent" ? "decimal" : "numeric"}
        value={value} disabled={disabled} onChange={event => onChange(event.target.value)}
        placeholder={positionLabel(unit)} className="w-full rounded border bg-white px-3 py-2 text-sm" />
    </label>
    {onUnitChange && <label className="block text-xs text-stone-500">Position unit
      <select aria-label="Position unit" value={unit} disabled={disabled}
        onChange={event => { onUnitChange(event.target.value as ProgressTrackingMethod); onChange(""); }}
        className="mt-1 block w-full rounded border bg-white px-2 py-1">
        <option value="page">Page</option><option value="kindle_location">Kindle Location</option><option value="percent">Percent</option>
      </select>
      <span>Changing unit clears the input. Enter the new position; it will not be converted.</span>
    </label>}
  </div>;
}
