type TeacherBookRequestPanelProps = {
    title: string | null;
    author: string | null;
    isbn13: string | null;
    status: string | null;
    saving: boolean;
    onReject: () => void;
};

export function TeacherBookRequestPanel({
    title,
    author,
    isbn13,
    status,
    saving,
    onReject,
}: TeacherBookRequestPanelProps) {
    return (
        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                Pending Book Request
            </p>
            <h2 className="mt-2 text-xl font-black text-stone-900">
                This request needs manual book entry.
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
                Mekuru could not find enough metadata automatically. Research the
                book from any clue below. ISBN is helpful when available, but it is
                not required for manual entry.
            </p>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                    <dt className="font-semibold text-stone-600">Requested title</dt>
                    <dd className="text-stone-900">{title || "—"}</dd>
                </div>
                <div>
                    <dt className="font-semibold text-stone-600">Author</dt>
                    <dd className="text-stone-900">{author || "—"}</dd>
                </div>
                <div>
                    <dt className="font-semibold text-stone-600">ISBN</dt>
                    <dd className="text-stone-900">{isbn13 || "—"}</dd>
                </div>
                <div>
                    <dt className="font-semibold text-stone-600">Status</dt>
                    <dd className="text-stone-900">{status || "pending"}</dd>
                </div>
            </dl>

            <div className="mt-5 border-t border-amber-200 pt-4">
                <button
                    type="button"
                    onClick={onReject}
                    disabled={saving}
                    className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                    {saving ? "Updating..." : "Reject Request"}
                </button>
                <p className="mt-2 text-xs leading-5 text-amber-800">
                    Use this if this request should not become a global book. Mekuru will keep the request history.
                </p>
            </div>
        </section>
    );
}