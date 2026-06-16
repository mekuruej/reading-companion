type AbilityCheckIntroCardProps = {
  sessionSummaryText?: string;
  onOpenPractice: () => void;
};

export default function AbilityCheckIntroCard({
  sessionSummaryText,
  onOpenPractice,
}: AbilityCheckIntroCardProps) {
  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Ability Check
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            A daily gate check for Yellow, Green, and Blue words.
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Don’t worry about checking this on your own. Mekuru will alert you from your
            Library when enough cards are ready.
          </p>

          {sessionSummaryText ? (
            <p className="mt-1 text-xs text-slate-500">
              Today’s set: {sessionSummaryText}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onOpenPractice}
          className="rounded-2xl border border-sky-200 bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
        >
          Open Library Review
        </button>
      </div>
    </div>
  );
}