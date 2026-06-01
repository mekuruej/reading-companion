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

          <input
            type="range"
            min="1"
            max="5"
            step="0.25"
            value={selected ?? 3}
            onChange={(event) => setInputValue(event.target.value)}
            className="w-full"
          />

          <div className="grid grid-cols-5 gap-1 text-center text-[11px] text-stone-500">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px] text-stone-500">
            <span>Not for me</span>
            <span>Loved it</span>
          </div>
        </div>
      )}
    </div>
  );
}