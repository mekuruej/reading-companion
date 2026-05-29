type BookVocabKatakanaBadgeProps = {
  surface: string | null | undefined;
};

// Small visual marker for words written only in katakana.
// This component owns both the katakana-only check and the badge display
// so the table row can stay focused on layout.
export default function BookVocabKatakanaBadge({
  surface,
}: BookVocabKatakanaBadgeProps) {
  const compact = (surface ?? "").trim().replace(/\s+/g, "");
  const isKatakanaOnly =
    compact.length > 0 && /^[ァ-ヶー・･]+$/.test(compact);

  if (!isKatakanaOnly) {
    return null;
  }

  return (
    <span
      title="Katakana-only word"
      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white"
    >
      カ
    </span>
  );
}