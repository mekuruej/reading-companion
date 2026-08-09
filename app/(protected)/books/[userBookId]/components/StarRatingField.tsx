function formatRating(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";

  return Number(value)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/0$/, "");
}

function ratingDescription(
  descriptions: Record<number, string>,
  value: number | null
) {
  if (!value) return "—";

  return descriptions[value] ?? descriptions[Math.round(value)] ?? "—";
}

const ENTERTAINMENT_RATING_VALUES = [
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  4,
  4.5,
  5,
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
  const displayedValue = selected ?? value;

  return (
    <div className={editing ? "rounded border bg-white p-3 text-sm" : "rounded-xl bg-emerald-50 p-3 text-sm"}>
	      <div className="flex items-center justify-between gap-2">
	        <div className="text-stone-600">{label}</div>
	        {!editing && value ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-800">
            Saved
          </span>
	        ) : null}
	      </div>
	      <div className="mt-1 text-xs text-stone-500">1 = hated it · 5 = loved it</div>

	      {!editing ? (
        <>
          <div className="mt-1 font-medium">
            {value ? `${formatRating(value)}/5` : "—"}
          </div>
          {value ? (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`${formatRating(value)} out of 5`}>
              {ENTERTAINMENT_RATING_VALUES.map((rating) => (
                <span
                  key={rating}
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black",
                    value === rating
                      ? "bg-amber-200 text-amber-950"
                      : "bg-white/70 text-stone-400",
                  ].join(" ")}
                >
                  {formatRating(rating)}
                </span>
              ))}
            </div>
          ) : null}
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

          <div className="flex flex-wrap gap-2">
            {ENTERTAINMENT_RATING_VALUES.map((rating) => {
              const isSelected = selected === rating;

              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setInputValue(String(rating))}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-100 text-amber-950 shadow-sm"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-amber-50"
                  }`}
                >
                  {formatRating(rating)}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-stone-500">
            {ratingDescription(descriptions, displayedValue)}
          </div>
        </div>
      )}
    </div>
  );
}
