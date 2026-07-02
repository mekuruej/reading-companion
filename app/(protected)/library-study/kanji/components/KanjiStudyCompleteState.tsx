type KanjiStudyCompleteStateProps = {
  endedEarly: boolean;
  nextModeLabel: string;
  onBackToStudyHub: () => void;
  onNextMode: () => void;
  onRestart: () => void;
};

export default function KanjiStudyCompleteState({
  endedEarly,
  nextModeLabel,
  onBackToStudyHub,
  onNextMode,
  onRestart,
}: KanjiStudyCompleteStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
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

          <button
            type="button"
            onClick={onBackToStudyHub}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Study Hub
          </button>
        </div>
      </div>
    </main>
  );
}
