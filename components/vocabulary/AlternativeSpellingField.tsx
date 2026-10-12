import { promotedSpelling } from "@/lib/vocabulary/alternativeSpelling";
import WordFieldGuide from "./WordFieldGuide";
export default function AlternativeSpellingField({ main, value, onChange, onPromote, disabled = false }: {
  disabled?: boolean; main: string; value: string; onChange: (value: string) => void; onPromote: (forms: { surface: string; alternative_surface: string }) => void;
}) {
  return <div className="space-y-1">
    <label className="block text-xs font-medium text-stone-600">Alternative spelling
      <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" disabled={disabled} value={value} onChange={event => onChange(event.target.value)} placeholder="Optional" />
      <WordFieldGuide field="alternative" />
    </label>
    {value.trim() && value.trim() !== main.trim() ? <button type="button" disabled={disabled} className="text-xs font-semibold text-sky-800 underline" onClick={() => { const forms = promotedSpelling(main, value); if (forms) onPromote(forms); }}>Make this the main word</button> : null}
  </div>;
}
