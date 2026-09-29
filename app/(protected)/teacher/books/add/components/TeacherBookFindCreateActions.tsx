type TeacherBookFindCreateActionsProps = {
    isbnLookupLoading: boolean;
    hasIsbnValue: boolean;
    saving: boolean;
    missingCoreFields: string[];
    isbnLookupError: string;
    onLookupIsbn: () => void;
    onCreateOrLoad: () => void;
    onClear: () => void;
};

export function TeacherBookFindCreateActions({
    isbnLookupLoading,
    hasIsbnValue,
    saving,
    missingCoreFields,
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
                    type="button"
                    disabled={saving || isbnLookupLoading || missingCoreFields.length > 0}
                    aria-describedby="manual-create-requirements"
                    className="rounded-2xl bg-stone-900 px-5 py-3 font-semibold text-white hover:bg-black disabled:opacity-50"
                >
                    {saving ? "Working..." : "Create Manual Book Entry"}
                </button>

                <button
                    onClick={onClear}
                    type="button"
                    className="rounded-2xl border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-700 hover:bg-stone-50"
                >
                    Clear
                </button>
            </div>

            <p id="manual-create-requirements" className="mt-3 text-sm text-stone-600" aria-live="polite">
                {missingCoreFields.length
                    ? `To create a new entry, complete: ${missingCoreFields.join(", ")}. Title search needs only a title; ISBN lookup needs only an ISBN.`
                    : "Ready to create. ISBN and ASIN are optional."}
            </p>

            {isbnLookupError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {isbnLookupError}
                </div>
            ) : null}
        </>
    );
}
