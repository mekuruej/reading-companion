import type { ReactNode } from "react";

type AbilityCheckSetupPanelProps = {
  levels: readonly string[];
  setupLevels: string[];
  availableCountByLevel: Record<string, number>;
  allLevelsDueCount: number;
  allLevelsSelected: boolean;
  selectedDueCount: number;
  minDueCards: number;
  faqSlot: ReactNode;
  onToggleAllLevels: () => void;
  onToggleLevel: (level: string) => void;
  onStartDailyCheck: () => void;
  onBackToLibrary: () => void;
};

export default function AbilityCheckSetupPanel({
  levels,
  setupLevels,
  availableCountByLevel,
  allLevelsDueCount,
  allLevelsSelected,
  selectedDueCount,
  minDueCards,
  faqSlot,
  onToggleAllLevels,
  onToggleLevel,
  onStartDailyCheck,
  onBackToLibrary,
}: AbilityCheckSetupPanelProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Ability Check
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Choose today’s check
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Pick one or more levels. Once you start, your levels and card count are locked
            for today.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          Don’t worry about checking this on your own. Mekuru will alert you from your
          Library when enough Ability Check cards are ready.
        </div>

        <div className="mt-5">{faqSlot}</div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Levels</div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Choose one or more levels for today’s official check. Ability Check only uses
            cards due today.
          </p>

          <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center shadow-sm">
            <div className="text-sm font-black text-emerald-950">
              Your {allLevelsDueCount} Ability Check cards are ready.
            </div>

            <p className="mt-1 text-xs leading-5 text-emerald-800">
              Select the levels you want to include, then start today’s check.
            </p>
          </div>

          <label
            className={`mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
              allLevelsSelected
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allLevelsSelected}
                onChange={onToggleAllLevels}
                className="h-4 w-4 accent-slate-900"
              />

              <span className="font-black">All Levels</span>
            </span>

            <span className={`text-xs ${allLevelsSelected ? "text-white/70" : "text-slate-400"}`}>
              {allLevelsDueCount} due today
            </span>
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {levels.map((level) => {
              const selected = setupLevels.includes(level);
              const availableCount = availableCountByLevel[level] ?? 0;

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onToggleLevel(level)}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-black">{level}</div>

                  <div className={`mt-1 text-xs ${selected ? "text-white/75" : "text-slate-400"}`}>
                    {availableCount} due today
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            The reminder clears after you finish at least {minDueCards} due cards.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Strict due cards</div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Ability Check gives you the cards that are due today for the levels you choose.
            If you leave before finishing, Mekuru keeps your place and the reminder stays on
            until at least 10 cards are completed.
          </p>
        </section>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onStartDailyCheck}
            disabled={setupLevels.length === 0}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-black disabled:opacity-40"
          >
            {selectedDueCount > 0 ? `Start ${selectedDueCount} Card Check` : "Start Ability Check"}
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
