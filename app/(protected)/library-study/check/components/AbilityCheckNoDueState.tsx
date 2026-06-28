type AbilityCheckNoDueStateProps = {
  minDueCards: number;
  onBackToLibrary: () => void;
  onContinueStudy: () => void;
};

export default function AbilityCheckNoDueState({
  minDueCards,
  onBackToLibrary,
  onContinueStudy,
}: AbilityCheckNoDueStateProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Strict due cards
        </p>

        <h1 className="mt-2 text-2xl font-black text-slate-950">
          Ability Check
        </h1>

        <p className="mt-3 text-gray-600">
          No cards are due for today’s Ability Check.
        </p>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
          That is normal. Ability Check opens when at least {minDueCards} cards
          are due, and it becomes more regularly available after you read and
          save a lot of words.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onBackToLibrary}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Library
          </button>

          <button
            type="button"
            onClick={onContinueStudy}
            className="rounded-2xl border border-emerald-200 bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50"
          >
            Continue Study
          </button>
        </div>
      </div>
    </main>
  );
}
