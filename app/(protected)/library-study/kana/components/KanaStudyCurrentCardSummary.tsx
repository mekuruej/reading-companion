type KanaStudyCurrentCardSummaryProps = {
    modeLabel: string | undefined;
    promptLabel: string;
    cardNumber: number;
    cardCount: number;
    correctCount: number;
    answeredCount: number;
};

export function KanaStudyCurrentCardSummary({
    modeLabel,
    promptLabel,
    cardNumber,
    cardCount,
    correctCount,
    answeredCount,
}: KanaStudyCurrentCardSummaryProps) {
    return (
        <section className="mt-4 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
                        Current Card
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                        {modeLabel}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{promptLabel}</p>
                </div>

                <div className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700">
                    Card: {cardNumber} / {cardCount}
                    <span className="ml-3 text-slate-400">
                        Score: {correctCount} / {answeredCount}
                    </span>
                </div>
            </div>
        </section>
    );
}