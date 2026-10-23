export const JAPANESE_FLASHCARD_TYPING_MODES = [
  "READING",
  "FROM_READING_MEANING",
] as const;

export const JAPANESE_FLASHCARD_MULTIPLE_CHOICE_MODES = [
  "MEANING_MC",
  "FROM_READING_MC",
] as const;

export const JAPANESE_FLASHCARD_COMPLETE_MODES = [
  "COMPLETE",
  "COMPLETE_TYPING",
] as const;

export const JAPANESE_FLASHCARD_MODE_ORDER = [
  ...JAPANESE_FLASHCARD_TYPING_MODES,
  ...JAPANESE_FLASHCARD_MULTIPLE_CHOICE_MODES,
  ...JAPANESE_FLASHCARD_COMPLETE_MODES,
] as const;

export type JapaneseFlashcardMode =
  (typeof JAPANESE_FLASHCARD_MODE_ORDER)[number];

export function normalizeJapaneseFlashcardMode(
  value: unknown
): JapaneseFlashcardMode {
  return JAPANESE_FLASHCARD_MODE_ORDER.includes(
    value as JapaneseFlashcardMode
  )
    ? (value as JapaneseFlashcardMode)
    : "READING";
}
