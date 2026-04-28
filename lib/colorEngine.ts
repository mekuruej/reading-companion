// lib/colorEngine.ts

// ===== Types =====

// You can swap these with your generated Supabase types later.
// For now, this matches the structure of your tables.

export type LearningProfile = "Beginner" | "Intermediate" | "Advanced" | "Automatic";
export type ColorSystem = "rainbow" | "none";

export type ReadingStage = "unknown" | "known";
export type MeaningStage = "unknown" | "known";

export type WordColor =
  | "none"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "grey";

export interface DictionaryEntry {
  id: string;
  orthography: string;
  reading: string | null;
  meaning: any; // JSONB
  jlpt: string | null; // "N5" | "N4" | ... | null
  is_common: boolean;
  is_katakana: boolean;
  strokes: any; // JSONB
  created_at: string;
}

export interface UserVocabState {
  id: string;
  user_id: string;
  word_id: string;
  lookup_count: number;
  reading_stage: ReadingStage | null; // "unknown" | "known"
  meaning_stage: MeaningStage | null; // "unknown" | "known"
  forgot_reading: boolean;
  forgot_meaning: boolean;
  color_mode_override: "rainbow" | "none" | null;
  first_seen_in_book_id: string | null;
  first_seen_in_chapter: number | null;
  last_lookup: string | null;
  last_reviewed: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  learning_profile: LearningProfile;
  jlpt_level: "N5" | "N4" | "N3" | "N2" | "N1" | "Native" | null;
  color_system: ColorSystem;
  show_katakana_deck: boolean;
  show_kanji_deck: boolean;
  include_green: boolean;
  include_blue: boolean;
  include_grey: boolean;
  include_purple: boolean;
  created_at: string;
  updated_at: string;
}

// ===== Profile thresholds =====

interface ProfileThresholds {
  redMax: number;
  orangeMax: number;
  yellowMax: number;
}

const PROFILE_THRESHOLDS: Record<Exclude<LearningProfile, "Automatic">, ProfileThresholds> = {
  Beginner: {
    // Red = 1–2, Orange = 3–4, Yellow = 5–8
    redMax: 2,
    orangeMax: 4,
    yellowMax: 8,
  },
  Intermediate: {
    // Red = 1, Orange = 2, Yellow = 3–4
    redMax: 1,
    orangeMax: 2,
    yellowMax: 4,
  },
  Advanced: {
    // Red = 1, Orange = 2, Yellow = 3, Green from 4+
    redMax: 1,
    orangeMax: 2,
    yellowMax: 3,
  },
};

// ===== Helpers =====

function resolveEffectiveProfile(settings: UserSettings): Exclude<LearningProfile, "Automatic"> {
  if (settings.learning_profile !== "Automatic") {
    return settings.learning_profile;
  }

  // Automatic profile selection based on JLPT
  switch (settings.jlpt_level) {
    case "N5":
    case "N4":
    case null:
      return "Beginner";
    case "N3":
    case "N2":
      return "Intermediate";
    case "N1":
    case "Native":
      return "Advanced";
    default:
      return "Intermediate";
  }
}

function getThresholds(settings: UserSettings): ProfileThresholds {
  const profile = resolveEffectiveProfile(settings);
  return PROFILE_THRESHOLDS[profile];
}

function normalizeReadingStage(stage: ReadingStage | null | undefined): ReadingStage {
  return stage === "known" ? "known" : "unknown";
}

function normalizeMeaningStage(stage: MeaningStage | null | undefined): MeaningStage {
  return stage === "known" ? "known" : "unknown";
}

// ===== Core color engine =====

export interface ComputeColorArgs {
  state: UserVocabState;
  dict: DictionaryEntry;
  settings: UserSettings;
}

/**
 * Compute the display color for a given word, for a given user.
 *
 * This does NOT modify the database; it is pure.
 * It uses:
 * - lookup_count
 * - reading_stage / meaning_stage
 * - dictionary is_katakana
 * - user profile thresholds
 * - color_system (rainbow / none)
 */
export function computeWordColor({ state, dict, settings }: ComputeColorArgs): WordColor {
  // If user disabled colors entirely
  if (settings.color_system === "none" || state.color_mode_override === "none") {
    return "none";
  }

  const readingStage = normalizeReadingStage(state.reading_stage);
  const meaningStage = normalizeMeaningStage(state.meaning_stage);
  const counts = state.lookup_count ?? 0;
  const thresholds = getThresholds(settings);

  // --- Katakana words: RED → ORANGE → YELLOW → PURPLE (finished) ---
  if (dict.is_katakana) {
    // Even if reading/meaning stages exist, katakana uses its own ladder.
    if (counts <= thresholds.redMax) return "red";
    if (counts <= thresholds.orangeMax) return "orange";
    if (counts <= thresholds.yellowMax) return "yellow";
    return "purple"; // Katakana-finished, infinite
  }

  // --- Normal words ---

  // 1) Mastered: GREY (no lookup threshold)
  if (readingStage === "known" && meaningStage === "known") {
    return "grey";
  }

  // 2) Meaning practice: BLUE (reading known, meaning not known)
  if (readingStage === "known" && meaningStage === "unknown") {
    return "blue"; // infinite blue until meaning known
  }

  // 3) Reading not known: RED / ORANGE / YELLOW / GREEN
  // Green is the infinite stage when lookup_count > yellowMax.
  if (counts <= thresholds.redMax) return "red";
  if (counts <= thresholds.orangeMax) return "orange";
  if (counts <= thresholds.yellowMax) return "yellow";
  return "green"; // infinite green until readingStage becomes "known"
}

// ===== Convenience helpers for filtering decks =====

/**
 * Whether this color should be included in the user's study decks,
 * based on their settings (include_green, include_blue, include_grey, include_purple).
 */
export function isColorIncludedInStudy(color: WordColor, settings: UserSettings): boolean {
  if (color === "none" || settings.color_system === "none") return false;

  switch (color) {
    case "green":
      return settings.include_green;
    case "blue":
      return settings.include_blue;
    case "grey":
      return settings.include_grey;
    case "purple":
      return settings.include_purple;
    default:
      // red / orange / yellow are not meant for direct study filters
      return false;
  }
}
