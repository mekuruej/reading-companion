import { normalizeKanaReading } from "@/lib/kanaInput";
import { savedSenseNumber, senseDefinitionKey, senseStudyKey } from "@/lib/studySenseIdentity";
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
  senseNumber?: number;
};

type LibrarySummaryRow = {
  senseNumber?: number;
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  total_encounter_count: number | null;
};

type LibraryProgressRow = {
  definition_key: string;
  study_identity_key: string;
  reading_gate_status: LibraryStudyGateStatus | null;
  meaning_gate_status: LibraryStudyGateStatus | null;
  held_before_reading_gate: boolean | null;
  held_before_meaning_gate: boolean | null;
  reading_gate_attempts: number | null;
  mastered: boolean | null;
};

export type LibraryStudyWordColorInfo = {
  colorStatus: LibraryStudyColorStatus;
  stageLabel: string | null;
  studyIdentityKey: string;
  encounterCount: number;
};

type FetchLibraryStudyColorInfoOptions = {
  includeMissingAsFirstEncounter?: boolean;
  encounterCountOffsetByKey?: Record<string, number>;
};

export function makeLibraryStudyColorKey(
  surface?: string | null,
  reading?: string | null,
  senseNumber?: number
) {
  const wordKey = `${(surface ?? "").trim()}|||${(reading ?? "").trim()}`;
  return senseNumber == null ? wordKey : senseStudyKey(wordKey, senseDefinitionKey(senseNumber));
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
  const seen = new Map<string, { surface: string; reading: string; senseNumber?: number }>();

  for (const word of words) {
    const surface = (word.surface ?? "").trim();
    const reading = (word.reading ?? "").trim();

    if (!surface || !reading) continue;

    const key = makeLibraryStudyColorKey(surface, reading, word.senseNumber);
    seen.set(key, { surface, reading, senseNumber: word.senseNumber });
  }

  return Array.from(seen.values());
}

function preReadingSupportCycle(progress: LibraryProgressRow | null | undefined) {
  if (!progress?.held_before_reading_gate) return null;
  return Math.max(2, (progress.reading_gate_attempts ?? 0) + 1);
}

export async function fetchLibraryStudyColorInfoByWord(
  supabaseClient: any,
  userId: string,
  words: WordForColorLookup[],
  options?: FetchLibraryStudyColorInfoOptions
): Promise<Record<string, LibraryStudyWordColorInfo>> {
  const lookupPairs = uniqueLookupPairs(words);

  if (lookupPairs.length === 0) {
    return {};
  }

  const pairKeys = new Set(
    lookupPairs.map((word) => makeLibraryStudyColorKey(word.surface, word.reading, word.senseNumber))
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

  let summaries = ((summaryData ?? []) as LibrarySummaryRow[]).filter((row) =>
    pairKeys.has(makeLibraryStudyColorKey(row.surface, row.reading))
  );

  // Sense-aware callers use saved encounters, not the word-level aggregate.
  const sensePairs = lookupPairs.filter((pair) => pair.senseNumber != null);
  if (sensePairs.length > 0) {
    const senseSummaries = new Map<string, LibrarySummaryRow>();
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await supabaseClient
        .from("user_book_words")
        .select("id, surface, reading, meaning_choice_index, user_books!inner(user_id)")
        .eq("user_books.user_id", userId)
        .in("surface", surfaces)
        .not("hidden", "is", true)
        .or("target_language_code.is.null,target_language_code.eq.ja")
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      for (const row of rows ?? []) {
        const senseNumber = savedSenseNumber(row.meaning_choice_index);
        const key = makeLibraryStudyColorKey(row.surface, row.reading, senseNumber);
        if (!pairKeys.has(key)) continue;
        const previous = senseSummaries.get(key);
        senseSummaries.set(key, {
          surface: row.surface, reading: row.reading, senseNumber,
          study_identity_key: `${(row.surface ?? "").trim().replace(/\s+/g, " ").toLowerCase()}||${normalizeKanaReading(row.reading ?? "")}`,
          total_encounter_count: (previous?.total_encounter_count ?? 0) + 1,
        });
      }
      if (!rows || rows.length < 1000) break;
    }
    summaries = [...summaries, ...senseSummaries.values()];
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
        "study_identity_key, definition_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, reading_gate_attempts, mastered"
      )
      .eq("user_id", userId)
      .in("study_identity_key", studyIdentityKeys);

    if (progressError) {
      console.warn("Could not load Library Study color progress:", progressError);
    }

    for (const row of (progressData ?? []) as LibraryProgressRow[]) {
      progressByKey.set(senseStudyKey(row.study_identity_key, row.definition_key), row);
    }
  }

  const result: Record<string, LibraryStudyWordColorInfo> = {};

  const returnedKeys = new Set<string>();

  for (const summary of summaries) {
    const progress = progressByKey.get(senseStudyKey(summary.study_identity_key, senseDefinitionKey(summary.senseNumber))) ?? null;
    const key = makeLibraryStudyColorKey(summary.surface, summary.reading, summary.senseNumber);
    const offset = options?.encounterCountOffsetByKey?.[key] ?? 0;
    const encounterCount = (summary.total_encounter_count ?? 0) + offset;

    const colorStatus = computeLibraryStudyColorStatus({
      encounterCount,
      settings,
      readingGate: progress?.reading_gate_status ?? "not_started",
      meaningGate: progress?.meaning_gate_status ?? "not_started",
      heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
      heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
      preReadingSupportCycle: preReadingSupportCycle(progress),
      mastered: progress?.mastered ?? false,
    });

    returnedKeys.add(key);

    result[key] = {
      colorStatus,
      stageLabel: encounterStageLabel(colorStatus),
      studyIdentityKey: summary.study_identity_key,
      encounterCount,
    };
  }

  if (options?.includeMissingAsFirstEncounter) {
    for (const pair of lookupPairs) {
      const key = makeLibraryStudyColorKey(pair.surface, pair.reading, pair.senseNumber);
      if (returnedKeys.has(key)) continue;

      const encounterCount = Math.max(1, options.encounterCountOffsetByKey?.[key] ?? 1);
      const colorStatus = computeLibraryStudyColorStatus({
        encounterCount,
        settings,
        readingGate: "not_started",
        meaningGate: "not_started",
        heldBeforeReadingGate: false,
        heldBeforeMeaningGate: false,
        mastered: false,
      });

      result[key] = {
        colorStatus,
        stageLabel: encounterStageLabel(colorStatus),
        studyIdentityKey: key,
        encounterCount,
      };
    }
  }

  return result;
}
