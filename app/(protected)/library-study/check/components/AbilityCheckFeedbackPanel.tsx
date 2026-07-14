type AbilityCheckFeedbackCard = {
  surface: string;
  reading: string;
  meaning: string;
  bookTitle: string;
};

type AbilityCheckFeedbackPanelProps = {
  checked: {
    ok: boolean;
    correct: string;
  };
  correctionComplete?: boolean;
  isMeaningCheck: boolean;
  card: AbilityCheckFeedbackCard | undefined;
};

export default function AbilityCheckFeedbackPanel({
  checked,
  correctionComplete = false,
  isMeaningCheck,
  card,
}: AbilityCheckFeedbackPanelProps) {
  return (
    <div className="mt-2 w-full max-w-sm text-center text-sm">
      {checked.ok && isMeaningCheck ? (
        <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-950 shadow-sm">
          <span className="pointer-events-none absolute left-5 top-4 h-2 w-2 animate-[purpleBurst_900ms_ease-out_forwards] rounded-full bg-violet-400 shadow-[0_0_0_0_rgba(139,92,246,0.6)]" />
          <span className="pointer-events-none absolute right-8 top-5 h-1.5 w-1.5 animate-[purpleBurst_1000ms_ease-out_120ms_forwards] rounded-full bg-fuchsia-300 shadow-[0_0_0_0_rgba(217,70,239,0.55)]" />
          <span className="pointer-events-none absolute bottom-5 left-1/2 h-1.5 w-1.5 animate-[purpleBurst_950ms_ease-out_220ms_forwards] rounded-full bg-amber-200 shadow-[0_0_0_0_rgba(251,191,36,0.5)]" />

          <div className="text-lg font-black">
            This word became Purple!
          </div>

          <div className="mt-1 text-xs text-violet-700">
            Mastered words leave normal Ability Check.
          </div>

          <style jsx>{`
            @keyframes purpleBurst {
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
                transform: scale(1.2);
                box-shadow:
                  18px -10px 0 -1px currentColor,
                  -16px -8px 0 -1px currentColor,
                  2px 18px 0 -1px currentColor;
              }
            }
          `}</style>
        </div>
      ) : checked.ok ? (
        <p className="text-green-700">Correct!</p>
      ) : correctionComplete ? (
        <p className="text-green-700">Correction accepted.</p>
      ) : (
        <>
          <p className="text-red-700">Not quite.</p>
          <p className="mt-1 text-gray-600">
            Correct answer: {checked.correct}
          </p>
        </>
      )}

      <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
        <div className="text-lg font-semibold">{card?.surface}</div>
        <div className="mt-1 text-sm text-slate-500">{card?.reading}</div>
        <div className="mt-1 text-sm text-slate-700">{card?.meaning}</div>
        <div className="mt-2 text-xs text-slate-500">
          From: {card?.bookTitle}
        </div>
      </div>
    </div>
  );
}
