type AbilityCheckNoDueStateProps = {
  minDueCards: number;
  hasPracticeCards: boolean;
  onOpenPractice: () => void;
  onOpenWordSky: () => void;
  onOpenPurpleReview: () => void;
  onOpenBookFlashcards: () => void;
};

export default function AbilityCheckNoDueState({
  minDueCards,
  hasPracticeCards,
  onOpenPractice,
  onOpenWordSky,
  onOpenPurpleReview,
  onOpenBookFlashcards,
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
          save a lot of words or add comfortable words from Word Sky. If you
          want to study now, try one of these other study options.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {hasPracticeCards ? (
            <button
              type="button"
              onClick={onOpenPractice}
              className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
            >
              Open Library Review
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenWordSky}
            className="rounded-2xl border border-amber-200 bg-amber-100 px-5 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50"
          >
            Word Sky
          </button>

          <button
            type="button"
            onClick={onOpenPurpleReview}
            className="rounded-2xl border border-violet-200 bg-violet-100 px-5 py-3 text-sm font-semibold text-violet-950 shadow-sm transition hover:bg-violet-50"
          >
            久しぶり Review
          </button>

          <button
            type="button"
            onClick={onOpenBookFlashcards}
            className="rounded-2xl border border-emerald-200 bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50"
          >
            Book Flashcards
          </button>
        </div>
      </div>
    </main>
  );
}