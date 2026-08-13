import type { FeatureAccess } from "./featureAccess";
import { normalizeLanguageCode } from "@/lib/books/englishNativeTracker";

export type JapaneseLearningJournalTab = "detective" | "setting" | "cultural";

export type JapaneseLearningJournalArchiveTabs = Record<JapaneseLearningJournalTab, boolean>;

export type JapaneseLearningArchivePresence = JapaneseLearningJournalArchiveTabs & {
  vocabulary: boolean;
};

export const emptyJapaneseLearningJournalArchiveTabs: JapaneseLearningJournalArchiveTabs = {
  detective: false,
  setting: false,
  cultural: false,
};

export const emptyJapaneseLearningArchivePresence: JapaneseLearningArchivePresence = {
  ...emptyJapaneseLearningJournalArchiveTabs,
  vocabulary: false,
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

export function canUseActiveJapaneseLearningActions({
  bookLanguageCode,
  featureAccess,
}: {
  bookLanguageCode: string | null | undefined;
  featureAccess: Pick<
    FeatureAccess,
    | "canUseCuriosityReading"
    | "canUseSavedWordReading"
    | "canUseStudyFlashcards"
    | "canUseVocabularyList"
    | "canUseBulkAdd"
  >;
}) {
  return (
    isJapaneseLearningBook(bookLanguageCode) &&
    (featureAccess.canUseCuriosityReading ||
      featureAccess.canUseSavedWordReading ||
      featureAccess.canUseStudyFlashcards ||
      featureAccess.canUseVocabularyList ||
      featureAccess.canUseBulkAdd)
  );
}

export function hasJapaneseLearningArchive(
  archive: Partial<JapaneseLearningArchivePresence> | null | undefined
) {
  return Boolean(
    archive?.vocabulary ||
      archive?.detective ||
      archive?.setting ||
      archive?.cultural
  );
}
