type BookVocabReorderHintProps = {
  reordering: boolean;
  readOnly?: boolean;
};

// Small status hint for reading-order changes.
// The page keeps the actual reorder state and save behavior; this component only displays the current hint.
export default function BookVocabReorderHint({
  reordering,
  readOnly = false,
}: BookVocabReorderHintProps) {
  if (readOnly) return null;

  if (reordering) {
    return (
      <p className="mb-2 text-sm text-stone-500">Saving new order…</p>
    );
  }

  return (
    <p className="mb-2 text-sm text-stone-500">
      Use ⬆️ and ⬇️ to adjust order within the same chapter/page.
    </p>
  );
}
