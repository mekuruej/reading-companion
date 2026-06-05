type AbilityCheckActionPanelProps = {
  modeLabel: string;
  modeDescription: string;
  meaningReviewCount: number;
  canComeBackLater: boolean;
  onFinishForToday: () => void;
  onComeBackLater: () => void;
  onFlagCurrentCard: () => void;
};

export default function AbilityCheckActionPanel({
  modeLabel,
  modeDescription,
  meaningReviewCount,
  canComeBackLater,
  onFinishForToday,
  onComeBackLater,
  onFlagCurrentCard,
}: AbilityCheckActionPanelProps) {
  return (
    <div className="mt-2 w-full max-w-2xl space-y-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:justify-between">
          <div className="flex min-w-0 flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Check Mode
              </div>

              <div className="mt-1 text-sm font-semibold text-slate-900">
                {modeLabel}
              </div>

              <p className="mt-1 truncate text-xs text-gray-600">
                {modeDescription}
              </p>
            </div>
          </div>

          <div className="grid gap-2 md:w-[180px]">
            <button
              type="button"
              onClick={onFinishForToday}
              className="min-h-[74px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <div className="leading-tight">Finish early</div>
              <div className="text-[10px] font-normal text-slate-500">
                {meaningReviewCount > 0
                  ? "Review meaning answers"
                  : "Save your place"}
              </div>
            </button>

            {canComeBackLater ? (
              <button
                type="button"
                onClick={onComeBackLater}
                className="min-h-[74px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <div className="leading-tight">Too hard for now</div>
                <div className="text-[10px] font-normal text-slate-500">
                  Red support · 90 days
                </div>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onFlagCurrentCard}
              className="min-h-[74px] w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
            >
              <div className="leading-tight">Flag</div>
              <div className="text-[10px] font-normal text-amber-700">
                Problem card
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}