type StudyBottomControlsProps = {
  sessionTotal: number;
  hasCard: boolean;
  isFlagged: boolean;
  isFlagging: boolean;
  onPrevious: () => void;
  onSkip: () => void;
  onShuffle: () => void;
  onFlag: () => void;
};

export default function StudyBottomControls({
  sessionTotal,
  hasCard,
  isFlagged,
  isFlagging,
  onPrevious,
  onSkip,
  onShuffle,
  onFlag,
}: StudyBottomControlsProps) {
  const canMove = sessionTotal > 1;

  return (
    <section className="mt-4 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canMove}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            canMove
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
          }`}
        >
          ← Previous
        </button>

        <button
          type="button"
          onClick={onSkip}
          disabled={!hasCard || !canMove}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            hasCard && canMove
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
          }`}
        >
          Skip
        </button>

        <button
          type="button"
          onClick={onShuffle}
          disabled={!canMove}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            canMove
              ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
          }`}
        >
          Shuffle
        </button>

        <button
          type="button"
          onClick={onFlag}
          disabled={!hasCard || isFlagged || isFlagging}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            isFlagged
              ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          } disabled:opacity-80`}
        >
          {isFlagged ? "Flagged ✓" : isFlagging ? "Flagging..." : "Flag card"}
        </button>
      </div>
    </section>
  );
}