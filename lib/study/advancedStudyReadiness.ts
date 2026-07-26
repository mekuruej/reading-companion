import {
  computeLibraryStudyColorStatus,
  type LibraryStudyColor,
  type LibraryStudyColorSettings,
  type LibraryStudyGateStatus,
} from "@/lib/libraryStudyColor";

export const ABILITY_CHECK_READY_SCORE_TARGET = 100;
export const LIBRARY_REVIEW_READY_SCORE_TARGET = 200;

export type AdvancedStudyReadinessSummaryRow = {
  study_identity_key?: string | null;
  surface?: string | null;
  reading?: string | null;
  meaning?: string | null;
  total_encounter_count?: number | null;
  hidden_encounter_count?: number | null;
};

export type AdvancedStudyReadinessProgressRow = {
  study_identity_key?: string | null;
  reading_gate_status?: LibraryStudyGateStatus | null;
  meaning_gate_status?: LibraryStudyGateStatus | null;
  held_before_reading_gate?: boolean | null;
  held_before_meaning_gate?: boolean | null;
  reading_gate_attempts?: number | null;
  mastered?: boolean | null;
};

export type AdvancedStudyReadinessColorCounts = Record<LibraryStudyColor, number>;

export type AdvancedStudyReadinessResult = {
  readyScore: number;
  abilityCheckTarget: typeof ABILITY_CHECK_READY_SCORE_TARGET;
  libraryReviewTarget: typeof LIBRARY_REVIEW_READY_SCORE_TARGET;
  colorCounts: AdvancedStudyReadinessColorCounts;
  abilityCheckReady: boolean;
  libraryReviewReady: boolean;
  eligibleWordCount: number;
};

const COLOR_SCORE_WEIGHTS: Record<LibraryStudyColor, number> = {
  none: 0,
  red: 0,
  orange: 0,
  yellow: 0.5,
  grey: 0,
  green: 1,
  blue: 1,
  purple: 1,
};

function emptyColorCounts(): AdvancedStudyReadinessColorCounts {
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

function hasUsableText(value: string | null | undefined) {
  return typeof value !== "string" || value.trim().length > 0;
}

function visibleEncounterCount(row: AdvancedStudyReadinessSummaryRow) {
  const total = Math.max(0, Math.floor(row.total_encounter_count ?? 0));
  const hidden = Math.max(0, Math.floor(row.hidden_encounter_count ?? 0));
  return Math.max(0, total - hidden);
}

function progressIsReadyForReadingGate(
  progress: AdvancedStudyReadinessProgressRow | null | undefined
) {
  return Boolean(
    progress?.study_identity_key &&
      progress.reading_gate_status === "not_started" &&
      progress.meaning_gate_status === "not_started" &&
      !progress.held_before_reading_gate &&
      !progress.held_before_meaning_gate &&
      !progress.mastered
  );
}

function preReadingSupportCycle(
  progress: AdvancedStudyReadinessProgressRow | null | undefined
) {
  if (!progress?.held_before_reading_gate) return null;
  return Math.max(2, (progress.reading_gate_attempts ?? 0) + 1);
}

function eligibleSummaryRow(row: AdvancedStudyReadinessSummaryRow) {
  if (!row.study_identity_key?.trim()) return false;
  if (!hasUsableText(row.surface)) return false;
  if (!hasUsableText(row.reading)) return false;
  if (!hasUsableText(row.meaning)) return false;
  return visibleEncounterCount(row) > 0;
}

export function calculateAdvancedStudyReadiness({
  summaries,
  progressRows = [],
  settings,
}: {
  summaries: AdvancedStudyReadinessSummaryRow[];
  progressRows?: AdvancedStudyReadinessProgressRow[];
  settings?: LibraryStudyColorSettings | null;
}): AdvancedStudyReadinessResult {
  const progressByKey = new Map<string, AdvancedStudyReadinessProgressRow>();

  for (const progress of progressRows) {
    const key = progress.study_identity_key?.trim();
    if (!key) continue;
    progressByKey.set(key, progress);
  }

  const colorCounts = emptyColorCounts();
  let eligibleWordCount = 0;
  let readyScore = 0;

  for (const summary of summaries) {
    if (!eligibleSummaryRow(summary)) continue;

    const key = summary.study_identity_key!.trim();
    const progress = progressByKey.get(key) ?? null;
    const colorStatus = computeLibraryStudyColorStatus({
      encounterCount: visibleEncounterCount(summary),
      settings,
      readingGate: progress?.reading_gate_status ?? "not_started",
      meaningGate: progress?.meaning_gate_status ?? "not_started",
      heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
      heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
      readyForReadingGate: progressIsReadyForReadingGate(progress),
      preReadingSupportCycle: preReadingSupportCycle(progress),
      mastered: progress?.mastered ?? false,
    });

    eligibleWordCount += 1;
    colorCounts[colorStatus.color] += 1;
    readyScore += COLOR_SCORE_WEIGHTS[colorStatus.color];
  }

  return {
    readyScore,
    abilityCheckTarget: ABILITY_CHECK_READY_SCORE_TARGET,
    libraryReviewTarget: LIBRARY_REVIEW_READY_SCORE_TARGET,
    colorCounts,
    abilityCheckReady: readyScore >= ABILITY_CHECK_READY_SCORE_TARGET,
    libraryReviewReady: readyScore >= LIBRARY_REVIEW_READY_SCORE_TARGET,
    eligibleWordCount,
  };
}
