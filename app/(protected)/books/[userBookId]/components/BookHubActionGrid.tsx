// Book Hub Action Grid
//

"use client";

type BookHubActionGridProps = {
    canUseCuriosityReading: boolean;
    canUseSavedWordReading: boolean;
    canUseStudyFlashcards: boolean;
    canUseVocabularyList: boolean;

    onCuriosityReading: () => void;
    onFluidReadingExtensive: () => void;
    onFluidReadingJustReading: () => void;
    onListening: () => void;
    onStudyFlashcards: () => void;
    onVocabularyList: () => void;
};

function ActionButton({
    title,
    subtitle,
    description,
    className,
    onClick,
    locked = false,
    lockedLabel = "Full access",
}: {
    title: string;
    subtitle?: string;
    description: string | string[];
    className: string;
    onClick: () => void | Promise<void>;
    locked?: boolean;
    lockedLabel?: string;
}) {
    return (
        <button
            type="button"
            onClick={locked ? undefined : onClick}
            disabled={locked}
            aria-disabled={locked}
            title={locked ? `${title} is a full-access feature.` : undefined}
            className={[
                "relative rounded-xl border border-stone-900 px-3.5 py-3 text-center shadow-sm transition-all",
                locked
                    ? "cursor-not-allowed bg-stone-100 text-stone-400 opacity-60 grayscale"
                    : `hover:-translate-y-[1px] hover:shadow-md ${className}`,
            ].join(" ")}
        >
            {locked ? (
                <div className="absolute right-2 top-2 rounded-full border border-stone-300 bg-white/80 px-2 py-0.5 text-xs font-black text-stone-500 shadow-sm">
                    🔒
                </div>
            ) : null}

            <div
                className={[
                    "text-base font-semibold sm:text-lg",
                    locked ? "text-stone-500" : "text-stone-900",
                ].join(" ")}
            >
                {title}
            </div>

            {subtitle ? (
                <div
                    className={[
                        "font-semibold",
                        locked ? "text-stone-500" : "text-stone-900",
                        subtitle.startsWith("(") ? "text-xs sm:text-sm" : "text-base sm:text-lg",
                    ].join(" ")}
                >
                    {subtitle}
                </div>
            ) : null}

            <div
                className={[
                    "mt-2 text-xs leading-5",
                    locked ? "text-stone-500" : "text-stone-700",
                ].join(" ")}
            >
                {Array.isArray(description)
                    ? description.map((line) => (
                        <span key={line} className="block">
                            {line}
                        </span>
                    ))
                    : description}
            </div>

            {locked ? (
                <div className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                    {lockedLabel}
                </div>
            ) : null}
        </button>
    );
}

export default function BookHubActionGrid({
    canUseCuriosityReading,
    canUseSavedWordReading,
    canUseStudyFlashcards,
    canUseVocabularyList,
    onCuriosityReading,
    onFluidReadingExtensive,
    onFluidReadingJustReading,
    onListening,
    onStudyFlashcards,
    onVocabularyList,
}: BookHubActionGridProps) {
    return (
        <div className="pb-2">
            <div className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <ActionButton
                    title="Curiosity Reading"
                    subtitle="(Intensive)"
                    description={["Read while saving vocab", "and log a slower, mindful session."]}
                    className="bg-sky-50 hover:bg-sky-100"
                    locked={!canUseCuriosityReading}
                    onClick={onCuriosityReading}
                />

                <ActionButton
                    title="Supported Reading"
                    subtitle="(Extensive Saved Word Support)"
                    description={["Review reading with light support", "from words you already saved."]}
                    className="bg-emerald-50 hover:bg-emerald-100"
                    locked={!canUseSavedWordReading}
                    onClick={onFluidReadingExtensive}
                />

                <ActionButton
                    title="Just Reading"
                    subtitle="(Extensive Fluid Reading)"
                    description={["Read without support or lookups.", "Just enjoy the book and log your time."]}
                    className="bg-violet-50 hover:bg-violet-100"
                    onClick={onFluidReadingJustReading}
                />

                <ActionButton
                    title="Listening"
                    subtitle="(Ear Training)"
                    description={["Listen to the audiobook", "and log words you hear."]}
                    className="bg-violet-50 hover:bg-violet-100"
                    onClick={onListening}
                />

                <ActionButton
                    title="Study"
                    subtitle="Flashcards"
                    description="Review the words you saved from this book."
                    className="bg-sky-50 hover:bg-sky-100"
                    locked={!canUseStudyFlashcards}
                    onClick={onStudyFlashcards}
                />

                <ActionButton
                    title="Vocabulary"
                    subtitle="List"
                    description="Open the saved words and vocabulary tools for this book."
                    className="bg-emerald-50 hover:bg-emerald-100"
                    locked={!canUseVocabularyList}
                    onClick={onVocabularyList}
                />
            </div>
        </div>
    );
}