// Library Study Totals
//
// Shared helper for counting current Library Study color states.

import {
  computeLibraryStudyColorStatus,
  type LibraryStudyColor,
  type LibraryStudyColorSettings,
  type LibraryStudyGateStatus,
  type LibraryStudyGreyReason,
} from "@/lib/libraryStudyColor";
import { supabase } from "@/lib/supabaseClient";

export type LibraryStudyColorTotals = Record<LibraryStudyColor, number>;
export type LibraryStudyLimboReason = Exclude<LibraryStudyGreyReason, null>;
export type LibraryStudyLimboTotals = Record<LibraryStudyLimboReason, number>;

type SummaryRow = {
  study_identity_key: string;
  total_encounter_count: number | null;
  last_seen_at: string | null;
};

type ProgressRow = {
  study_identity_key: string;
  reading_gate_status: LibraryStudyGateStatus | null;
  meaning_gate_status: LibraryStudyGateStatus | null;
  held_before_reading_gate: boolean | null;
  held_before_meaning_gate: boolean | null;
  mastered: boolean | null;
};

type ClaimRow = {
  study_identity_key: string;
  claimed_color: "green" | string | null;
  created_at: string | null;
};

export const LIBRARY_STUDY_COLOR_ORDER: LibraryStudyColor[] = [
  "red",
  "orange",
  "yellow",
  "grey",
  "green",
  "blue",
  "purple",
];

export function emptyLibraryStudyColorTotals(): LibraryStudyColorTotals {
  return {
    none: 0,
    red: 0,
    orange: 0,
    yellow: 0,
    grey: 0,
    green: 0,
    blue: 0,
    purple: 0,
  };
}

export function emptyLibraryStudyLimboTotals(): LibraryStudyLimboTotals {
  return {
    pre_reading_support: 0,
    reading_gate_support: 0,
    meaning_gate_support: 0,
  };
}

function shouldClaimUpgradeColor(color: LibraryStudyColor) {
  return color === "none" || color === "red" || color === "orange" || color === "yellow" || color === "grey";
}

async function loadColorSettings(userId: string): Promise<LibraryStudyColorSettings> {
  const { data, error } = await supabase
    .from("user_learning_settings")
    .select("red_stages, orange_stages, yellow_stages")
    .eq("user_id", userId)
    .maybeSingle<LibraryStudyColorSettings>();

  if (error) throw error;

  return data ?? {
    red_stages: 1,
    orange_stages: 1,
    yellow_stages: 1,
  };
}

export async function fetchLibraryStudyColorBreakdown(
  userId: string,
  settings?: LibraryStudyColorSettings | null,
  options?: { since?: Date | null; before?: Date | null }
) {
  const colorSettings = settings ?? (await loadColorSettings(userId));
  const sinceIso = options?.since ? options.since.toISOString() : null;
  const beforeIso = options?.before ? options.before.toISOString() : null;
  let summaryQuery = supabase
    .from("user_library_word_summaries")
    .select("study_identity_key, total_encounter_count, last_seen_at")
    .eq("user_id", userId)
    .limit(20000);

  if (sinceIso) {
    summaryQuery = summaryQuery.gte("last_seen_at", sinceIso);
  }

  if (beforeIso) {
    summaryQuery = summaryQuery.lt("last_seen_at", beforeIso);
  }

  let claimQuery = supabase
    .from("user_library_word_claims")
    .select("study_identity_key, claimed_color, created_at")
    .eq("user_id", userId)
    .limit(20000);

  if (sinceIso) {
    claimQuery = claimQuery.gte("created_at", sinceIso);
  }

  if (beforeIso) {
    claimQuery = claimQuery.lt("created_at", beforeIso);
  }

  const [{ data: summaryRows, error: summaryErr }, { data: progressRows, error: progressErr }, { data: claimRows, error: claimErr }] =
    await Promise.all([
      summaryQuery.returns<SummaryRow[]>(),
      supabase
        .from("user_library_word_progress")
        .select(
          "study_identity_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, mastered"
        )
        .eq("user_id", userId)
        .limit(20000)
        .returns<ProgressRow[]>(),
      claimQuery.returns<ClaimRow[]>(),
    ]);

  if (summaryErr) throw summaryErr;
  if (progressErr) throw progressErr;
  if (claimErr) throw claimErr;

  const progressByKey = new Map<string, ProgressRow>();
  for (const row of progressRows ?? []) {
    if (row.study_identity_key) progressByKey.set(row.study_identity_key, row);
  }

  const claimedKeys = new Set(
    (claimRows ?? [])
      .filter((row) => row.claimed_color === "green")
      .map((row) => row.study_identity_key)
      .filter(Boolean)
  );

  const totals = emptyLibraryStudyColorTotals();
  const limboTotals = emptyLibraryStudyLimboTotals();
  const countedKeys = new Set<string>();

  for (const row of summaryRows ?? []) {
    const key = row.study_identity_key;
    if (!key) continue;

    const progress = progressByKey.get(key);
    const status = computeLibraryStudyColorStatus({
      encounterCount: row.total_encounter_count ?? 0,
      settings: colorSettings,
      readingGate: progress?.reading_gate_status ?? "not_started",
      meaningGate: progress?.meaning_gate_status ?? "not_started",
      heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
      heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
      mastered: progress?.mastered ?? false,
    });

    const color =
      claimedKeys.has(key) && shouldClaimUpgradeColor(status.color) ? "green" : status.color;

    totals[color] += 1;
    if (color === "grey" && status.greyReason) {
      limboTotals[status.greyReason] += 1;
    }
    countedKeys.add(key);
  }

  for (const key of claimedKeys) {
    if (countedKeys.has(key)) continue;
    totals.green += 1;
  }

  return { colorTotals: totals, limboTotals };
}

export async function fetchLibraryStudyColorTotals(
  userId: string,
  settings?: LibraryStudyColorSettings | null,
  options?: { since?: Date | null; before?: Date | null }
) {
  const { colorTotals } = await fetchLibraryStudyColorBreakdown(userId, settings, options);
  return colorTotals;
}
