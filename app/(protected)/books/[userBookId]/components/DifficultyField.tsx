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
  const displayedValue = selected ?? value;
  const label = DIFFICULTY_OPTIONS.find((option) => option.value === displayedValue)?.label ?? "";
  const typeLabel = bookTypeLabel(bookType);
  const difficultyLabel =
    typeLabel === "—" ? "Reader Difficulty" : `${typeLabel} Difficulty`;
  const promptLabel =
    typeLabel === "—" ? "this kind of book" : `a ${typeLabel.toLowerCase()}`;

  return (
    <div className={editing ? "rounded border bg-white p-3 text-sm" : "rounded-xl bg-emerald-50 p-3 text-sm"}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-stone-600">{difficultyLabel}</div>
        {!editing && value ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-800">
            Saved
          </span>
        ) : null}
	      </div>
	      <div className="mt-1 text-xs text-stone-500">1 = easiest · 5 = hardest</div>
	      <div className="mt-1 text-xs text-stone-500">
	        Rate it compared with other books in this book type, not all book types.
	      </div>

	      {!editing ? (
        <>
          <div className="mt-2 font-medium">
            {value ? `${formatRating(value)}/5` : "—"}
          </div>
          {value ? (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`${formatRating(value)} out of 5`}>
              {DIFFICULTY_OPTIONS.map((option) => (
                <span
                  key={option.value}
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black",
                    value === option.value
                      ? "bg-amber-200 text-amber-950"
                      : "bg-white/70 text-stone-400",
                  ].join(" ")}
                >
                  {formatRating(option.value)}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-1 text-xs text-stone-500">{label || "—"}</div>
        </>
      ) : (
        <div className="mt-3 space-y-2">
	          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-stone-700">
	            Thinking of this as {promptLabel}, how difficult was it for you?
	          </div>

          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map((option) => {
              const isSelected = selected === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setInputValue(String(option.value))}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-100 text-amber-950 shadow-sm"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-amber-50"
                  }`}
                >
                  {formatRating(option.value)}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-stone-500">{label || "Choose the closest fit."}</div>
        </div>
      )}
    </div>
  );
}
