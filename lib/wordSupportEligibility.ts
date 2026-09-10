type WordSupport = { surface?: string | null; reading?: string | null; meaning?: string | null; target_language_code?: string | null; excluded_from_flashcards?: boolean | null };

export function isReadyForFlashcards(word: WordSupport) {
  if (!word.surface?.trim()) return false;
  return word.target_language_code?.trim() === "en"
    ? Boolean(word.meaning?.trim())
    : Boolean(word.reading?.trim());
}

export function canLoadJapaneseFlashcard(word: WordSupport) {
  // Older saves excluded names solely because their meaning was empty.
  return word.excluded_from_flashcards === false ||
    (!word.meaning?.trim() && Boolean(word.surface?.trim() && word.reading?.trim()));
}

export function canStudyWord(card: { word: string; reading: string | null; meaning: string | null }, studySet: string) {
  if (!card.word.trim()) return false;
  if (["READING", "READING_MC", "FROM_READING_MC"].includes(studySet)) return Boolean(card.reading?.trim());
  if (!card.meaning?.trim()) return false;
  if (["FROM_READING_MEANING", "FROM_READING_MEANING_MC", "COMPLETE", "COMPLETE_TYPING"].includes(studySet)) return Boolean(card.reading?.trim());
  return true;
}
