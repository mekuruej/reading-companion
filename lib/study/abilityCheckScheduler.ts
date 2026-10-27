// The existing Ability Check availability algorithm, moved unchanged.
import { hasAbilityCheckRestDays } from '@/lib/abilityCheckSpacing';
import { cardSenseKey } from '@/lib/studySenseIdentity';
import type {LibraryStudyColorStatus} from '@/lib/libraryStudyColor';
import type {StudyCard} from './abilityCheckCards';
const REGULAR_GATE_RECHECK_MIN_DAYS = 3;
const REGULAR_GATE_RECHECK_WINDOW_DAYS = 5;
const MISSED_GATE_RECHECK_MIN_DAYS = 7;
const MISSED_GATE_RECHECK_WINDOW_DAYS = 8;
const PRE_READING_SOFT_WAIT_RECHECK_DAYS = 30;
const PRE_READING_WAIT_RECHECK_DAYS = 90;
const YELLOW_READINESS_COOLDOWN_DAYS = 1;
function isCardSeenToday(card: StudyCard, seenTodayIds: Set<string>) {
  return seenTodayIds.has(card.id) || seenTodayIds.has(cardSenseKey(card));
}
export function normalizeJlpt(value: string | null | undefined) {
  return (value ?? "NON-JLPT").toUpperCase() || "NON-JLPT";
}

export function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function includeLibraryCheckCard(status: LibraryStudyColorStatus) {
  return status.eligibleForLibraryStudy || status.nextGate === "reading" || status.nextGate === "meaning";
}

export function daysSinceIso(value: string | null | undefined, now = new Date()) {
  if (!value) return Number.POSITIVE_INFINITY;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;

  return (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
}

export function missedGateRecheckDays(card: StudyCard) {
  return (
    MISSED_GATE_RECHECK_MIN_DAYS +
    (hashString(`${cardSenseKey(card)}::missed-gate`) % MISSED_GATE_RECHECK_WINDOW_DAYS)
  );
}

export function regularGateRecheckDays(card: StudyCard) {
  return (
    REGULAR_GATE_RECHECK_MIN_DAYS +
    (hashString(`${cardSenseKey(card)}::regular-gate`) % REGULAR_GATE_RECHECK_WINDOW_DAYS)
  );
}

export function isInitialGateSlotDue(card: StudyCard, now = new Date()) {
  return true;
}

export function isInitialYellowReadinessSlotDue(card: StudyCard, now = new Date()) {
  return true;
}

export function isMissedGateLimboDue(card: StudyCard, now = new Date()) {
  if (card.colorStatus.color !== "grey") return true;

  if (card.colorStatus.greyReason === "pre_reading_support") {
    const recheckDays = card.progress?.held_before_meaning_gate
      ? PRE_READING_WAIT_RECHECK_DAYS
      : PRE_READING_SOFT_WAIT_RECHECK_DAYS;

    return daysSinceIso(card.progress?.last_studied_at, now) >= recheckDays;
  }

  const recheckDays = missedGateRecheckDays(card);

  if (card.colorStatus.greyReason === "reading_gate_support") {
    return daysSinceIso(card.progress?.reading_gate_failed_at, now) >= recheckDays;
  }

  if (card.colorStatus.greyReason === "meaning_gate_support") {
    return daysSinceIso(card.progress?.meaning_gate_failed_at, now) >= recheckDays;
  }

  return true;
}

export function isBackToRedSupportCard(card: StudyCard) {
  return (
    card.colorStatus.color === "red" &&
    card.progress?.held_before_reading_gate === true &&
    card.progress?.held_before_meaning_gate === true
  );
}

export function isYellowReadinessCard(card: StudyCard) {
  return card.activeGate === "readiness" && card.colorStatus.color === "yellow";
}

export function isYellowReadinessCooldownDue(card: StudyCard, now = new Date()) {
  const anchorDate = card.lastEncounteredAt ?? card.progress?.last_studied_at;

  if (!anchorDate) {
    return isInitialYellowReadinessSlotDue(card, now);
  }

  return daysSinceIso(anchorDate, now) >= YELLOW_READINESS_COOLDOWN_DAYS;
}

export function isRegularGateRecheckDue(card: StudyCard, now = new Date()) {
  if (isYellowReadinessCard(card)) {
    return isYellowReadinessCooldownDue(card, now);
  }

  if (isBackToRedSupportCard(card)) {
    return daysSinceIso(card.progress?.last_studied_at, now) >= PRE_READING_WAIT_RECHECK_DAYS;
  }

  if (card.colorStatus.color === "purple" || card.colorStatus.color === "grey") return true;
  if (!card.progress?.last_studied_at) return isInitialGateSlotDue(card, now);

  return daysSinceIso(card.progress.last_studied_at, now) >= regularGateRecheckDays(card);
}

export function isCardAvailableForLibraryCheck(
  card: StudyCard,
  selectedJlpt: string,
  seenTodayIds: Set<string>,
  options: { ignoreTiming?: boolean } = {}
) {
  const jlptMatch = selectedJlpt === "all" || normalizeJlpt(card.jlpt) === selectedJlpt;

  if (!jlptMatch) return false;
  if (!includeLibraryCheckCard(card.colorStatus)) return false;
  if (isYellowReadinessCard(card) && !isYellowReadinessCooldownDue(card)) {
    return false;
  }

  if (!hasAbilityCheckRestDays(card.progress?.last_studied_at)) return false;

  // Used by "Check Again Today" so the button really means:
  // "give me cards outside their usual schedule, after the minimum rest period."
  if (options.ignoreTiming) return true;

  const notSeenToday = !isCardSeenToday(card, seenTodayIds);

  return (
    notSeenToday &&
    isMissedGateLimboDue(card) &&
    isRegularGateRecheckDue(card)
  );
}
