// Mekuru Feature Access
//
// This helper describes which features a user can use.
// For now, it should not replace route guards by itself.
// Start by using it on low-risk index/UI pages, then gradually expand.

export type MekuruRole = "teacher" | "super_teacher" | string | null | undefined;

export type FeatureAccessLevel =
  | "free"
  | "full_access"
  | "teacher"
  | "admin";

export type FeatureAccessReason =
  | "free"
  | "trial"
  | "paid"
  | "book_club"
  | "teacher"
  | "admin";

export type FeatureAccessInput = {
  role?: MekuruRole;

  // Use this when another helper has already decided the user has full access.
  hasFullAccess?: boolean;

  // These optional flags let us keep the future access reasons clear.
  isTrialActive?: boolean;
  isPaidActive?: boolean;
  isBookClubAccessActive?: boolean;
};

export type FeatureAccess = {
  accessLevel: FeatureAccessLevel;
  accessReason: FeatureAccessReason;
  hasFullAccess: boolean;
  isTeacher: boolean;
  isAdmin: boolean;

  // Free reading-life features
  canTrackBooks: boolean;
  canUseBookHubIndex: boolean;
  canUseBookInfo: boolean;
  canUseReadingReflection: boolean;
  canUseJustReadingTimer: boolean;
  canUseListeningTimer: boolean;
  canUseBookStatsSnapshots: boolean;
  canUseGlobalReadingStats: boolean;

  // Discovery/community features
  canUseDiscoveryHub: boolean;
  canUseFindNextBook: boolean;

  // Full-access vocabulary/study features
  canUseCuriosityReading: boolean;
  canUseSavedWordReading: boolean;
  canSaveVocabulary: boolean;
  canUseVocabularyList: boolean;
  canUseStudyFlashcards: boolean;
  canUseAbilityCheck: boolean;
  canUseVocabTools: boolean;
  canUseStoryNotes: boolean;
  canUseVocabularyStats: boolean;
  canUseReadingColors: boolean;

  // Demo/preview behavior
  canViewVocabularyDemo: boolean;
  canViewStudyDemo: boolean;
};

export function getFeatureAccess(input: FeatureAccessInput): FeatureAccess {
  const isAdmin = input.role === "super_teacher";
  const isTeacher = input.role === "teacher" || isAdmin;

  // Keep super_teacher as the technical role for now.
  // In feature-access language, super_teacher means admin-level access.
  const hasFullAccess =
    isTeacher ||
    input.hasFullAccess === true ||
    input.isTrialActive === true ||
    input.isPaidActive === true ||
    input.isBookClubAccessActive === true;

  const accessReason: FeatureAccessReason = isAdmin
    ? "admin"
    : isTeacher
      ? "teacher"
      : input.isTrialActive
        ? "trial"
        : input.isPaidActive
          ? "paid"
          : input.isBookClubAccessActive
            ? "book_club"
            : input.hasFullAccess
              ? "paid"
              : "free";

  const accessLevel: FeatureAccessLevel = isAdmin
    ? "admin"
    : isTeacher
      ? "teacher"
      : hasFullAccess
        ? "full_access"
        : "free";

  return {
    accessLevel,
    accessReason,
    hasFullAccess,
    isTeacher,
    isAdmin,

    // Free reading-life features.
    // These should stay available even after trial/full access ends.
    canTrackBooks: true,
    canUseBookHubIndex: true,
    canUseBookInfo: true,
    canUseReadingReflection: true,
    canUseJustReadingTimer: true,
    canUseListeningTimer: true,
    canUseBookStatsSnapshots: true,
    canUseGlobalReadingStats: true,

    // Discovery/community features.
    // Find Your Next Book should stay true only if/when it reads from a safe
    // anonymous shared signal source rather than private user_books rows.
    canUseDiscoveryHub: true,
    canUseFindNextBook: true,

    // Full-access vocabulary/study features.
    canUseCuriosityReading: hasFullAccess,
    canUseSavedWordReading: hasFullAccess,
    canSaveVocabulary: hasFullAccess,
    canUseVocabularyList: hasFullAccess,
    canUseStudyFlashcards: hasFullAccess,
    canUseAbilityCheck: hasFullAccess,
    canUseVocabTools: hasFullAccess,
    canUseStoryNotes: hasFullAccess,
    canUseVocabularyStats: hasFullAccess,
    canUseReadingColors: hasFullAccess,

    // Free users can see examples of the learning engine,
    // but not use real saved-vocabulary/study functionality.
    canViewVocabularyDemo: !hasFullAccess,
    canViewStudyDemo: !hasFullAccess,
  };
}

export function userHasFullLearningAccess(featureAccess: FeatureAccess) {
  return featureAccess.hasFullAccess;
}

export function userHasFreeOnlyAccess(featureAccess: FeatureAccess) {
  return !featureAccess.hasFullAccess;
}