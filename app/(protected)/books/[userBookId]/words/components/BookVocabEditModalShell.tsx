import type { ReactNode } from "react";

type BookVocabEditModalShellProps = {
  surface: string;
  wordId: string;
  editErr: string | null;
  editSaving: boolean;
  saveDisabled: boolean;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
};

// Modal frame for editing one saved vocabulary word.
// page.tsx still owns the edit state, controlled form inputs,
// definition-choice behavior, and save logic.
// This component only renders the overlay, header, error message,
// form slot, and footer buttons.
export default function BookVocabEditModalShell({
  surface,
  wordId,
  editErr,
  editSaving,
  saveDisabled,
  onClose,
  onSave,
  children,
}: BookVocabEditModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Edit word</h2>
            <p className="text-xs text-gray-500 mt-1">
              {surface} • {wordId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          >
            ✕ Close
          </button>
        </div>

        {editErr ? <p className="mt-3 text-sm text-red-700">{editErr}</p> : null}

        {children}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={editSaving}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
          >
            {editSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}