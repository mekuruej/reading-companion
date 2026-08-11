// Empty reader state for pages or sections without Follow-Along-ready words.
// page.tsx still decides when the current page has no support words.
import type { ReactNode } from "react";

type ReadAlongEmptyStateProps = {
  canAddWord?: boolean;
  isAddWordOpen?: boolean;
  addWordPanel?: ReactNode;
  onAddWord?: () => void;
};

export default function ReadAlongEmptyState({
  canAddWord = false,
  isAddWordOpen = false,
  addWordPanel = null,
  onAddWord,
}: ReadAlongEmptyStateProps) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <div className="text-2xl font-semibold text-stone-700">
        No Follow-Along-ready words yet
      </div>

      <p className="mt-3 text-sm text-stone-500">
        Add meanings to your saved words to use them here.
      </p>

      {canAddWord ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={onAddWord}
            className="rounded-full bg-violet-700 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-violet-800"
          >
            {isAddWordOpen ? "Close add word" : "Add a word to this page"}
          </button>

          {isAddWordOpen ? (
            <div className="mt-4 text-left">
              {addWordPanel}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
