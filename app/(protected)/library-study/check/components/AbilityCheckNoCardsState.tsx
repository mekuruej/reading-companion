type AbilityCheckNoCardsStateProps = {
  onBackToStudyHub: () => void;
  onContinueStudy: () => void;
};

export default function AbilityCheckNoCardsState({
  onBackToStudyHub,
  onContinueStudy,
}: AbilityCheckNoCardsStateProps) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <button
          type="button"
          onClick={onBackToStudyHub}
          className="mb-4 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Study Hub
        </button>

      <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold text-gray-700">
          No words are ready for Ability Check yet.
        </p>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          Read and save more words from your books. Mekuru will let you know when
          enough cards are ready for a stricter check.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onContinueStudy}
            className="rounded-2xl border border-emerald-200 bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50"
          >
            Continue Study
          </button>
        </div>
      </div>
      </div>
    </main>
  );
}
