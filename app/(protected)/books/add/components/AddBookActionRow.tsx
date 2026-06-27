type AddBookActionRowProps = {
  addLoading: boolean;
  onAdd: () => void;
  onCancel: () => void;
};

export default function AddBookActionRow({
  addLoading,
  onAdd,
  onCancel,
}: AddBookActionRowProps) {
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onAdd}
        disabled={addLoading}
        className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {addLoading ? "Adding..." : "Add to my library"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50"
      >
        Cancel
      </button>
    </div>
  );
}
