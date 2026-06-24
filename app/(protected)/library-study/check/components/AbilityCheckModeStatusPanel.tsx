type AbilityCheckModeStatusPanelProps = {
  libraryMode: "check" | "practice";
  dailyLevelsLabel: string;
  selectedJlpt: string;
  practiceColorFilter: string;
  practiceStudyMode: "reveal" | "typing";
  onSelectedJlptChange: (value: string) => void;
  onPracticeColorFilterChange: (value: string) => void;
  onPracticeStudyModeChange: (value: "reveal" | "typing") => void;
};

export default function AbilityCheckModeStatusPanel({
  libraryMode,
  dailyLevelsLabel,
  selectedJlpt,
  practiceColorFilter,
  practiceStudyMode,
  onSelectedJlptChange,
  onPracticeColorFilterChange,
  onPracticeStudyModeChange,
}: AbilityCheckModeStatusPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row">
        {libraryMode === "practice" ? (
          <select
            value={selectedJlpt}
            onChange={(event) => onSelectedJlptChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Levels</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
            <option value="NON-JLPT">NON-JLPT</option>
          </select>
        ) : (
          <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            Today’s levels: {dailyLevelsLabel}
          </div>
        )}

        {libraryMode === "practice" ? (
          <select
            value={practiceColorFilter}
            onChange={(event) => onPracticeColorFilterChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Colors</option>
            <option value="red">Red</option>
            <option value="orange">Orange</option>
            <option value="yellow">Yellow</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
            <option value="purple">Purple</option>
            <option value="grey">Limbo</option>
            <option value="katakana">Katakana</option>
          </select>
        ) : null}

        {libraryMode === "practice" ? (
          <div className="grid shrink-0 grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => onPracticeStudyModeChange("reveal")}
              className={`rounded-lg px-3 py-2 transition ${
                practiceStudyMode === "reveal"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Reveal
            </button>

            <button
              type="button"
              onClick={() => onPracticeStudyModeChange("typing")}
              className={`rounded-lg px-3 py-2 transition ${
                practiceStudyMode === "typing"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Typing
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
            Gate check
          </div>
        )}
      </div>
    </div>
  );
}
