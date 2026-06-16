type PracticeMeaningReviewItem = {
  id: string;
  userAnswer: string;
  correctAnswer: string;
  originalOk: boolean;
  card: {
    surface: string;
    reading: string;
  };
};

type PracticeMeaningReviewScreenProps = {
  items: PracticeMeaningReviewItem[];
  onFinishReview: () => void;
  onBackToPractice: () => void;
  onCountPassed: (item: PracticeMeaningReviewItem) => void;
  onCountMissed: (item: PracticeMeaningReviewItem) => void;
  onKeepMissed: (item: PracticeMeaningReviewItem) => void;
};

export default function PracticeMeaningReviewScreen({
  items,
  onFinishReview,
  onBackToPractice,
  onCountPassed,
  onCountMissed,
  onKeepMissed,
}: PracticeMeaningReviewScreenProps) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            久しぶり Review
          </div>

          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Review meaning answers
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Purple review can move forgotten words back to the gate they need. This list is
            just for checking the meanings you typed.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-2xl font-semibold text-slate-950">
                    {item.card.surface}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {item.card.reading}
                  </div>
                </div>

                <div
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    item.originalOk
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {item.originalOk ? "Matched" : "Moved back"}
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Your answer
                  </div>

                  <div className="mt-1 text-slate-900">
                    {item.userAnswer || "—"}
                  </div>
                </div>

                <div className="rounded-xl bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Saved meaning
                  </div>

                  <div className="mt-1 text-slate-900">
                    {item.correctAnswer}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.originalOk ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onCountPassed(item)}
                      className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                    >
                      Keep correct
                    </button>

                    <button
                      type="button"
                      onClick={() => onCountMissed(item)}
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-50"
                    >
                      Actually missed it
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onCountPassed(item)}
                      className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                    >
                      Actually got it
                    </button>

                    <button
                      type="button"
                      onClick={() => onKeepMissed(item)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Keep moved back
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onFinishReview}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-black"
          >
            Finish Review
          </button>

          <button
            type="button"
            onClick={onBackToPractice}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to practice
          </button>
        </div>
      </div>
    </main>
  );
}