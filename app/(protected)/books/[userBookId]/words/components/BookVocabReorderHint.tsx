type BookVocabReorderHintProps = {
  reordering: boolean;
};

// Small status hint for drag-and-drop reading order.
// The page keeps the actual reorder state and save behavior; this component only displays the current hint.
export default function BookVocabReorderHint({
  reordering,
}: BookVocabReorderHintProps) {
  if (reordering) {
    return (
      <p className="mb-2 text-sm text-stone-500">Saving new order…</p>
    );
  }

  return (
    <p className="mb-2 text-sm text-stone-500">
      Drag words by ☰ to adjust their reading order.
    </p>
  );
}