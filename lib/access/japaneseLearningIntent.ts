import { normalizeLanguageCode } from "@/lib/books/englishNativeTracker";

export type JapaneseLearningIntentProfile = {
  japanese_learning_enabled?: boolean | null;
  target_language?: string | null;
  role?: string | null;
  is_super_teacher?: boolean | null;
};

export function hasTeacherNavigationOverride(
  profile: JapaneseLearningIntentProfile | null | undefined
) {
  return Boolean(
    profile?.role === "teacher" ||
      profile?.role === "super_teacher" ||
      profile?.is_super_teacher
  );
}

export function wantsJapaneseLearning(
  profile: JapaneseLearningIntentProfile | null | undefined
) {
  if (typeof profile?.japanese_learning_enabled === "boolean") {
    return profile.japanese_learning_enabled;
  }

  return normalizeLanguageCode(profile?.target_language) === "ja";
}

export function shouldShowJapaneseStudyNavigation(
  profile: JapaneseLearningIntentProfile | null | undefined
) {
  return hasTeacherNavigationOverride(profile) || wantsJapaneseLearning(profile);
}

export function legacyTargetLanguageForJapaneseLearning(
  japaneseLearningEnabled: boolean
) {
  return japaneseLearningEnabled ? "Japanese" : null;
}
