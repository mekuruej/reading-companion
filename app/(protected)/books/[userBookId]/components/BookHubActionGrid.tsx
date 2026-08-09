// Book Hub Action Grid
//

"use client";

type BookHubActionGridProps = {
    hasFullAccess: boolean;
    isTrialAccess?: boolean;
    canUseCuriosityReading: boolean;
    canUseSavedWordReading: boolean;
    canUseStudyFlashcards: boolean;
    canUseVocabularyList: boolean;
    canUseBulkAdd?: boolean;
    canUseStoryNotes?: boolean;
    hasSavedWords: boolean;
    isEnglishNativeTrackerBook?: boolean;

    onCuriosityReading: () => void;
    onFluidReadingExtensive: () => void;
    onFluidReadingJustReading: () => void;
    onListening: () => void;
    onStudyFlashcards: () => void;
    onVocabularyList: () => void;
    onBulkAdd?: () => void;
    onStoryNotes?: () => void;
    onReadingSessions?: () => void;
    onBookStats?: () => void;
};

function ActionButton({
    title,
    subtitle,
    description,
    className,
    onClick,
    locked = false,
    lockedLabel = "Full access",
    size = "normal",
}: {
    title: string;
    subtitle?: string;
    description: string | string[];
    className: string;
    onClick: () => void | Promise<void>;
    locked?: boolean;
    lockedLabel?: string;
    size?: "normal" | "primary" | "secondary";
}) {
    const sizeClass =
        size === "primary"
            ? "min-h-[156px] px-5 py-5"
            : size === "secondary"
                ? "min-h-[96px] px-3 py-2.5"
                : "px-3.5 py-3";

    return (
        <button
            type="button"
            onClick={locked ? undefined : onClick}
            disabled={locked}
            aria-disabled={locked}
            title={locked ? `${title} is a full-access feature.` : undefined}
            className={[
                "relative rounded-xl border border-stone-900 text-center shadow-sm transition-all",
                sizeClass,
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
                    size === "primary" ? "text-lg font-black sm:text-xl" : "text-base font-semibold sm:text-lg",
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
                    subtitle.startsWith("(") || size === "secondary" ? "text-xs sm:text-sm" : "text-base sm:text-lg",
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
    hasFullAccess,
    isTrialAccess = false,
    canUseCuriosityReading,
    canUseSavedWordReading,
    canUseStudyFlashcards,
    canUseVocabularyList,
    canUseBulkAdd = false,
    canUseStoryNotes = false,
    hasSavedWords,
    isEnglishNativeTrackerBook = false,
    onCuriosityReading,
    onFluidReadingExtensive,
    onFluidReadingJustReading,
    onListening,
    onStudyFlashcards,
    onVocabularyList,
    onBulkAdd,
    onStoryNotes,
    onReadingSessions,
    onBookStats,
}: BookHubActionGridProps) {
    if (isEnglishNativeTrackerBook) {
        return (
            <div className="pb-2">
                <div className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 [&>button]:h-[104px]">
                    <ActionButton
                        title="Read / Listen"
                        description="Start a timed reading or listening session and update your progress."
                        className="bg-emerald-50 hover:bg-emerald-100"
                        onClick={onFluidReadingJustReading}
                        size="secondary"
                    />

                    {canUseStoryNotes && onStoryNotes ? (
                        <ActionButton
                            title="Reading Journal"
                            description="Track characters, plot, quotes, notes, and reviews."
                            className="bg-sky-50 hover:bg-sky-100"
                            onClick={onStoryNotes}
                            size="secondary"
                        />
                    ) : null}
                    {onBookStats ? (
                        <ActionButton
                            title="Book Stats"
                            description="Open time, pages, sessions, and progress for this book."
                            className="bg-yellow-50 hover:bg-yellow-100"
                            onClick={onBookStats}
                            size="secondary"
                        />
                    ) : null}

                    {onReadingSessions ? (
                        <ActionButton
                            title="Reading History"
                            description="Edit session records, dates, and reading history for this book."
                            className="bg-purple-50 hover:bg-purple-100"
                            onClick={onReadingSessions}
                            size="secondary"
                        />
                    ) : null}

                </div>
            </div>
        );
    }

    if (!hasFullAccess && !isTrialAccess) {
        return (
            <div className="pb-2">
                <div className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <ActionButton
                        title="Reading Timer"
                        subtitle="Just Reading"
                        description={["Fluid Reading: read without support", "or lookups, and log your time."]}
                        className="bg-violet-50 hover:bg-violet-100"
                        onClick={onFluidReadingJustReading}
                    />

                    <ActionButton
                        title="Listening Timer"
                        subtitle="Just Listening"
                        description={["Listen to the audiobook", "and log your listening time."]}
                        className="bg-violet-50 hover:bg-violet-100"
                        onClick={onListening}
                    />

                    {hasSavedWords ? (
                        <ActionButton
                            title="Vocabulary Archive"
                            subtitle="Saved Words"
                            description="View saved words for this book and export CSV."
                            className="bg-violet-50 hover:bg-violet-100"
                            onClick={onVocabularyList}
                        />
                    ) : null}
                </div>
            </div>
        );
    }

    if (isTrialAccess) {
        return (
            <div className="pb-2">
                <div className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <ActionButton
                        title="Follow-Along"
                        subtitle="Supported Reading"
                        description={["Fluid Reading: reread with", "saved-word support and log your time."]}
                        className="bg-violet-50 hover:bg-violet-100"
                        locked={!canUseSavedWordReading}
                        onClick={onFluidReadingExtensive}
                        size="primary"
                    />

                    <ActionButton
                        title="Review Words"
                        subtitle="Flashcards"
                        description="Review the words saved from this book."
                        className="bg-violet-50 hover:bg-violet-100"
                        locked={!canUseStudyFlashcards}
                        onClick={onStudyFlashcards}
                        size="primary"
                    />

                    <ActionButton
                        title="Save Words"
                        subtitle="Look up Words and Read"
                        description={["Curiosity Reading: save vocab", "while logging a slower session."]}
                        className="bg-violet-50 hover:bg-violet-100"
                        locked={!canUseCuriosityReading}
                        onClick={onCuriosityReading}
                        size="primary"
                    />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <ActionButton
                        title="Vocabulary List"
                        description="Open the saved words for this book."
                        className="bg-emerald-50 hover:bg-emerald-100"
                        locked={!canUseVocabularyList}
                        onClick={onVocabularyList}
                        size="secondary"
                    />

                    <ActionButton
                        title="Reading Timer"
                        subtitle="Just Reading"
                        description={["Fluid Reading: read without support", "or lookups, and log your time."]}
                        className="bg-sky-50 hover:bg-sky-100"
                        onClick={onFluidReadingJustReading}
                        size="secondary"
                    />

                    {onReadingSessions ? (
                        <ActionButton
                            title="Reading History"
                            description="Edit session records, dates, and reading history for this book."
                            className="bg-emerald-50 hover:bg-emerald-100"
                            onClick={onReadingSessions}
                            size="secondary"
                        />
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-2">
            <div className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <ActionButton
                    title="Follow-Along"
                    subtitle="Supported Reading"
                    description={["Fluid Reading: review with light support", "from words you already saved."]}
                    className="bg-violet-50 hover:bg-violet-100"
                    locked={!canUseSavedWordReading}
                    onClick={onFluidReadingExtensive}
                    size="primary"
                />

                <ActionButton
                    title="Review Words"
                    subtitle="Flashcards"
                    description="Review the words you saved from this book."
                    className="bg-violet-50 hover:bg-violet-100"
                    locked={!canUseStudyFlashcards}
                    onClick={onStudyFlashcards}
                    size="primary"
                />

                <ActionButton
                    title="Save Words"
                    subtitle="Look up Words and Read"
                    description={["Curiosity Reading: save vocab", "while logging a slower session."]}
                    className="bg-violet-50 hover:bg-violet-100"
                    locked={!canUseCuriosityReading}
                    onClick={onCuriosityReading}
                    size="primary"
                />
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm [&>button]:w-full sm:[&>button]:w-[calc(50%-0.25rem)] lg:[&>button]:w-[calc(25%-0.375rem)]">
                {hasSavedWords ? (
                    <ActionButton
                        title="Vocabulary List"
                        description="Open the saved words and vocabulary tools for this book."
                        className="bg-emerald-50 hover:bg-emerald-100"
                        locked={!canUseVocabularyList}
                        onClick={onVocabularyList}
                        size="secondary"
                    />
                ) : null}

                {canUseStoryNotes && onStoryNotes ? (
                    <ActionButton
                        title="Reading Journal"
                        description="Track detective notes, characters, plot, setting, cultural details, and quotes."
                        className="bg-sky-50 hover:bg-sky-100"
                        onClick={onStoryNotes}
                        size="secondary"
                    />
                ) : null}

                <ActionButton
                    title="Just Reading"
                    subtitle="Reading Timer"
                    description={["Fluid Reading: read without support", "or lookups, and log your time."]}
                    className="bg-emerald-50 hover:bg-emerald-100"
                    onClick={onFluidReadingJustReading}
                    size="secondary"
                />

                <ActionButton
                    title="Listening"
                    subtitle="Save Heard Words"
                    description={["Listen while saving vocab", "and log listening time."]}
                    className="bg-sky-50 hover:bg-sky-100"
                    onClick={onListening}
                    size="secondary"
                />
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm [&>button]:w-full sm:[&>button]:w-[calc(50%-0.25rem)] lg:[&>button]:w-[calc(25%-0.375rem)] xl:[&>button]:w-[calc(20%-0.4rem)]">
                {onReadingSessions ? (
                    <ActionButton
                        title="Reading History"
                        description="Edit session records, dates, and reading history for this book."
                        className="bg-orange-50 hover:bg-orange-100"
                        onClick={onReadingSessions}
                    />
                ) : null}

                {canUseBulkAdd && onBulkAdd ? (
                    <ActionButton
                        title="Bulk Add"
                        description="Add several words to this book at once."
                        className="bg-yellow-50 hover:bg-yellow-100"
                        onClick={onBulkAdd}
                    />
                ) : null}

                {onBookStats ? (
                    <ActionButton
                        title="Book Stats"
                        description="Open deeper stats for this book."
                        className="bg-yellow-50 hover:bg-yellow-100"
                        onClick={onBookStats}
                    />
                ) : null}
            </div>
        </div>
    );
}
