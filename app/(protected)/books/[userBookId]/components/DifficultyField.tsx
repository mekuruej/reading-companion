import { bookTypeLabel as formatBookTypeLabel } from "@/lib/books/bookTypes";

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Very easy" },
  { value: 1.5, label: "Easy" },
  { value: 2, label: "Pretty comfortable" },
  { value: 2.5, label: "Mostly manageable" },
  { value: 3, label: "Challenging but manageable" },
  { value: 3.5, label: "A real stretch" },
  { value: 4, label: "Hard, but doable" },
  { value: 4.5, label: "Very difficult" },
  { value: 5, label: "Extremely difficult" },
] as const;

function formatRating(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";

  return Number(value)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/0$/, "");
}

function stars5(value: number | null) {
  if (!value) return "☆☆☆☆☆";

  const safeValue = Math.max(1, Math.min(5, value));
  const rounded = Math.round(safeValue);

  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function bookTypeLabel(value: string | null | undefined) {
  return formatBookTypeLabel(value);
}

type DifficultyFieldProps = {
  value: number | null;
  editing: boolean;
  bookType: string | null;
  inputValue: string;
  setInputValue: (value: string) => void;
};

export default function DifficultyField({
  value,
  editing,
  bookType,
  inputValue,
  setInputValue,
}: DifficultyFieldProps) {
  const selected = inputValue ? Number(inputValue) : null;
  const label = DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label ?? "";
  const typeLabel = bookTypeLabel(bookType);
  const difficultyLabel =
    typeLabel === "—" ? "Reader Difficulty" : `${typeLabel} Difficulty`;
  const promptLabel =
    typeLabel === "—" ? "this kind of book" : `a ${typeLabel.toLowerCase()}`;

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">{difficultyLabel}</div>
      <div className="mt-1 text-xs text-stone-500">1 = easiest · 5 = hardest</div>

      {!editing ? (
        <>
          <div className="mt-2 font-medium">
            {value ? `${formatRating(value)}/5` : "—"}
          </div>
          <div className="text-amber-600">{stars5(value)}</div>
          <div className="mt-1 text-xs text-stone-500">{label || "—"}</div>
        </>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-stone-700">
            Thinking of this as {promptLabel}, how difficult was it for you?
          </div>

          {DIFFICULTY_OPTIONS.map((option) => {
            const isSelected = selected === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setInputValue(String(option.value))}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  isSelected
                    ? "border-stone-900 bg-stone-100"
                    : "border-stone-200 hover:bg-stone-50"
                }`}
              >
                <div className="text-amber-600">{stars5(option.value)}</div>
                <div className="text-xs text-stone-600">{option.label}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
