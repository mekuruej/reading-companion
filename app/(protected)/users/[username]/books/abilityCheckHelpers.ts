import { computeLibraryStudyColorStatus } from "@/lib/libraryStudyColor";
import { ymdInTimeZone } from "./helpers";

export type AbilityCheckReminderSettings = {
  red_stages?: number | null;
  orange_stages?: number | null;
  yellow_stages?: number | null;
  skip_katakana_library_check?: boolean | null;
  show_ability_check_reminder?: boolean | null;
};

export type AbilityCheckSummaryRow = {
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  total_encounter_count: number | null;
  check_ready_encounter_count: number | null;
  last_seen_at: string | null;
  sample_user_book_word_id: string | null;
};

export type AbilityCheckProgressRow = {
  study_identity_key: string;
  reading_gate_status: "not_started" | "passed" | "failed" | null;
  meaning_gate_status: "not_started" | "passed" | "failed" | null;
  held_before_reading_gate: boolean | null;
  held_before_meaning_gate: boolean | null;
  mastered: boolean | null;
  mastered_at: string | null;
  reading_gate_failed_at: string | null;
  meaning_gate_failed_at: string | null;
  last_studied_at: string | null;
};

const REGULAR_GATE_RECHECK_MIN_DAYS = 3;
const REGULAR_GATE_RECHECK_WINDOW_DAYS = 5;
const MISSED_GATE_RECHECK_MIN_DAYS = 7;
const MISSED_GATE_RECHECK_WINDOW_DAYS = 8;
const PRE_READING_SOFT_WAIT_RECHECK_DAYS = 30;
const PRE_READING_WAIT_RECHECK_DAYS = 90;
const YELLOW_READINESS_COOLDOWN_DAYS = 30;

function isKatakanaOnly(value: string | null | undefined) {
  const text = (value ?? "").trim();
  return text.length > 0 && /^[ァ-ヶー・･]+$/.test(text);
}

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hash);
}

function daysSinceIso(value: string | null | undefined, now = new Date()) {
  if (!value) return Number.POSITIVE_INFINITY;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;

  return (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
}

function appDayNumber(now = new Date()) {
  const today =
    ymdInTimeZone(now, "Asia/Tokyo") ??
    new Date().toISOString().slice(0, 10);

  const [year, month, day] = today.split("-").map(Number);

  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function regularGateRecheckDays(studyIdentityKey: string) {
  return (
    REGULAR_GATE_RECHECK_MIN_DAYS +
    (hashString(`${studyIdentityKey}::regular-gate`) %
      REGULAR_GATE_RECHECK_WINDOW_DAYS)
  );
}

function isInitialGateSlotDue(
  studyIdentityKey: string,
  now = new Date()
) {
  const recheckDays = regularGateRecheckDays(studyIdentityKey);
  const releaseOffset =
    hashString(`${studyIdentityKey}::initial-gate-slot`) % recheckDays;

  return appDayNumber(now) % recheckDays === releaseOffset;
}

function isInitialYellowReadinessSlotDue(
  studyIdentityKey: string,
  now = new Date()
) {
  const releaseOffset =
    hashString(`${studyIdentityKey}::initial-yellow-readiness-slot`) %
    YELLOW_READINESS_COOLDOWN_DAYS;

  return appDayNumber(now) % YELLOW_READINESS_COOLDOWN_DAYS === releaseOffset;
}

function isYellowReadinessCooldownDue(
  summary: AbilityCheckSummaryRow,
  progress: AbilityCheckProgressRow | null,
  now = new Date()
) {
  const anchorDate = summary.last_seen_at ?? progress?.last_studied_at;

  if (!anchorDate) {
    return isInitialYellowReadinessSlotDue(summary.study_identity_key, now);
  }

  return daysSinceIso(anchorDate, now) >= YELLOW_READINESS_COOLDOWN_DAYS;
}

function isReadyForReadingGateProgress(
  progress: AbilityCheckProgressRow | null | undefined
) {
  return Boolean(
    progress &&
      progress.reading_gate_status === "not_started" &&
      progress.meaning_gate_status === "not_started" &&
      !progress.held_before_reading_gate &&
      !progress.held_before_meaning_gate &&
      !progress.mastered
  );
}

export function isAbilityCheckCardInDailyPool(
  summary: AbilityCheckSummaryRow,
  progress: AbilityCheckProgressRow | null,
  settings: Required<AbilityCheckReminderSettings>,
  seenTodayIds: Set<string>,
  now = new Date()
) {
  const surface = (summary.surface ?? "").trim();
  const reading = (summary.reading ?? "").trim();
  const meaning = (summary.meaning ?? "").trim();
  const sampleId = summary.sample_user_book_word_id ?? "";

  if (!surface || !reading || !meaning || !sampleId) return false;

  if (
    seenTodayIds.has(sampleId) ||
    seenTodayIds.has(summary.study_identity_key)
  ) {
    return false;
  }

  if (settings.skip_katakana_library_check && isKatakanaOnly(surface)) {
    return false;
  }

  const colorStatus = computeLibraryStudyColorStatus({
    encounterCount: summary.total_encounter_count ?? 0,
    settings,
    readingGate: progress?.reading_gate_status ?? "not_started",
    meaningGate: progress?.meaning_gate_status ?? "not_started",
    heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
    heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
    readyForReadingGate: isReadyForReadingGateProgress(progress),
    mastered: progress?.mastered ?? false,
  });

  const included =
    colorStatus.eligibleForLibraryStudy ||
    colorStatus.nextGate === "reading" ||
    colorStatus.nextGate === "meaning";

  if (!included) return false;

  if (
    colorStatus.color === "yellow" &&
    colorStatus.eligibleForLibraryStudy &&
    !isYellowReadinessCooldownDue(summary, progress, now)
  ) {
    return false;
  }

  if (
    colorStatus.color === "red" &&
    progress?.held_before_reading_gate &&
    progress?.held_before_meaning_gate
  ) {
    return (
      daysSinceIso(progress.last_studied_at, now) >=
      PRE_READING_WAIT_RECHECK_DAYS
    );
  }

  if (colorStatus.color === "grey") {
    if (colorStatus.greyReason === "pre_reading_support") {
      const waitDays = progress?.held_before_meaning_gate
        ? PRE_READING_WAIT_RECHECK_DAYS
        : PRE_READING_SOFT_WAIT_RECHECK_DAYS;

      return daysSinceIso(progress?.last_studied_at, now) >= waitDays;
    }

    const recheckDays =
      MISSED_GATE_RECHECK_MIN_DAYS +
      (hashString(`${summary.study_identity_key}::missed-gate`) %
        MISSED_GATE_RECHECK_WINDOW_DAYS);

    if (colorStatus.greyReason === "reading_gate_support") {
      return daysSinceIso(progress?.reading_gate_failed_at, now) >= recheckDays;
    }

    if (colorStatus.greyReason === "meaning_gate_support") {
      return daysSinceIso(progress?.meaning_gate_failed_at, now) >= recheckDays;
    }

    return true;
  }

  if (!progress?.last_studied_at) {
    return isInitialGateSlotDue(summary.study_identity_key, now);
  }

  return (
    daysSinceIso(progress.last_studied_at, now) >=
    regularGateRecheckDays(summary.study_identity_key)
  );
}
