// Library Study Color Lookup
//
// Fetches Library Study color info for words so pages can display LibraryColorBadge.
// This file handles database lookup, then uses libraryStudyColor.ts as the source of truth.

import {
  computeLibraryStudyColorStatus,
  type LibraryStudyColor,
  type LibraryStudyColorSettings,
  type LibraryStudyColorStatus,
  type LibraryStudyGateStatus,
} from "@/lib/libraryStudyColor";

type WordForColorLookup = {
  surface?: string | null;
  reading?: string | null;
};

type LibrarySummaryRow = {
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  total_encounter_count: number | null;
};

type LibraryProgressRow = {
  study_identity_key: string;
  reading_gate_status: LibraryStudyGateStatus | null;
  meaning_gate_status: LibraryStudyGateStatus | null;
  held_before_reading_gate: boolean | null;
  held_before_meaning_gate: boolean | null;
  mastered: boolean | null;
};

export type LibraryStudyWordColorInfo = {
  colorStatus: LibraryStudyColorStatus;
  stageLabel: string | null;
  studyIdentityKey: string;
  encounterCount: number;
};

export function makeLibraryStudyColorKey(
  surface?: string | null,
  reading?: string | null
) {
  return `${(surface ?? "").trim()}|||${(reading ?? "").trim()}`;
}

function encounterStageLabel(colorStatus: LibraryStudyColorStatus) {
  if (
    colorStatus.color !== "red" &&
    colorStatus.color !== "orange" &&
    colorStatus.color !== "yellow"
  ) {
    return null;
  }

  if ((colorStatus.stageCount ?? 1) <= 1) {
    return null;
  }

  return colorStatus.stageNumber == null ? null : String(colorStatus.stageNumber);
}

function uniqueLookupPairs(words: WordForColorLookup[]) {
  const seen = new Map<string, { surface: string; reading: string }>();

  for (const word of words) {
    const surface = (word.surface ?? "").trim();
    const reading = (word.reading ?? "").trim();

    if (!surface || !reading) continue;

    const key = makeLibraryStudyColorKey(surface, reading);
    seen.set(key, { surface, reading });
  }

  return Array.from(seen.values());
}

export async function fetchLibraryStudyColorInfoByWord(
  supabaseClient: any,
  userId: string,
  words: WordForColorLookup[]
): Promise<Record<string, LibraryStudyWordColorInfo>> {
  const lookupPairs = uniqueLookupPairs(words);

  if (lookupPairs.length === 0) {
    return {};
  }

  const pairKeys = new Set(
    lookupPairs.map((word) => makeLibraryStudyColorKey(word.surface, word.reading))
  );

  const surfaces = Array.from(new Set(lookupPairs.map((word) => word.surface)));

  const { data: settingsData, error: settingsError } = await supabaseClient
    .from("user_learning_settings")
    .select("red_stages, orange_stages, yellow_stages")
    .eq("user_id", userId)
    .maybeSingle();

  if (settingsError) {
    console.warn("Could not load Library Study color settings:", settingsError);
  }

  const settingsRow = settingsData as LibraryStudyColorSettings | null;

  const settings: LibraryStudyColorSettings = {
    red_stages: settingsRow?.red_stages ?? 1,
    orange_stages: settingsRow?.orange_stages ?? 1,
    yellow_stages: settingsRow?.yellow_stages ?? 1,
  };

  const { data: summaryData, error: summaryError } = await supabaseClient
    .from("user_library_word_summaries")
    .select("study_identity_key, surface, reading, total_encounter_count")
    .eq("user_id", userId)
    .in("surface", surfaces);

  if (summaryError) {
    console.warn("Could not load Library Study color summaries:", summaryError);
    return {};
  }

  const summaries = ((summaryData ?? []) as LibrarySummaryRow[]).filter((row) =>
    pairKeys.has(makeLibraryStudyColorKey(row.surface, row.reading))
  );

  if (summaries.length === 0) {
    return {};
  }

  const studyIdentityKeys = Array.from(
    new Set(
      summaries
        .map((row) => row.study_identity_key)
        .filter((key): key is string => Boolean(key))
    )
  );

  const progressByKey = new Map<string, LibraryProgressRow>();

  if (studyIdentityKeys.length > 0) {
    const { data: progressData, error: progressError } = await supabaseClient
      .from("user_library_word_progress")
      .select(
        "study_identity_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, mastered"
      )
      .eq("user_id", userId)
      .in("study_identity_key", studyIdentityKeys);

    if (progressError) {
      console.warn("Could not load Library Study color progress:", progressError);
    }

    for (const row of (progressData ?? []) as LibraryProgressRow[]) {
      progressByKey.set(row.study_identity_key, row);
    }
  }

  const result: Record<string, LibraryStudyWordColorInfo> = {};

  for (const summary of summaries) {
    const progress = progressByKey.get(summary.study_identity_key) ?? null;
    const encounterCount = summary.total_encounter_count ?? 0;

    const colorStatus = computeLibraryStudyColorStatus({
      encounterCount,
      settings,
      readingGate: progress?.reading_gate_status ?? "not_started",
      meaningGate: progress?.meaning_gate_status ?? "not_started",
      heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
      heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
      mastered: progress?.mastered ?? false,
    });

    const key = makeLibraryStudyColorKey(summary.surface, summary.reading);

    result[key] = {
      colorStatus,
      stageLabel: encounterStageLabel(colorStatus),
      studyIdentityKey: summary.study_identity_key,
      encounterCount,
    };
  }

  return result;
}