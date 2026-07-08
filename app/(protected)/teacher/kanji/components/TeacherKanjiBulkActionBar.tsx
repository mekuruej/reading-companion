type TeacherKanjiBulkActionBarProps = {
  bulkOpenLimit: number;
  bulkOpenCount: number;
  openEditorCount: number;
  bulkOpening: boolean;
  bulkSaving: boolean;
  onOpenBatch: () => void;
  onSaveAll: () => void;
};

export default function TeacherKanjiBulkActionBar({
  bulkOpenLimit,
  bulkOpenCount,
  openEditorCount,
  bulkOpening,
  bulkSaving,
  onOpenBatch,
  onSaveAll,
}: TeacherKanjiBulkActionBarProps) {
  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-stone-900">Bulk open</p>
        <p className="mt-1 text-xs text-stone-500">
          Prepare rows and open editors for the first {bulkOpenLimit} visible
          queue items.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onOpenBatch}
          disabled={bulkOpening || bulkSaving || bulkOpenCount === 0}
          className="rounded-2xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bulkOpening ? "Opening batch…" : `Open first ${bulkOpenCount || bulkOpenLimit}`}
        </button>

        <button
          type="button"
          onClick={onSaveAll}
          disabled={bulkSaving || openEditorCount === 0}
          className="rounded-2xl border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bulkSaving
            ? "Saving all…"
            : `Save all open ${openEditorCount ? `(${openEditorCount})` : ""}`}
        </button>
      </div>
    </div>
  );
}
