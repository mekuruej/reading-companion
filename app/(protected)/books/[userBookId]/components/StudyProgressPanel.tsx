type StudyProgressPanelProps = {
  currentNumber: number;
  totalNumber: number;
  cardsLeft: number;
};

export default function StudyProgressPanel({
  currentNumber,
  totalNumber,
  cardsLeft,
}: StudyProgressPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Session Progress
          </p>
          <p className="text-base font-semibold text-slate-800">
            Card {currentNumber}/{totalNumber}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Cards Left
          </p>
          <p className="text-base font-semibold text-slate-800">
            {cardsLeft}
          </p>
        </div>
      </div>
    </div>
  );
}