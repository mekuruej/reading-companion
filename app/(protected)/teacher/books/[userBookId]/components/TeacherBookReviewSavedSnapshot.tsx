type SavedLevelInfo = {
    title: string;
    plain: string;
    cefr: string;
    jlpt: string;
    feel: string;
};

type TeacherBookReviewSavedSnapshotProps = {
    savedLevelInfo: SavedLevelInfo | null;
    recommendedLevel: string | null;
    studentUseRating: number | null;
    languageLearningRating: number | null;
    notes: string | null;
    stars5: (value: number | null) => string;
    studentUseLabel: (value: number | null) => string;
    languageLearningLabel: (value: number | null) => string;
};

export function TeacherBookReviewSavedSnapshot({
    savedLevelInfo,
    recommendedLevel,
    studentUseRating,
    languageLearningRating,
    notes,
    stars5,
    studentUseLabel,
    languageLearningLabel,
}: TeacherBookReviewSavedSnapshotProps) {
    return (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
            <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    Saved Teacher Review
                </div>
                <h2 className="mt-2 text-xl font-black text-stone-900">
                    Current teacher-facing read on this book
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                    This is the currently saved review. Edit the sections below, then save to update this snapshot.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Suitable Level
                    </div>
                    <div className="mt-2 text-base font-black text-stone-900">
                        {savedLevelInfo
                            ? `${savedLevelInfo.title} · ${savedLevelInfo.plain}`
                            : recommendedLevel || "Not set yet"}
                    </div>
                    {savedLevelInfo ? (
                        <>
                            <div className="mt-1 text-xs font-semibold text-amber-700">
                                {savedLevelInfo.cefr} · {savedLevelInfo.jlpt}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-stone-600">
                                {savedLevelInfo.feel}
                            </div>
                        </>
                    ) : null}
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Use With Students
                    </div>
                    <div className="mt-2 text-base font-black text-stone-900">
                        {studentUseRating ? `${studentUseRating}/5` : "Not rated yet"}
                    </div>
                    <div className="mt-1 text-amber-600">
                        {stars5(studentUseRating)}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-stone-600">
                        {studentUseLabel(studentUseRating)}
                    </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Learning Potential
                    </div>
                    <div className="mt-2 text-base font-black text-stone-900">
                        {languageLearningRating ? `${languageLearningRating}/5` : "Not rated yet"}
                    </div>
                    <div className="mt-1 text-amber-600">
                        {stars5(languageLearningRating)}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-stone-600">
                        {languageLearningLabel(languageLearningRating)}
                    </div>
                </div>
            </div>

            <div className="mt-3 rounded-2xl border border-emerald-100 bg-white/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Teacher Notes
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                    {notes?.trim() ? notes : "No saved teacher notes yet."}
                </div>
            </div>
        </section>
    );
}