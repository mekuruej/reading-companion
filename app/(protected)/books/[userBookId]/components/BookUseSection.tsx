import type { BookUse } from "../bookUse";

const choices: { value: BookUse; label: string; description: string }[] = [
  { value: "both", label: "Both", description: "Personal reading and teaching" },
  { value: "personal_only", label: "Personal Only", description: "Personal reading; not for teaching" },
  { value: "teaching_only", label: "Teaching Only", description: "Teaching; no personal reading tracking" },
];

export default function BookUseSection({ currentUse, saving, disabled, error, onChange }: {
  currentUse: BookUse | "neither" | null;
  saving: boolean;
  disabled: boolean;
  error: string | null;
  onChange: (use: BookUse) => void;
}) {
  return (
    <section aria-label="How I use this book" className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <h2 className="text-sm font-semibold text-stone-900">How I use this book</h2>
      <p className="mt-1 text-sm text-stone-700">
        Current use: <strong>{currentUse === null ? "Unavailable" : currentUse === "neither" ? "Needs attention" : choices.find(choice => choice.value === currentUse)?.label}</strong>
      </p>
      {currentUse === "neither" ? (
        <p role="alert" className="mt-2 text-sm text-amber-800">Personal tracking is off and this book is marked Not for Teaching. Choose how you want to use it below.</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {choices.map(choice => (
          <button key={choice.value} type="button" aria-pressed={currentUse === choice.value}
            disabled={disabled || saving || currentUse === choice.value} onClick={() => onChange(choice.value)}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-left text-sm text-stone-800 disabled:opacity-60">
            <span className="block font-semibold">{choice.label}</span>
            <span className="block text-xs text-stone-500">{choice.description}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-500">Both is the default. Turning personal tracking back on starts at Want to Read; choose your reading status in reader mode. Teaching assessments stay separate.</p>
      {saving ? <p role="status" className="mt-2 text-xs text-stone-600">Saving book use...</p> : null}
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
