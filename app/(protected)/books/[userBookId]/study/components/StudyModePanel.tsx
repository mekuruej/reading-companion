type StudyModeOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type StudyModePanelProps = {
  studySet: string;
  modeOptions: StudyModeOption[];
  modeHelpText: string;
  hasCard: boolean;
  onStudySetChange: (value: string) => void;
  onFlagCurrentCard: () => void;
  onHideCurrentCard: () => void;
};

export default function StudyModePanel({
  studySet,
  modeOptions,
  modeHelpText,
  hasCard,
  onStudySetChange,
  onFlagCurrentCard,
  onHideCurrentCard,
}: StudyModePanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            Study Mode
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={studySet}
              onChange={(event) => onStudySetChange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {modeOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            {modeHelpText}
          </p>
        </div>

        <div className="space-y-2 md:w-[220px]">
          <button
            type="button"
            onClick={onFlagCurrentCard}
            disabled={!hasCard}
            className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
          >
            <div className="leading-tight">Flag</div>
            <div className="text-[10px] font-normal text-amber-700">
              Problem card
            </div>
          </button>

          <button
            type="button"
            onClick={onHideCurrentCard}
            disabled={!hasCard}
            className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <div className="leading-tight">Hide</div>
            <div className="text-[10px] font-normal text-slate-500">
              I know this word
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}