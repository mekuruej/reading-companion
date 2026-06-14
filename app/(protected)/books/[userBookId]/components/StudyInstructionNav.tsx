type StudyInstructionNavProps = {
  instructionText: string;
  canGoPrevious: boolean;
  showAutoAdvancePause?: boolean;
  autoAdvancePaused?: boolean;
  onPrevious: () => void;
  onToggleAutoAdvancePaused?: () => void;
};

export default function StudyInstructionNav({
  instructionText,
  canGoPrevious,
  showAutoAdvancePause = false,
  autoAdvancePaused = false,
  onPrevious,
  onToggleAutoAdvancePaused,
}: StudyInstructionNavProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-gray-500">{instructionText}</p>

      <div className="flex shrink-0 items-center gap-2">
        {showAutoAdvancePause && onToggleAutoAdvancePaused ? (
          <button
            type="button"
            onClick={onToggleAutoAdvancePaused}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {autoAdvancePaused ? "Resume" : "Pause"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
      </div>
    </div>
  );
}
