type AbilityCheckActionPanelProps = {
  meaningReviewCount: number;
  canComeBackLater: boolean;
  canRestartCurrentCard: boolean;
  onFinishForToday: () => void;
  onComeBackLater: () => void;
  onRestartCurrentCard: () => void;
  onFlagCurrentCard: () => void;
};

export default function AbilityCheckActionPanel({
  meaningReviewCount,
  canComeBackLater,
  canRestartCurrentCard,
  onFinishForToday,
  onComeBackLater,
  onRestartCurrentCard,
  onFlagCurrentCard,
}: AbilityCheckActionPanelProps) {
  return (
    <div className="mt-4 grid w-full max-w-3xl gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <button
        type="button"
        onClick={onFinishForToday}
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        {meaningReviewCount > 0 ? "Finish and check meanings" : "Finish early"}
      </button>

      {canComeBackLater ? (
        <button
          type="button"
          onClick={onComeBackLater}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Too hard for now
        </button>
      ) : null}

      {canRestartCurrentCard ? (
        <button
          type="button"
          onClick={onRestartCurrentCard}
          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          Restart check
        </button>
      ) : null}

      <button
        type="button"
        onClick={onFlagCurrentCard}
        className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
      >
        Flag card
      </button>
    </div>
  );
}
