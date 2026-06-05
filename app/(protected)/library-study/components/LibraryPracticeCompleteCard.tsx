type LibraryPracticeCompleteCardProps = {
  nextModeLabel: string;
  onNextMode: () => void;
  onReviewAgain: () => void;
  onOpenWordSky: () => void;
};

export default function LibraryPracticeCompleteCard({
  nextModeLabel,
  onNextMode,
  onReviewAgain,
  onOpenWordSky,
}: LibraryPracticeCompleteCardProps) {
  return (
    <div className="mt-3 w-full max-w-2xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
        Review complete
      </div>

      <h2 className="mt-2 text-3xl font-black text-slate-950">
        Done!
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
        You finished this filtered Library Review set. Choose another filter,
        shuffle this set, or open Word Sky if you want more words.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onNextMode}
          className="rounded-2xl border border-slate-300 bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Next: {nextModeLabel}
        </button>

        <button
          type="button"
          onClick={onReviewAgain}
          className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
        >
          Review Again
        </button>

        <button
          type="button"
          onClick={onOpenWordSky}
          className="rounded-2xl border border-emerald-200 bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50"
        >
          Open Word Sky
        </button>
      </div>
    </div>
  );
}