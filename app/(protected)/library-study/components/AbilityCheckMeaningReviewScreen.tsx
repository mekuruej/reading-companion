type AbilityCheckMeaningReviewBaseItem = {
  id: string;
  userAnswer: string;
  correctAnswer: string;
  originalOk: boolean;
  card: {
    surface: string;
    reading: string;
  };
};

type AbilityCheckMeaningReviewScreenProps<
  TItem extends AbilityCheckMeaningReviewBaseItem
> = {
  items: TItem[];
  onFinishReview: () => void;
  onBackToLibrary: () => void;
  onCountPassed: (item: TItem) => void | Promise<void>;
  onKeepMissed: (item: TItem) => void;
};

export default function AbilityCheckMeaningReviewScreen<
  TItem extends AbilityCheckMeaningReviewBaseItem
>({
  items,
  onFinishReview,
  onBackToLibrary,
  onCountPassed,
  onKeepMissed,
}: AbilityCheckMeaningReviewScreenProps<TItem>) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Meaning Review
          </div>

          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Review meaning answers
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Correct answers are already saved. For missed answers, change the result
            only if the app was too strict.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-2xl font-semibold text-slate-950">
                    {item.card.surface}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {item.card.reading}
                  </div>

                  <div
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      item.originalOk
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    App marked: {item.originalOk ? "passed" : "missed"}
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
                </div>

                <div className="grid shrink-0 gap-2 sm:grid-cols-2 md:w-[260px] md:grid-cols-1">
                  {item.originalOk ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                      Marked as passed
                      <div className="mt-1 text-xs font-normal text-emerald-700">
                        No action needed
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void onCountPassed(item)}
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Count as passed
                      </button>

                      <button
                        type="button"
                        onClick={() => onKeepMissed(item)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Keep as missed
                      </button>
                    </>
                  )}
                </div>
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
            onClick={onBackToLibrary}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Library
          </button>
        </div>
      </div>
    </main>
  );
}