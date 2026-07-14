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

function ratingDescription(
  descriptions: Record<number, string>,
  value: number | null
) {
  if (!value) return "—";

  return descriptions[value] ?? descriptions[Math.round(value)] ?? "—";
}

const ENTERTAINMENT_RATING_VALUES = [
  5,
  4.75,
  4.5,
  4.25,
  4,
  3.75,
  3.5,
  3.25,
  3,
  2.5,
  2,
  1.5,
  1,
];

type StarRatingFieldProps = {
  label: string;
  value: number | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  descriptions: Record<number, string>;
};

export default function StarRatingField({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
  descriptions,
}: StarRatingFieldProps) {
  const selected = inputValue ? Number(inputValue) : null;

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">{label}</div>

      {!editing ? (
        <>
          <div className="mt-1 font-medium">
            {value ? `${formatRating(value)}/5` : "—"}
          </div>
          <div className="text-amber-600">{stars5(value)}</div>
          <div className="mt-1 text-xs text-stone-500">
            {ratingDescription(descriptions, value)}
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-amber-700">
                {selected ? `${formatRating(selected)}/5` : "—"}
              </div>
              <div className="text-xs text-stone-500">
                {ratingDescription(descriptions, selected)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInputValue("")}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              Clear
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {ENTERTAINMENT_RATING_VALUES.map((rating) => {
              const isSelected = selected === rating;

              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setInputValue(String(rating))}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-100 text-amber-950 shadow-sm"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-amber-50"
                  }`}
                >
                  <span className="font-black">{formatRating(rating)}</span>
                  <span className="ml-2 text-xs leading-5">
                    {ratingDescription(descriptions, rating)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
