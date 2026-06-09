type TeacherKanjiQueueActionsProps = {
  isPreparing: boolean;
  isEditorOpen: boolean;
  isIgnoring: boolean;
  flaggedMapRowCount: number;
  onOpenEditor: () => void;
  onClearFlag: () => void;
  onExclude: () => void;
};

export default function TeacherKanjiQueueActions({
  isPreparing,
  isEditorOpen,
  isIgnoring,
  flaggedMapRowCount,
  onOpenEditor,
  onClearFlag,
  onExclude,
}: TeacherKanjiQueueActionsProps) {
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onOpenEditor}
        disabled={isPreparing}
        className="rounded-xl border border-stone-900 bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
      >
        {isPreparing ? "Opening…" : isEditorOpen ? "Editor open above" : "Open editor"}
      </button>

      {flaggedMapRowCount > 0 ? (
        <button
          type="button"
          onClick={onClearFlag}
          disabled={isIgnoring}
          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {isIgnoring ? "Clearing…" : "Clear flag only"}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onExclude}
        disabled={isIgnoring}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50 disabled:opacity-50"
      >
        {isIgnoring ? "Removing…" : "Exclude from kanji readings"}
      </button>
    </div>
  );
}