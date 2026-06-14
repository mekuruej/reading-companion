type TeacherBookReviewSaveBarProps = {
    saving: boolean;
    onSave: () => void;
};

export function TeacherBookReviewSaveBar({
    saving,
    onSave,
}: TeacherBookReviewSaveBarProps) {
    return (
        <div className="sticky bottom-4 flex justify-end">
            <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-2xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-black disabled:opacity-50"
            >
                {saving ? "Saving..." : "Save Teacher Review"}
            </button>
        </div>
    );
}