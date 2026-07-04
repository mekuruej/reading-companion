type KanaStudyFeedbackPanelProps = {
    isAnswered: boolean;
    isCorrect: boolean;
    answer: string;
    romaji: string;
    pronunciationHint: string;
    autoAdvancePaused: boolean;
    onToggleAutoAdvancePaused: () => void;
};

export function KanaStudyFeedbackPanel({
    isAnswered,
    isCorrect,
    answer,
    romaji,
    pronunciationHint,
    autoAdvancePaused,
    onToggleAutoAdvancePaused,
}: KanaStudyFeedbackPanelProps) {
    if (!isAnswered) {
        return (
            <p className="text-sm text-slate-500">
                Choose the best answer to check this card.
            </p>
        );
    }

    return (
        <div className="mt-2 w-full max-w-sm text-center text-sm">
            <p className={isCorrect ? "text-green-700" : "text-red-700"}>
                {isCorrect ? "Correct!" : "Not quite."}
            </p>

            <div className="mt-2 flex flex-col items-center gap-1.5">
                <button
                    type="button"
                    onClick={onToggleAutoAdvancePaused}
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    {autoAdvancePaused ? "Resume" : "Pause"}
                </button>

                <p className="text-xs text-slate-400">
                    {autoAdvancePaused
                        ? "Paused. Take your time with this kana."
                        : "Next card comes automatically."}
                </p>
            </div>

            <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
                <div className="text-3xl font-semibold text-slate-950">
                    {answer}
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-700">
                    {romaji} = 👂 {pronunciationHint}
                </div>
            </div>
        </div>
    );
}