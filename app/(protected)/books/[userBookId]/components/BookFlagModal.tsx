// Book Flag Modal
//

"use client";

type BookFlagModalProps = {
  bookTitle: string;
  note: string;
  isSaving: boolean;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
};

export default function BookFlagModal({
  bookTitle,
  note,
  isSaving,
  onNoteChange,
  onCancel,
  onSubmit,
}: BookFlagModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              Flag this book
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Send this Book Hub to the review queue.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Book
          </div>
          <div className="mt-1 text-sm font-semibold text-stone-900">
            {bookTitle}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-stone-800">
            What should someone look at?
          </span>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={5}
            placeholder="Example: The page count seems wrong, the vocab list is confusing, this book info needs cleanup, I need teacher help with this book..."
            className="mt-2 w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
        </label>

        <p className="mt-2 text-xs text-stone-500">
          A note is optional, but it makes the flag much easier to resolve later.
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isSaving ? "Sending..." : "Send Flag"}
          </button>
        </div>
      </div>
    </div>
  );
}