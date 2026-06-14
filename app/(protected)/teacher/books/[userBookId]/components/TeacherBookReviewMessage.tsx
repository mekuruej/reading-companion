type TeacherBookReviewMessageProps = {
    errorMessage?: string | null;
    saveMessage?: string | null;
};

export function TeacherBookReviewMessage({
    errorMessage,
    saveMessage,
}: TeacherBookReviewMessageProps) {
    return (
        <>
            {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            {saveMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {saveMessage}
                </div>
            ) : null}
        </>
    );
}