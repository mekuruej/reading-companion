type TeacherBookReviewAccessStateProps = {
    message: string;
};

export function TeacherBookReviewAccessState({
    message,
}: TeacherBookReviewAccessStateProps) {
    return (
        <main className="min-h-screen bg-stone-50 p-6">
            <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
                {message}
            </div>
        </main>
    );
}