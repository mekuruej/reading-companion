type LibraryPracticeFilterPanelProps = {
  selectedJlpt: string;
  practiceColorFilter: string;
  practiceStudyMode: "reveal" | "typing";
  onJlptChange: (value: string) => void;
  onColorFilterChange: (value: string) => void;
  onPracticeStudyModeChange: (value: "reveal" | "typing") => void;
};

export default function LibraryPracticeFilterPanel({
  selectedJlpt,
  practiceColorFilter,
  practiceStudyMode,
  onJlptChange,
  onColorFilterChange,
  onPracticeStudyModeChange,
}: LibraryPracticeFilterPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedJlpt}
          onChange={(event) => onJlptChange(event.target.value)}
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

        <select
          value={practiceColorFilter}
          onChange={(event) => onColorFilterChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Colors</option>
          <option value="red">Red</option>
          <option value="orange">Orange</option>
          <option value="yellow">Yellow</option>
          <option value="green">Green</option>
          <option value="blue">Blue</option>
          <option value="purple">Purple (Mastered Words)</option>
          <option value="grey">Limbo</option>
          <option value="katakana">Katakana</option>
        </select>

        <div className="grid shrink-0 grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => onPracticeStudyModeChange("reveal")}
            className={`rounded-lg px-4 py-2 transition ${
              practiceStudyMode === "reveal"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Reveal
          </button>

          <button
            type="button"
            onClick={() => onPracticeStudyModeChange("typing")}
            className={`rounded-lg px-4 py-2 transition ${
              practiceStudyMode === "typing"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Typing
          </button>
        </div>
      </div>
    </div>
  );
}