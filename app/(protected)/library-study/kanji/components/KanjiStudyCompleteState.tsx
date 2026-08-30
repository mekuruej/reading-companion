type KanjiStudyCompleteStateProps = {
  endedEarly: boolean;
  nextModeLabel: string;
  onBackToFoundationSets: () => void;
  onNextMode: () => void;
  onRestart: () => void;
};

export default function KanjiStudyCompleteState({
  endedEarly,
  nextModeLabel,
  onBackToFoundationSets,
  onNextMode,
  onRestart,
}: KanjiStudyCompleteStateProps) {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <button
          type="button"
          onClick={onBackToFoundationSets}
          className="mb-4 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Foundation Sets
        </button>

        <div className="w-full rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">
            {endedEarly ? "Nice work today!" : "Nice work!"}
          </h1>

          {endedEarly ? (
            <>
              <p className="mt-3 text-gray-700">
                You gave these readings some practice.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Come back when you’re ready.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-gray-700">
                You reviewed every card in this set.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Try the next direction, or reshuffle this mode and level.
              </p>
            </>
          )}

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
              onClick={onRestart}
              className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
            >
              {endedEarly ? "Keep Going" : "Review Again"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
