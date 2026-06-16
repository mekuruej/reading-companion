type KanaStudyModeOption = {
  value: string;
  label: string;
  description: string;
};

type KanaStudyModeSelectorProps = {
  value: string;
  options: KanaStudyModeOption[];
  onChange: (value: string) => void;
};

export default function KanaStudyModeSelector({
  value,
  options,
  onChange,
}: KanaStudyModeSelectorProps) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <details className="group mt-4 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
            Study Mode
          </h2>
          <p className="mt-1 truncate text-sm font-semibold text-slate-700">
            {selectedOption?.label ?? "Choose a study mode"}
          </p>
          {selectedOption?.description ? (
            <p className="mt-1 text-xs text-slate-500">
              {selectedOption.description}
            </p>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 shadow-sm group-open:hidden">
          Change
        </span>
        <span className="hidden shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-700 group-open:inline-flex">
          Close
        </span>
      </summary>

      <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                selected
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <div className="text-sm font-black">
                {option.label}
              </div>
              <div className={`mt-1 text-xs leading-5 ${selected ? "text-slate-200" : "text-slate-500"}`}>
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
    </details>
  );
}
