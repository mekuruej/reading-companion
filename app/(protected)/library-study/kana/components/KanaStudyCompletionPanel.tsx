type KanaStudyCompletionPanelProps = {
    correctCount: number;
    answeredCount: number;
    onStudySetAgain: () => void;
    onNextMode: () => void;
    onBackToLibraryStudy: () => void;
};

export function KanaStudyCompletionPanel({
    correctCount,
    answeredCount,
    onStudySetAgain,
    onNextMode,
    onBackToLibraryStudy,
}: KanaStudyCompletionPanelProps) {
    return (
        <section className="mt-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">
                Set complete
            </h2>
            <p className="mt-3 text-slate-700">
                You reviewed every character in this mode and character set.
            </p>
            <p className="mt-2 text-sm text-slate-500">
                Score: {correctCount} / {answeredCount}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                    type="button"
                    onClick={onStudySetAgain}
                    className="rounded bg-gray-700 px-4 py-2 text-white transition hover:bg-gray-800"
                >
                    Do set again
                </button>

                <button
                    type="button"
                    onClick={onNextMode}
                    className="rounded border border-slate-300 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
                >
                    Next mode
                </button>

                <button
                    type="button"
                    onClick={onBackToLibraryStudy}
                    className="rounded bg-gray-200 px-4 py-2 text-slate-800 transition hover:bg-gray-300"
                >
                    Back to Library Study
                </button>
            </div>
        </section>
    );
}