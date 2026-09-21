import type { StoryTabMode } from "./readingJournalTypes";

export const DEFAULT_BOOK_JOURNAL_TAB: StoryTabMode = "characters";

const BOOK_JOURNAL_TABS: StoryTabMode[] = [
  "characters", "plot", "setting", "quotes", "cultural", "detective", "notes", "review",
];

// All books share the same journal navigation, regardless of language.
export function getBookJournalTabOrder(
  _languageCode: string | null | undefined,
  _ownerNativeLanguage: string | null | undefined
): StoryTabMode[] {
  return [...BOOK_JOURNAL_TABS];
}
