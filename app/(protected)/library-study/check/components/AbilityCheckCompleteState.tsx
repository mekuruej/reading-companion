type AbilityCheckCompleteStateProps = {
  endedEarly: boolean;
  onBackToLibrary: () => void;
  onOpenPractice: () => void;
  onOpenPurpleReview: () => void;
  onOpenWordSky: () => void;
  onOpenBookFlashcards: () => void;
};

export default function AbilityCheckCompleteState({
  endedEarly,
  onBackToLibrary,
  onOpenPractice,
  onOpenPurpleReview,
  onOpenWordSky,
  onOpenBookFlashcards,
}: AbilityCheckCompleteStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
        {!endedEarly ? (
          <>
            <span className="pointer-events-none absolute left-10 top-8 h-2 w-2 animate-[dailySpark_1000ms_ease-out_forwards] rounded-full bg-emerald-300" />
            <span className="pointer-events-none absolute right-12 top-10 h-2 w-2 animate-[dailySpark_1100ms_ease-out_120ms_forwards] rounded-full bg-sky-300" />
            <span className="pointer-events-none absolute bottom-12 left-1/2 h-1.5 w-1.5 animate-[dailySpark_950ms_ease-out_200ms_forwards] rounded-full bg-amber-300" />
          </>
        ) : null}

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl shadow-sm">
          {endedEarly ? "✓" : "★"}
        </div>

        <h1 className="mt-4 text-2xl font-black text-slate-950">
          {endedEarly ? "Saved your place" : "Ability Check complete"}
        </h1>

        {endedEarly ? (
          <>
            <p className="mt-3 text-gray-700">
              You gave your library some practice.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Your reminder will stay on until you finish today’s check.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-gray-700">
              You finished the cards available today.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Ability Check stays strict. Use another study space if you want more practice.
            </p>
          </>
        )}

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
            onClick={onOpenPractice}
            className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
          >
            Open Library Review
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
            onClick={onOpenWordSky}
            className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
          >
            Open Word Sky
          </button>

          <button
            type="button"
            onClick={onOpenBookFlashcards}
            className="rounded-2xl border border-emerald-200 bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50"
          >
            Open Book Flashcards
          </button>
        </div>

        <style jsx>{`
          @keyframes dailySpark {
            0% {
              opacity: 0;
              transform: scale(0.2);
              box-shadow:
                0 0 0 0 currentColor,
                0 0 0 0 currentColor,
                0 0 0 0 currentColor;
            }
            35% {
              opacity: 1;
            }
            100% {
              opacity: 0;
              transform: scale(1.15);
              box-shadow:
                16px -10px 0 -1px currentColor,
                -14px -8px 0 -1px currentColor,
                2px 16px 0 -1px currentColor;
            }
          }
        `}</style>
      </div>
    </main>
  );
}
