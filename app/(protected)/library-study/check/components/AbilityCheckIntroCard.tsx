type AbilityCheckIntroCardProps = {
  sessionSummaryText?: string;
};

export default function AbilityCheckIntroCard({
  sessionSummaryText,
}: AbilityCheckIntroCardProps) {
  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Ability Check
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          A gate check for Yellow, Green, and Blue words.
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
    </div>
  );
}
