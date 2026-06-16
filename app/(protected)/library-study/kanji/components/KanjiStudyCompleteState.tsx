type KanjiStudyCompleteStateProps = {
  endedEarly: boolean;
  onBackToStudyHub: () => void;
  onRestart: () => void;
};

export default function KanjiStudyCompleteState({
  endedEarly,
  onBackToStudyHub,
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
              Study again to reshuffle this mode and level.
            </p>
          </>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onBackToStudyHub}
            className="rounded bg-gray-200 px-4 py-2"
          >
            Back to Study Hub
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="rounded bg-gray-700 px-4 py-2 text-white"
          >
            {endedEarly ? "Do More Today" : "Do It Again"}
          </button>
        </div>
      </div>
    </main>
  );
}
