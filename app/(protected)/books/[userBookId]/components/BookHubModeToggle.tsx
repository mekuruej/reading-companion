type BookHubMode = "reader" | "teaching";

type BookHubModeToggleProps = {
  mode: BookHubMode;
  onModeChange: (mode: BookHubMode) => void;
};

export default function BookHubModeToggle({
  mode,
  onModeChange,
}: BookHubModeToggleProps) {
  return (
    <div className="mb-4 hidden md:flex">
      <div className="inline-flex rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
        {(["reader", "teaching"] as const).map((option) => {
          const selected = mode === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onModeChange(option)}
              className={[
                "rounded-xl px-4 py-2 text-sm font-black transition",
                selected
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-950",
              ].join(" ")}
            >
              {option === "reader" ? "Reader" : "Teaching"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
