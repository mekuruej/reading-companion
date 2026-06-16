type StudyCompleteStateProps = {
  nextStudyModeLabel: string;
  onGoToVocabList: () => void;
  onStudyAgain: () => void;
  onNextStudyMode: () => void;
};

export default function StudyCompleteState({
  nextStudyModeLabel,
  onGoToVocabList,
  onStudyAgain,
  onNextStudyMode,
}: StudyCompleteStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Nice work!</h1>

        <p className="mt-3 text-gray-700">
          You reviewed each word once.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onNextStudyMode}
            className="rounded bg-gray-700 px-4 py-2 text-white transition hover:bg-gray-800"
          >
            Next: {nextStudyModeLabel}
          </button>

          <button
            type="button"
            onClick={onGoToVocabList}
            className="rounded bg-gray-200 px-4 py-2"
          >
            Go to Vocab List
          </button>

          <button
            type="button"
            onClick={onStudyAgain}
            className="rounded bg-gray-200 px-4 py-2"
          >
            Study Again
          </button>
        </div>
      </div>
    </main>
  );
}
