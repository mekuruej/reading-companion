type TeacherBookFindCreateActionsProps = {
    isbnLookupLoading: boolean;
    hasIsbnValue: boolean;
    saving: boolean;
    isBookRequest: boolean;
    isbnLookupError: string;
    onLookupIsbn: () => void;
    onCreateOrLoad: () => void;
    onClear: () => void;
};

export function TeacherBookFindCreateActions({
    isbnLookupLoading,
    hasIsbnValue,
    saving,
    isBookRequest,
    isbnLookupError,
    onLookupIsbn,
    onCreateOrLoad,
    onClear,
}: TeacherBookFindCreateActionsProps) {
    return (
        <>
            <div className="mt-5 flex flex-wrap gap-3">
                <button
                    onClick={onLookupIsbn}
                    disabled={isbnLookupLoading || !hasIsbnValue}
                    type="button"
                    className="rounded-2xl border border-sky-300 bg-white px-5 py-3 font-semibold text-sky-900 hover:bg-sky-50 disabled:opacity-50"
                >
                    {isbnLookupLoading ? "Looking up..." : "Look up ISBN"}
                </button>

                <button
                    onClick={onCreateOrLoad}
                    disabled={saving}
                    className="rounded-2xl bg-stone-900 px-5 py-3 font-semibold text-white hover:bg-black disabled:opacity-50"
                >
                    {saving
                        ? "Working..."
                        : isBookRequest
                            ? "Create Manual Book Entry"
                            : "Create / Load by ISBN"}
                </button>

                <button
                    onClick={onClear}
                    type="button"
                    className="rounded-2xl border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-700 hover:bg-stone-50"
                >
                    Clear
                </button>
            </div>

            {isbnLookupError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {isbnLookupError}
                </div>
            ) : null}
        </>
    );
}