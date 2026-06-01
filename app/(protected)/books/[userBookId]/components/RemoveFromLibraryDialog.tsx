type RemoveFromLibraryDialogProps = {
  error: string | null;
  isRemoving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function RemoveFromLibraryDialog({
  error,
  isRemoving,
  onCancel,
  onConfirm,
}: RemoveFromLibraryDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-700">
          Library Action
        </div>

        <h2 className="mt-2 text-2xl font-bold text-stone-950">
          Remove from My Library?
        </h2>

        <p className="mt-3 text-sm leading-6 text-stone-700">
          Remove this book from your library? This will remove your saved words,
          reading sessions, and stats for this book. The shared book record will
          stay in Mekuru.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRemoving}
            className="rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 disabled:opacity-70"
          >
            {isRemoving ? "Please wait" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isRemoving}
            className="rounded-full bg-rose-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800 disabled:cursor-wait disabled:bg-rose-500 disabled:opacity-90"
          >
            {isRemoving ? "Removing..." : "Remove from My Library"}
          </button>
        </div>
      </div>
    </div>
  );
}