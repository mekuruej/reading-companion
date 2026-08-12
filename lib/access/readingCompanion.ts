import type { FeatureAccess } from "./featureAccess";
import { normalizeLanguageCode } from "@/lib/books/englishNativeTracker";

export type JapaneseLearningJournalTab = "detective" | "setting" | "cultural";

export type JapaneseLearningJournalArchiveTabs = Record<JapaneseLearningJournalTab, boolean>;

export const emptyJapaneseLearningJournalArchiveTabs: JapaneseLearningJournalArchiveTabs = {
  detective: false,
  setting: false,
  cultural: false,
};

export function isJapaneseLearningBook(bookLanguageCode: string | null | undefined) {
  return normalizeLanguageCode(bookLanguageCode) === "ja";
}

export function canUseReadingCompanionJournal({
  canAccessBook,
}: {
  canAccessBook: boolean;
}) {
  return canAccessBook;
}

export function canUseActiveJapaneseLearningJournal({
  bookLanguageCode,
  featureAccess,
}: {
  bookLanguageCode: string | null | undefined;
  featureAccess: Pick<FeatureAccess, "canUseStoryNotes">;
}) {
  return isJapaneseLearningBook(bookLanguageCode) && featureAccess.canUseStoryNotes;
}
