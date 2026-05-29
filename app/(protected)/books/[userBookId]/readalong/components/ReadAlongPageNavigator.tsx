type ReadAlongPageNavigatorProps = {
  pageIndex: number;
  pageCount: number;
  jumpPageInput: string;
  onJumpPageInputChange: (value: string) => void;
  onJumpToPage: (pageNumber: number) => void;
  onPrevious: () => void;
  onNext: () => void;
};

// Page navigation controls for the Read Along reader.
// page.tsx still owns pageIndex, URL/page-jump behavior, and keyboard navigation;
// this component only renders the buttons/input and calls the page-owned callbacks.
export default function ReadAlongPageNavigator({
  pageIndex,
  pageCount,
  jumpPageInput,
  onJumpPageInputChange,
  onJumpToPage,
  onPrevious,
  onNext,
}: ReadAlongPageNavigatorProps) {
  if (pageCount <= 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={pageIndex === 0}
        className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Previous
      </button>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={jumpPageInput}
          onChange={(e) => onJumpPageInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onJumpToPage(Number(jumpPageInput));
            }
          }}
          placeholder="Page"
          className="w-20 rounded-lg border border-stone-300 px-2 py-1 text-sm"
        />

        <button
          type="button"
          onClick={() => onJumpToPage(Number(jumpPageInput))}
          className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-black"
        >
          Go
        </button>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={pageIndex === pageCount - 1}
        className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}