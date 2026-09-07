import type { JapaneseLearningFreeFeature } from "./featureAccess";

export const JAPANESE_LEARNING_FREE_FEATURES: {
  key: JapaneseLearningFreeFeature;
  label: string;
  description: string;
}[] = [
  {
    key: "reading_reflections",
    label: "Reading Reflections",
    description:
      "View and submit public learner reflections for Japanese books.",
  },
  {
    key: "find_next_book",
    label: "Find Your Next Book",
    description:
      "Use the full reader-fit book discovery experience.",
  },
];

export type JapaneseLearningFreeFeatureFlags = Record<
  JapaneseLearningFreeFeature,
  boolean
>;

export const DEFAULT_JAPANESE_LEARNING_FREE_FEATURE_FLAGS =
  JAPANESE_LEARNING_FREE_FEATURES.reduce(
    (flags, feature) => {
      flags[feature.key] = false;
      return flags;
    },
    {} as JapaneseLearningFreeFeatureFlags
  );

type SupabaseLike = {
  from: (table: string) => any;
};

export function normalizeJapaneseLearningFreeFeatureFlags(
  rows:
    | {
        feature_key?: string | null;
        is_enabled?: boolean | null;
      }[]
    | null
    | undefined
): JapaneseLearningFreeFeatureFlags {
  const flags = { ...DEFAULT_JAPANESE_LEARNING_FREE_FEATURE_FLAGS };
  const knownKeys = new Set(
    JAPANESE_LEARNING_FREE_FEATURES.map((feature) => feature.key)
  );

  for (const row of rows ?? []) {
    const key = row.feature_key;
    if (!key || !knownKeys.has(key as JapaneseLearningFreeFeature)) continue;
    flags[key as JapaneseLearningFreeFeature] = row.is_enabled === true;
  }

  return flags;
}

export async function loadJapaneseLearningFreeFeatureFlags(
  supabase: SupabaseLike
): Promise<JapaneseLearningFreeFeatureFlags> {
  const { data, error } = await supabase
    .from("japanese_learning_free_features")
    .select("feature_key, is_enabled");

  if (error) {
    console.warn("Could not load Japanese Learning free feature flags:", error);
    return { ...DEFAULT_JAPANESE_LEARNING_FREE_FEATURE_FLAGS };
  }

  return normalizeJapaneseLearningFreeFeatureFlags(data);
}
