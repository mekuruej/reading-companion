type StudyProgressPanelProps = {
  currentNumber: number;
  totalNumber: number;
  studyingNowLabel: string;
};

export default function StudyProgressPanel({
  currentNumber,
  totalNumber,
  studyingNowLabel,
}: StudyProgressPanelProps) {
  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Studying Now
          </p>

          <p className="mt-1 truncate text-lg font-bold text-slate-950">
            {studyingNowLabel?.trim() || "Book flashcards"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Session progress
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-950">
            {currentNumber} / {totalNumber}
          </p>
        </div>
      </div>
    </div>
  );
}