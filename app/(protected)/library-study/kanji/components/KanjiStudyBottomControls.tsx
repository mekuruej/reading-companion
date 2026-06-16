type KanjiStudyBottomControlsProps = {
  canGoPrevious: boolean;
  onPrevious: () => void;
  onFinish: () => void;
  onFlag: () => void;
};

export default function KanjiStudyBottomControls({
  canGoPrevious,
  onPrevious,
  onFinish,
  onFlag,
}: KanjiStudyBottomControlsProps) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="rounded bg-gray-200 px-4 py-2 disabled:opacity-40"
      >
        Previous
      </button>

      <button
        type="button"
        onClick={onFinish}
        className="rounded bg-gray-700 px-4 py-2 text-white"
      >
        Finished for the Day
      </button>

      <button
        type="button"
        onClick={onFlag}
        className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800"
      >
        Flag for Review
      </button>
    </div>
  );
}