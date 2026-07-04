type KanjiStudyBottomControlsProps = {
  canGoPrevious: boolean;
  onPrevious: () => void;
  onShuffle: () => void;
  onFlag?: () => void;
  flagLabel?: string;
};

export default function KanjiStudyBottomControls({
  canGoPrevious,
  onPrevious,
  onShuffle,
  onFlag,
  flagLabel = "Flag card",
}: KanjiStudyBottomControlsProps) {
  return (
    <section className="mt-4 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            canGoPrevious
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
          }`}
        >
          ← Previous
        </button>

        <button
          type="button"
          onClick={onShuffle}
          className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
        >
          Shuffle
        </button>

        {onFlag ? (
          <button
            type="button"
            onClick={onFlag}
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            {flagLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}