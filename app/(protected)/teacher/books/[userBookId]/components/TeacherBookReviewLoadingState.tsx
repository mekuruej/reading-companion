type TeacherBookReviewLoadingStateProps = {
    message?: string;
};

export function TeacherBookReviewLoadingState({
    message = "Loading teacher review...",
}: TeacherBookReviewLoadingStateProps) {
    return (
        <main className="min-h-screen bg-stone-50 p-6">
            <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
                {message}
            </div>
        </main>
    );
}