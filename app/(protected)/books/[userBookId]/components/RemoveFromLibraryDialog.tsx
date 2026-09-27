import { useState } from "react";

type RemoveFromLibraryDialogProps = {
  retainForTeaching?: boolean;
  error: string | null;
  isRemoving: boolean;
  onCancel: () => void;
  onConfirm: (teachingChoice?: "keep" | "remove") => void;
};

export default function RemoveFromLibraryDialog({
  retainForTeaching = false,
  error,
  isRemoving,
  onCancel,
  onConfirm,
}: RemoveFromLibraryDialogProps) {
  const [choice, setChoice] = useState<"keep" | "remove" | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4 py-6">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-700">
          Library Action
        </div>

        <h2 className="mt-2 text-2xl font-bold text-stone-950">
          Remove this book from My Library?
        </h2>

        <p className="mt-3 text-sm leading-6 text-stone-700">
          {retainForTeaching
            ? "Do you want to keep this book in My Teaching Books?"
            : "This will remove the book from your Mekuru library, including your saved words, reading sessions, and stats for this book. The shared book record will stay in Mekuru."}
        </p>

        {retainForTeaching ? (
          <fieldset className="mt-4 space-y-3 text-sm text-stone-700" disabled={isRemoving}>
            <legend className="sr-only">Teaching book choice</legend>
            <label className="block rounded-xl border border-stone-200 p-3">
              <input type="radio" name="teaching-removal" checked={choice === "keep"} onChange={() => setChoice("keep")} className="mr-2" />
              <span className="font-semibold">Keep in My Teaching Books</span>
              <span className="mt-1 block text-xs leading-5">Stop personal tracking and preserve reading history, journal, vocabulary, and teaching work.</span>
            </label>
            <label className="block rounded-xl border border-stone-200 p-3">
              <input type="radio" name="teaching-removal" checked={choice === "remove"} onChange={() => setChoice("remove")} className="mr-2" />
              <span className="font-semibold">Remove from both</span>
              <span className="mt-1 block text-xs leading-5">Delete this personal copy, its saved words, reading history and journal, plus your teaching-book entry, prep items and teaching vocabulary for this edition. Private Teacher Notebook notes and lists, student copies, and the shared catalog book remain.</span>
            </label>
          </fieldset>
        ) : null}

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
            onClick={() => onConfirm(retainForTeaching ? choice ?? undefined : undefined)}
            disabled={isRemoving || (retainForTeaching && !choice)}
            className="rounded-full bg-rose-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800 disabled:cursor-wait disabled:bg-rose-500 disabled:opacity-90"
          >
            {isRemoving ? "Saving..." : choice === "keep" ? "Keep teaching book" : retainForTeaching ? "Remove from both" : "Remove from My Library"}
          </button>
        </div>
      </div>
    </div>
  );
}