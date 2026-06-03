// Full Access Requirements
//
// This helper gives paid/full-access feature gates one shared language.
// It does not redirect by itself and it does not change RLS.
// Pages can use it to decide whether to show the real tool or a friendly
// "full access required" message.

import type { FeatureAccess } from "./featureAccess";

export type FullAccessFeature =
  | "add_word"
  | "curiosity_reading"
  | "saved_word_reading"
  | "vocabulary_list"
  | "study_flashcards"
  | "ability_check"
  | "vocab_tools"
  | "story_notes"
  | "vocabulary_stats"
  | "reading_colors";

const FULL_ACCESS_FEATURE_LABELS: Record<FullAccessFeature, string> = {
  add_word: "vocabulary saving",
  curiosity_reading: "Curiosity Reading",
  saved_word_reading: "saved-word reading support",
  vocabulary_list: "Vocabulary List",
  study_flashcards: "Study Flashcards",
  ability_check: "Ability Check",
  vocab_tools: "Vocab Tools",
  story_notes: "Story Notes",
  vocabulary_stats: "vocabulary stats",
  reading_colors: "reading colors",
};

export function canUseFullAccessFeature(
  featureAccess: FeatureAccess,
  feature: FullAccessFeature
) {
  switch (feature) {
    case "add_word":
      return featureAccess.canSaveVocabulary;

    case "curiosity_reading":
      return featureAccess.canUseCuriosityReading;

    case "saved_word_reading":
      return featureAccess.canUseSavedWordReading;

    case "vocabulary_list":
      return featureAccess.canUseVocabularyList;

    case "study_flashcards":
      return featureAccess.canUseStudyFlashcards;

    case "ability_check":
      return featureAccess.canUseAbilityCheck;

    case "vocab_tools":
      return featureAccess.canUseVocabTools;

    case "story_notes":
      return featureAccess.canUseStoryNotes;

    case "vocabulary_stats":
      return featureAccess.canUseVocabularyStats;

    case "reading_colors":
      return featureAccess.canUseReadingColors;

    default:
      return false;
  }
}

export function getFullAccessFeatureLabel(feature: FullAccessFeature) {
  return FULL_ACCESS_FEATURE_LABELS[feature];
}

export function getFullAccessRequiredCopy(feature: FullAccessFeature) {
  const featureLabel = getFullAccessFeatureLabel(feature);

  return {
    title: "Full access needed",
    message: `${featureLabel} is part of full Mekuru access. Your book tracking, reading reflections, and timer-only reading tools are still available.`,
  };
}