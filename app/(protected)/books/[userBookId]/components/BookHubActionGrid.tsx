// Book Hub Action Grid
//

"use client";

type BookHubActionGridProps = {
    onCuriosityReading: () => void;
    onFluidReadingExtensive: () => void;
    onFluidReadingJustReading: () => void;
    onListening: () => void;
    onStudyFlashcards: () => void;
    onVocabularyList: () => void;
    onBookStats: () => void;
    onFlagBook: () => void | Promise<void>;
};

function ActionButton({
    title,
    subtitle,
    description,
    className,
    onClick,
}: {
    title: string;
    subtitle?: string;
    description: string;
    className: string;
    onClick: () => void | Promise<void>;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-xl border border-stone-900 px-3.5 py-3 text-center shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md ${className}`}
        >
            <div className="text-base font-semibold text-stone-900 sm:text-lg">
                {title}
            </div>

            {subtitle ? (
                <div
                    className={`font-semibold text-stone-900 ${subtitle.startsWith("(")
                        ? "text-xs sm:text-sm"
                        : "text-base sm:text-lg"
                        }`}
                >
                    {subtitle}
                </div>
            ) : null}

            <div className="mt-2 text-xs leading-5 text-stone-700">
                {description}
            </div>
        </button>
    );
}

export default function BookHubActionGrid({
    onCuriosityReading,
    onFluidReadingExtensive,
    onFluidReadingJustReading,
    onListening,
    onStudyFlashcards,
    onVocabularyList,
    onBookStats,
    onFlagBook,
}: BookHubActionGridProps) {
    return (
        <div className="pb-2">
            <div className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <ActionButton
                    title="Curiosity Reading"
                    subtitle="(Intensive)"
                    description="Read while saving vocab and logging a slower, mindful session."
                    className="bg-rose-50 hover:bg-rose-100"
                    onClick={onCuriosityReading}
                />

                <ActionButton
                    title="Fluid Reading"
                    subtitle="(Saved Word Support)"
                    description="Read forward with light support from words you already saved."
                    className="bg-emerald-50 hover:bg-emerald-100"
                    onClick={onFluidReadingExtensive}
                />

                <ActionButton
                    title="Fluid Reading"
                    subtitle="(Extensive · Just Reading)"
                    description="Read without support or lookups. Just enjoy the book and log your time."
                    className="bg-sky-50 hover:bg-sky-100"
                    onClick={onFluidReadingJustReading}
                />

                <ActionButton
                    title="Listening"
                    subtitle="(Ear Training)"
                    description="Listen to the book or audiobook and log listening time."
                    className="bg-violet-50 hover:bg-violet-100"
                    onClick={onListening}
                />

                <ActionButton
                    title="Study"
                    subtitle="Flashcards"
                    description="Review the words you saved from this book."
                    className="bg-violet-50 hover:bg-violet-100"
                    onClick={onStudyFlashcards}
                />

                <ActionButton
                    title="Vocabulary"
                    subtitle="List"
                    description="Open the saved words and vocabulary tools for this book."
                    className="bg-sky-50 hover:bg-sky-100"
                    onClick={onVocabularyList}
                />

                <ActionButton
                    title="Book"
                    subtitle="Stats"
                    description="See this book’s progress, pace, time, vocabulary, and difficulty neighborhood."
                    className="bg-emerald-50 hover:bg-emerald-100"
                    onClick={onBookStats}
                />

                <ActionButton
                    title="Flag"
                    subtitle="This Book"
                    description="Send this Book Hub to the review queue with anything that needs attention."
                    className="bg-rose-50 hover:bg-rose-100"
                    onClick={onFlagBook}
                />
            </div>
        </div>
    );
}