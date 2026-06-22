type TeacherBookReviewNavProps = {
    onBackToTeacherPortal: () => void;
    onBackToTeacherRatings: () => void;
};

export function TeacherBookReviewNav({
    onBackToTeacherPortal,
    onBackToTeacherRatings,
}: TeacherBookReviewNavProps) {
    return (
        <div className="flex flex-wrap gap-3">
            <button
                type="button"
                onClick={onBackToTeacherPortal}
                className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-stone-800"
            >
                ← Teacher Portal
            </button>

            <button
                type="button"
                onClick={onBackToTeacherRatings}
                className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-stone-800"
            >
                Back to Teacher Ratings
            </button>
        </div>
    );
}
