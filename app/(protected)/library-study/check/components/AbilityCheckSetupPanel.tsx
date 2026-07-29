type AbilityCheckSetupPanelProps = {
  allLevelsDueCount: number;
  selectedDueCount: number;
  includeKatakanaToday: boolean;
  katakanaDueCount: number;
  showQueueReset: boolean;
  onIncludeKatakanaTodayChange: (value: boolean) => void;
  onStartDailyCheck: () => void;
  onResetDueQueue: () => void;
  onBackToLibrary: () => void;
};

export default function AbilityCheckSetupPanel({
  allLevelsDueCount,
  selectedDueCount,
  includeKatakanaToday,
  katakanaDueCount,
  showQueueReset,
  onIncludeKatakanaTodayChange,
  onStartDailyCheck,
  onResetDueQueue,
  onBackToLibrary,
}: AbilityCheckSetupPanelProps) {
  const hasKatakanaDue = katakanaDueCount > 0;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Ability Check
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Start today’s check
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Test the reading and meaning of words that are ready to check.
          </p>
        </div>

        {hasKatakanaDue ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="px-1 text-sm leading-6 text-slate-600">
              Would you like to test your knowledge of katakana words today or
              leave them out of today&apos;s study?
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onIncludeKatakanaTodayChange(false)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  !includeKatakanaToday
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="font-black">Leave them out</div>
                <div className={`mt-1 text-xs ${!includeKatakanaToday ? "text-white/70" : "text-slate-500"}`}>
                  Study {allLevelsDueCount - katakanaDueCount} cards today
                </div>
              </button>

              <button
                type="button"
                onClick={() => onIncludeKatakanaTodayChange(true)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  includeKatakanaToday
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="font-black">Include katakana</div>
                <div className={`mt-1 text-xs ${includeKatakanaToday ? "text-white/70" : "text-slate-500"}`}>
                  Add {katakanaDueCount} katakana card{katakanaDueCount === 1 ? "" : "s"}
                </div>
              </button>
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onStartDailyCheck}
            disabled={selectedDueCount === 0}
            className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-black disabled:opacity-40"
          >
            Start Ability Check
          </button>

          <button
            type="button"
            onClick={onBackToLibrary}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Library
          </button>
        </div>

        {showQueueReset ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm font-black text-amber-950">
              Overwhelmed?
            </p>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-amber-900">
              Reset today&apos;s Ability Check queue to zero. Your saved words and
              progress will stay unchanged.
            </p>
            <button
              type="button"
              onClick={onResetDueQueue}
              className="mt-3 rounded-2xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-black text-amber-950 shadow-sm transition hover:bg-amber-100"
            >
              Reset queue to zero
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
