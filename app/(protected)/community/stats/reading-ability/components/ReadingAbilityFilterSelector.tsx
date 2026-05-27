type ReadingAbilityFilterOption = {
  value: string;
  title: string;
  description: string;
  activeClass: string;
  inactiveClass: string;
};

export default function ReadingAbilityFilterSelector({
  filters,
  value,
  onChange,
  bookCount,
}: {
  filters: ReadingAbilityFilterOption[];
  value: string;
  onChange: (value: string) => void;
  bookCount: number;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        {filters.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
                selected ? option.activeClass : option.inactiveClass
              }`}
            >
              <div className="text-base font-black">{option.title}</div>
              <div
                className={`mt-1 text-sm leading-5 ${
                  selected ? "text-white/85" : ""
                }`}
              >
                {option.description}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{bookCount}</span>{" "}
        book{bookCount === 1 ? "" : "s"} with reading data included in this
        category.
      </p>
    </>
  );
}