import { BOOK_FORM_DESCRIPTIONS, type WordContext } from "@/lib/vocabulary/wordContext";

export default function WordContextFields({ value, onChange, teacher = false }: {
  value: WordContext; onChange: (value: WordContext) => void; teacher?: boolean;
}) {
  const inputClass = "min-w-0 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm";
  return (
    <div className={`grid min-w-0 gap-2 ${teacher ? "sm:grid-cols-3" : ""}`}>
      {teacher ? <>
        <label className="min-w-0 text-xs font-medium text-stone-600">Form in the book
          <input className={inputClass} value={value.book_form ?? ""} onChange={e => onChange({ ...value, book_form: e.target.value })} placeholder="Optional" />
        </label>
        <label className="min-w-0 text-xs font-medium text-stone-600">Form description
          <select className={inputClass} value={value.book_form_description ?? ""} onChange={e => onChange({ ...value, book_form_description: e.target.value })}>
            <option value="">—</option>
            {BOOK_FORM_DESCRIPTIONS.map(label => <option key={label} value={label}>{label}</option>)}
          </select>
        </label>
      </> : null}
      <label className="min-w-0 text-xs font-medium text-stone-600">Note
        <input className={inputClass} value={value.follow_along_support_note ?? ""} onChange={e => onChange({ ...value, follow_along_support_note: e.target.value })} placeholder="Optional context" maxLength={600} />
      </label>
    </div>
  );
}
