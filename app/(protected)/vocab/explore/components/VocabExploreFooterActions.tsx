type VocabExploreFooterActionsProps = {
  onBack: () => void;
  onClear: () => void;
};

export default function VocabExploreFooterActions({
  onBack,
  onClear,
}: VocabExploreFooterActionsProps) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded border bg-white px-4 py-2 text-sm hover:bg-gray-50"
      >
        Back
      </button>

      <button
        type="button"
        onClick={onClear}
        className="rounded border bg-white px-4 py-2 text-sm hover:bg-gray-50"
      >
        Clear
      </button>
    </div>
  );
}