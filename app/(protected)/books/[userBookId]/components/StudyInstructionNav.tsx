type StudyInstructionNavProps = {
  instructionText: string;
  canGoPrevious: boolean;
  onPrevious: () => void;
};

export default function StudyInstructionNav({
  instructionText,
  canGoPrevious,
  onPrevious,
}: StudyInstructionNavProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-gray-500">{instructionText}</p>

      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
    </div>
  );
}