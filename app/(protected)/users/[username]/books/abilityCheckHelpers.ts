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
  id?: string;
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

export type AbilityCheckClaimRow = {
  id: string;
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  claimed_color: "green" | string | null;
  created_at: string | null;
  updated_at: string | null;
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
      progress.id &&
      progress.reading_gate_status === "not_started" &&
      progress.meaning_gate_status === "not_started" &&
      !progress.held_before_reading_gate &&
      !progress.held_before_meaning_gate &&
      !progress.mastered
  );
}

function progressWithAbilityCheckClaim(
  key: string,
  surface: string,
  reading: string,
  progress: AbilityCheckProgressRow | null,
  claim: AbilityCheckClaimRow | null | undefined
): AbilityCheckProgressRow | null {
  if (!claim || claim.claimed_color !== "green") return progress;

  const hasExistingGateHistory =
    progress &&
    (progress.reading_gate_status !== "not_started" ||
      progress.meaning_gate_status !== "not_started" ||
      progress.held_before_reading_gate ||
      progress.held_before_meaning_gate ||
      progress.mastered);

  if (hasExistingGateHistory) return progress;

  return {
    id: progress?.id,
    study_identity_key: key,
    reading_gate_status: "not_started",
    meaning_gate_status: "not_started",
    held_before_reading_gate: false,
    held_before_meaning_gate: false,
    mastered: false,
    mastered_at: progress?.mastered_at ?? null,
    reading_gate_failed_at: progress?.reading_gate_failed_at ?? null,
    meaning_gate_failed_at: progress?.meaning_gate_failed_at ?? null,
    last_studied_at: progress?.last_studied_at ?? null,
  };
}

export function isAbilityCheckCardInDailyPool(
  summary: AbilityCheckSummaryRow,
  progress: AbilityCheckProgressRow | null,
  settings: Required<AbilityCheckReminderSettings>,
  seenTodayIds: Set<string>,
  now = new Date(),
  claim?: AbilityCheckClaimRow | null
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

  const effectiveProgress = progressWithAbilityCheckClaim(
    summary.study_identity_key,
    surface,
    reading,
    progress,
    claim
  );

  const colorStatus = computeLibraryStudyColorStatus({
    encounterCount: summary.total_encounter_count ?? 0,
    settings,
    readingGate: effectiveProgress?.reading_gate_status ?? "not_started",
    meaningGate: effectiveProgress?.meaning_gate_status ?? "not_started",
    heldBeforeReadingGate: effectiveProgress?.held_before_reading_gate ?? false,
    heldBeforeMeaningGate: effectiveProgress?.held_before_meaning_gate ?? false,
    readyForReadingGate: isReadyForReadingGateProgress(effectiveProgress),
    mastered: effectiveProgress?.mastered ?? false,
  });

  const included =
    colorStatus.eligibleForLibraryStudy ||
    colorStatus.nextGate === "reading" ||
    colorStatus.nextGate === "meaning";

  if (!included) return false;

  if (
    colorStatus.color === "yellow" &&
    colorStatus.eligibleForLibraryStudy &&
    !isYellowReadinessCooldownDue(summary, effectiveProgress, now)
  ) {
    return false;
  }

  if (
    colorStatus.color === "red" &&
    effectiveProgress?.held_before_reading_gate &&
    effectiveProgress?.held_before_meaning_gate
  ) {
    return (
      daysSinceIso(effectiveProgress.last_studied_at, now) >=
      PRE_READING_WAIT_RECHECK_DAYS
    );
  }

  if (colorStatus.color === "grey") {
    if (colorStatus.greyReason === "pre_reading_support") {
      const waitDays = effectiveProgress?.held_before_meaning_gate
        ? PRE_READING_WAIT_RECHECK_DAYS
        : PRE_READING_SOFT_WAIT_RECHECK_DAYS;

      return daysSinceIso(effectiveProgress?.last_studied_at, now) >= waitDays;
    }

    const recheckDays =
      MISSED_GATE_RECHECK_MIN_DAYS +
      (hashString(`${summary.study_identity_key}::missed-gate`) %
        MISSED_GATE_RECHECK_WINDOW_DAYS);

    if (colorStatus.greyReason === "reading_gate_support") {
      return daysSinceIso(effectiveProgress?.reading_gate_failed_at, now) >= recheckDays;
    }

    if (colorStatus.greyReason === "meaning_gate_support") {
      return daysSinceIso(effectiveProgress?.meaning_gate_failed_at, now) >= recheckDays;
    }

    return true;
  }

  if (!effectiveProgress?.last_studied_at) {
    return isInitialGateSlotDue(summary.study_identity_key, now);
  }

  return (
    daysSinceIso(effectiveProgress.last_studied_at, now) >=
    regularGateRecheckDays(summary.study_identity_key)
  );
}

export function isAbilityCheckClaimInDailyPool(
  claim: AbilityCheckClaimRow,
  progress: AbilityCheckProgressRow | null,
  settings: Required<AbilityCheckReminderSettings>,
  seenTodayIds: Set<string>,
  now = new Date()
) {
  const key = claim.study_identity_key;
  const surface = (claim.surface ?? "").trim();
  const reading = (claim.reading ?? "").trim();
  const meaning = (claim.meaning ?? "").trim();

  if (!key || !surface || !reading || !meaning || claim.claimed_color !== "green") {
    return false;
  }

  if (seenTodayIds.has(`claim:${key}`) || seenTodayIds.has(key)) {
    return false;
  }

  if (settings.skip_katakana_library_check && isKatakanaOnly(surface)) {
    return false;
  }

  const effectiveProgress = progressWithAbilityCheckClaim(
    key,
    surface,
    reading,
    progress,
    claim
  );

  const colorStatus = computeLibraryStudyColorStatus({
    encounterCount: 0,
    settings,
    readingGate: effectiveProgress?.reading_gate_status ?? "not_started",
    meaningGate: effectiveProgress?.meaning_gate_status ?? "not_started",
    heldBeforeReadingGate: effectiveProgress?.held_before_reading_gate ?? false,
    heldBeforeMeaningGate: effectiveProgress?.held_before_meaning_gate ?? false,
    readyForReadingGate: isReadyForReadingGateProgress(effectiveProgress),
    mastered: effectiveProgress?.mastered ?? false,
  });

  const included =
    colorStatus.eligibleForLibraryStudy ||
    colorStatus.nextGate === "reading" ||
    colorStatus.nextGate === "meaning";

  if (!included) return false;

  if (colorStatus.color === "grey") {
    const recheckDays =
      MISSED_GATE_RECHECK_MIN_DAYS +
      (hashString(`${key}::missed-gate`) % MISSED_GATE_RECHECK_WINDOW_DAYS);

    if (colorStatus.greyReason === "reading_gate_support") {
      return daysSinceIso(effectiveProgress?.reading_gate_failed_at, now) >= recheckDays;
    }

    if (colorStatus.greyReason === "meaning_gate_support") {
      return daysSinceIso(effectiveProgress?.meaning_gate_failed_at, now) >= recheckDays;
    }
  }

  if (!effectiveProgress?.last_studied_at) return isInitialGateSlotDue(key, now);

  return (
    daysSinceIso(effectiveProgress.last_studied_at, now) >=
    regularGateRecheckDays(key)
  );
}
