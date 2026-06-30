type WordDetailFooterActionsProps = {
  onBack: () => void;
  hidden: boolean | null;
  onEdit: () => void;
  onHide: () => void;
  onUnhide: () => void;
  onDelete: () => void;
};

export default function WordDetailFooterActions({
  onBack,
  hidden,
  onEdit,
  onHide,
  onUnhide,
  onDelete,
}: WordDetailFooterActionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
      >
        Back
      </button>

        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700"
        >
          Edit
        </button>

        {hidden ? (
          <button
            type="button"
            onClick={onUnhide}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Unhide
          </button>
        ) : (
          <button
            type="button"
            onClick={onHide}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Hide
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          Delete
        </button>
    </div>
  );
}
