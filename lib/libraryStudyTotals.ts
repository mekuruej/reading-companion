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
  id: string;
  study_identity_key: string;
  reading_gate_status: LibraryStudyGateStatus | null;
  meaning_gate_status: LibraryStudyGateStatus | null;
  held_before_reading_gate: boolean | null;
  held_before_meaning_gate: boolean | null;
  reading_gate_attempts: number | null;
  mastered: boolean | null;
};

type ClaimRow = {
  study_identity_key: string;
  claimed_color: "green" | string | null;
  created_at: string | null;
};

export const LIBRARY_STUDY_COLOR_ORDER: LibraryStudyColor[] = [
  "purple",
  "blue",
  "green",
  "yellow",
  "orange",
  "red",
  "grey",
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

function preReadingSupportCycle(progress: ProgressRow | null | undefined) {
  if (!progress?.held_before_reading_gate) return null;
  return Math.max(2, (progress.reading_gate_attempts ?? 0) + 1);
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

// Use small ordered pages: requesting a large limit does not bypass the API row cap.
async function loadAllRows<T>(queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryPage(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function fetchLibraryStudyColorBreakdown(
  userId: string,
  settings?: LibraryStudyColorSettings | null
) {
  const colorSettings = settings ?? (await loadColorSettings(userId));
  const [summaryRows, progressRows, claimRows] = await Promise.all([
    loadAllRows<SummaryRow>((from, to) => supabase
      .from("user_library_word_summaries")
      .select("study_identity_key, total_encounter_count, last_seen_at")
      .eq("user_id", userId)
      .order("study_identity_key")
      .range(from, to)
      .returns<SummaryRow[]>()),
    loadAllRows<ProgressRow>((from, to) => supabase
      .from("user_library_word_progress")
      .select("id, study_identity_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, reading_gate_attempts, mastered")
      .eq("user_id", userId)
      .eq("definition_key", "")
      .order("study_identity_key")
      .range(from, to)
      .returns<ProgressRow[]>()),
    loadAllRows<ClaimRow>((from, to) => supabase
      .from("user_library_word_claims")
      .select("study_identity_key, claimed_color, created_at")
      .eq("user_id", userId)
      .order("study_identity_key")
      .range(from, to)
      .returns<ClaimRow[]>()),
  ]);

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

  function countWord(key: string, encounterCount: number) {
    if (!key || countedKeys.has(key)) return;
    const progress = progressByKey.get(key);
    const status = computeLibraryStudyColorStatus({
      encounterCount,
      claimedGreen: claimedKeys.has(key),
      settings: colorSettings,
      readingGate: progress?.reading_gate_status ?? "not_started",
      meaningGate: progress?.meaning_gate_status ?? "not_started",
      heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
      heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
      readyForReadingGate: Boolean(progress?.id &&
        progress.reading_gate_status === "not_started" &&
        progress.meaning_gate_status === "not_started" &&
        !progress.held_before_reading_gate && !progress.held_before_meaning_gate &&
        !progress.mastered),
      preReadingSupportCycle: preReadingSupportCycle(progress),
      mastered: progress?.mastered ?? false,
    });
    totals[status.color] += 1;
    if (status.color === "grey" && status.greyReason) limboTotals[status.greyReason] += 1;
    countedKeys.add(key);
  }

  for (const row of summaryRows) countWord(row.study_identity_key, row.total_encounter_count ?? 0);
  for (const key of claimedKeys) countWord(key, 0);

  return { colorTotals: totals, limboTotals };
}

export async function fetchLibraryStudyColorTotals(
  userId: string,
  settings?: LibraryStudyColorSettings | null
) {
  const { colorTotals } = await fetchLibraryStudyColorBreakdown(userId, settings);
  return colorTotals;
}
