type TeacherBookIsbnPreview = {
    isbn13: string;
    title: string | null;
    author_display: string | null;
    cover_url: string | null;
    publisher: string | null;
    published_date: string | null;
    metadata_source: "mekuru" | "openbd" | "google_books" | "open_library" | "none";
    found_existing_book: boolean;
    existing_book_id: string | null;
    needs_review: boolean;
};

type TeacherBookIsbnPreviewCardProps = {
    preview: TeacherBookIsbnPreview;
    saving: boolean;
    metadataSourceLabel: (value: TeacherBookIsbnPreview["metadata_source"]) => string;
    onCreateOrLoad: () => void;
};

export function TeacherBookIsbnPreviewCard({
    preview,
    saving,
    metadataSourceLabel,
    onCreateOrLoad,
}: TeacherBookIsbnPreviewCardProps) {
    return (
        <div className="mt-5 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
            {preview.found_existing_book ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                    This ISBN already exists in the global library. Do not create a duplicate.
                </div>
            ) : (
                <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                    Metadata preview only. Nothing has been saved to Mekuru yet.
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
                {preview.cover_url ? (
                    <img
                        src={preview.cover_url}
                        alt=""
                        className="h-40 w-28 rounded-xl object-cover shadow-sm"
                    />
                ) : (
                    <div className="flex h-40 w-28 items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-xs text-stone-500">
                        No cover
                    </div>
                )}

                <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
                        ISBN Lookup Preview
                    </div>
                    <h3 className="mt-1 text-xl font-black text-stone-950">
                        {preview.title ?? "Untitled book"}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600">
                        {preview.author_display ?? "Author unknown"}
                    </p>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="font-semibold text-stone-500">Publisher</dt>
                            <dd className="text-stone-900">{preview.publisher ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-stone-500">Published date</dt>
                            <dd className="text-stone-900">
                                {preview.published_date ?? "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-stone-500">ISBN-13</dt>
                            <dd className="text-stone-900">{preview.isbn13}</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-stone-500">Metadata source</dt>
                            <dd className="text-stone-900">
                                {metadataSourceLabel(preview.metadata_source)}
                            </dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-stone-500">Existing book</dt>
                            <dd className="text-stone-900">
                                {preview.found_existing_book
                                    ? `Yes (${preview.existing_book_id ?? "ID unavailable"})`
                                    : "No"}
                            </dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-stone-500">Needs review</dt>
                            <dd className="text-stone-900">
                                {preview.needs_review ? "Yes" : "No"}
                            </dd>
                        </div>
                    </dl>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={onCreateOrLoad}
                            disabled={saving}
                            className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50"
                        >
                            {saving
                                ? "Working..."
                                : preview.found_existing_book
                                    ? "Load existing global book"
                                    : "Create global book from this metadata"}
                        </button>

                        {!preview.title ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                This preview has no title, so it needs manual/admin review before creating.
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}