import { isNativeLanguageBook } from "@/lib/books/englishNativeTracker";
import type { StoryTabMode } from "./readingJournalTypes";

export const DEFAULT_BOOK_JOURNAL_TAB: StoryTabMode = "characters";

const mainTabOrders: Record<"native" | "target", StoryTabMode[]> = {
  native: ["characters", "plot", "quotes", "setting", "cultural", "detective"],
  target: ["characters", "plot", "detective", "setting", "cultural", "quotes"],
};
const personalTabs: StoryTabMode[] = ["notes", "review"];

export function getBookJournalTabOrder(
  bookLanguageCode: string | null | undefined,
  ownerNativeLanguage: string | null | undefined
): StoryTabMode[] {
  const mode = isNativeLanguageBook({ bookLanguageCode, ownerNativeLanguage })
    ? "native"
    : "target";
  return [...mainTabOrders[mode], ...personalTabs];
}
