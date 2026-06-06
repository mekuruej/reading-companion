type WordDetailFooterActionsProps = {
  onBack: () => void;
  onRefresh: () => void;
};

export default function WordDetailFooterActions({
  onBack,
  onRefresh,
}: WordDetailFooterActionsProps) {
  return (
    <div className="mt-8 flex justify-between">
      <button onClick={onBack} className="rounded bg-gray-200 px-4 py-2">
        ← Back
      </button>

      <button onClick={onRefresh} className="rounded bg-gray-100 px-4 py-2">
        Refresh
      </button>
    </div>
  );
}