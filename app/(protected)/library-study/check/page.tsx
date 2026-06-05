// Library Study
// 

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  computeLibraryStudyColorStatus,
  getLibraryStudyEncounterStageCounts,
  type LibraryStudyGateStatus,
  type LibraryStudyColorStatus,
} from "@/lib/libraryStudyColor";
import { normalizeKanaReading } from "@/lib/kanaInput";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
  canUseFullAccessFeature,
  getFullAccessRequiredCopy,
} from "@/lib/access/requireFullAccess";
import { supabase } from "@/lib/supabaseClient";
import { recordStudyEvent } from "@/lib/studyEvents";
import { todayYmdAppTimeZone, ymdInTimeZone } from "@/lib/timeZone";
import AbilityCheckLoadingState from "../components/AbilityCheckLoadingState";
import AbilityCheckNeedsSignInState from "../components/AbilityCheckNeedsSignInState";
import AbilityCheckErrorState from "../components/AbilityCheckErrorState";
import AbilityCheckFullAccessLockedState from "../components/AbilityCheckFullAccessLockedState";
import AbilityCheckNoCardsState from "../components/AbilityCheckNoCardsState";
import AbilityCheckRestingState from "../components/AbilityCheckRestingState";

type UserBookJoinRow = {
  id: string;
  books:
  | {
    title: string | null;
    cover_url: string | null;
  }
  | {
    title: string | null;
    cover_url: string | null;
  }[]
  | null;
};

type UserBookWordRow = {
  id: string;
  user_book_id: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  meaning_choice_index: number | null;
  jlpt: string | null;
  hidden: boolean | null;
  created_at: string;
};

type LearningSettingsRow = {
  red_stages: number | null;
  orange_stages: number | null;
  yellow_stages: number | null;
  show_badge_numbers: boolean | null;
  skip_katakana_library_check?: boolean | null;
};

type LibraryWordProgressRow = {
  id?: string;
  user_id: string;
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  definition_key: string;
  reading_gate_status: LibraryStudyGateStatus;
  meaning_gate_status: LibraryStudyGateStatus;
  held_before_reading_gate: boolean;
  held_before_meaning_gate: boolean;
  mastered: boolean;
  reading_gate_attempts: number;
  meaning_gate_attempts: number;
  reading_gate_passed_at: string | null;
  reading_gate_failed_at: string | null;
  meaning_gate_passed_at: string | null;
  meaning_gate_failed_at: string | null;
  mastered_at: string | null;
  last_studied_at: string | null;
};

type LibraryWordSummaryRow = {
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  total_encounter_count: number | null;
  check_ready_encounter_count: number | null;
  sample_user_book_word_id: string | null;
  sample_user_book_id: string | null;
  sample_book_title: string | null;
  sample_book_cover_url: string | null;
};

type LibraryWordClaimRow = {
  id: string;
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  claimed_color: "green" | string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LibraryCheckGate = "readiness" | "reading" | "meaning";

type StudyCard = {
  id: string;
  userBookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  surface: string;
  reading: string;
  meaning: string;
  jlpt: string | null;
  encounterCount: number;
  encounterIds: string[];
  colorStatus: LibraryStudyColorStatus;
  activeGate: LibraryCheckGate;
  studyIdentityKey: string;
  progress: LibraryWordProgressRow | null;
  definitionNumber: number | null;
};

type MeaningReviewItem = {
  id: string;
  card: StudyCard;
  userAnswer: string;
  correctAnswer: string;
  cardType: string;
  originalOk: boolean;
};

type LibraryCheckDebug = {
  threshold: number;
  rawRows: number;
  completeGroups: number;
  eligibleCards: number;
  filteredCards: number;
  topCompleteGroups: {
    surface: string;
    reading: string;
    encounters: number;
    reason: string;
  }[];
};

type StudyMode =
  | "reading_typing"
  | "meaning_typing";

type LibraryStudyMode = "check" | "practice";
type PracticeRevealStep = "word" | "reading" | "meaning";
type PracticeStudyMode = "reveal" | "typing";
type PracticeTypingStep = "reading" | "meaning";
type PracticeColorFilter =
  | "all"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "grey"
  | "katakana";

const STORAGE_KEY = "library-study-seen-by-date";
const ABILITY_CHECK_COMPLETED_KEY = "ability-check-completed-date";
const ABILITY_CHECK_REMINDER_HIDE_KEY = "ability-check-reminder-hidden-date";
const REGULAR_GATE_RECHECK_MIN_DAYS = 3;
const REGULAR_GATE_RECHECK_WINDOW_DAYS = 5;
const MISSED_GATE_RECHECK_MIN_DAYS = 7;
const MISSED_GATE_RECHECK_WINDOW_DAYS = 8;
const PRE_READING_SOFT_WAIT_RECHECK_DAYS = 30;
const LIBRARY_PROGRESS_KEY_BATCH_SIZE = 75;
const PRE_READING_WAIT_RECHECK_DAYS = 90;

const DEFAULT_LEARNING_SETTINGS: LearningSettingsRow = {
  red_stages: 1,
  orange_stages: 1,
  yellow_stages: 1,
  show_badge_numbers: true,
  skip_katakana_library_check: true,
};

const LIBRARY_CHECK_WORD_PAGE_SIZE = 1000;

const DAILY_CHECK_PLAN_STORAGE_KEY = "library-study-daily-check-plan-by-date";

const DAILY_CHECK_JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const DAILY_CHECK_LEVELS = [...DAILY_CHECK_JLPT_LEVELS, "NON-JLPT"] as const;
const ABILITY_CHECK_MIN_DUE_CARDS = 10;

type DailyCheckLevel = (typeof DAILY_CHECK_LEVELS)[number];

type DailyCheckPlan = {
  dateKey: string;
  levels: DailyCheckLevel[];
  startedAt: string;
  cardIds?: string[];
};

function isDailyCheckLevel(value: string): value is DailyCheckLevel {
  return (DAILY_CHECK_LEVELS as readonly string[]).includes(value);
}

function cardMatchesDailyCheckLevels(card: StudyCard, levels: DailyCheckLevel[]) {
  if (levels.length === 0) return false;
  return levels.includes(normalizeJlpt(card.jlpt) as DailyCheckLevel);
}

function dailyCheckLevelsLabel(levels: DailyCheckLevel[]) {
  if (levels.length === 0) return "No levels selected";
  return levels.join(", ");
}

function loadDailyCheckPlanForToday() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DAILY_CHECK_PLAN_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, DailyCheckPlan>;
    const todayKey = getTodayKey();
    const plan = parsed[todayKey];

    if (!plan || plan.dateKey !== todayKey) return null;

    const cleanLevels = (plan.levels ?? []).filter(isDailyCheckLevel);

    if (cleanLevels.length === 0) return null;

    return {
      dateKey: todayKey,
      levels: cleanLevels,
      startedAt: plan.startedAt || new Date().toISOString(),
      cardIds: Array.isArray(plan.cardIds)
        ? plan.cardIds.filter((id) => typeof id === "string" && id.trim())
        : undefined,
    };
  } catch {
    return null;
  }
}

function saveDailyCheckPlanForToday(plan: DailyCheckPlan) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(DAILY_CHECK_PLAN_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, DailyCheckPlan>) : {};

    window.localStorage.setItem(
      DAILY_CHECK_PLAN_STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        [plan.dateKey]: plan,
      })
    );
  } catch {
    // ignore localStorage failures
  }
}

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeText(value: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeKana(value: string) {
  return normalizeKanaReading(value ?? "");
}

function normalizeJlpt(value: string | null | undefined) {
  return (value ?? "NON-JLPT").toUpperCase() || "NON-JLPT";
}

function isKatakanaOnly(value: string | null | undefined) {
  const compact = (value ?? "").trim().replace(/\s+/g, "");
  return compact.length > 0 && /^[ァ-ヶー・･]+$/.test(compact);
}

function studyIdentityKey(surface: string | null | undefined, reading: string | null | undefined) {
  const normalizedSurface = normalizeText(surface ?? "");
  const normalizedReading = normalizeKana(reading ?? "");
  if (!normalizedSurface) return "";
  return `${normalizedSurface}||${normalizedReading}`;
}

function isClaimCardId(id: string | null | undefined) {
  return (id ?? "").startsWith("claim:");
}

function getBookMeta(row: UserBookJoinRow) {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return {
    title: book?.title ?? "Untitled",
    cover_url: book?.cover_url ?? null,
  };
}

function definitionNumberFromIndex(index: number | null | undefined) {
  return typeof index === "number" && index >= 0 ? index + 1 : null;
}

function definitionLabel(card: StudyCard | null | undefined) {
  const progressDefinition = card?.progress?.definition_key?.trim();
  if (progressDefinition) return `Def #${progressDefinition}`;
  if (card?.definitionNumber != null) return `Def #${card.definitionNumber}`;
  return "";
}

async function loadAllLibraryCheckWords(userBookIds: string[]) {
  const allRows: UserBookWordRow[] = [];
  let from = 0;

  while (true) {
    const to = from + LIBRARY_CHECK_WORD_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("user_book_words")
      .select("id, user_book_id, surface, reading, meaning, meaning_choice_index, jlpt, hidden, created_at")
      .in("user_book_id", userBookIds)
      .or("hidden.is.null,hidden.eq.false")
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<UserBookWordRow[]>();

    if (error) throw error;

    allRows.push(...(data ?? []));

    if (!data || data.length < LIBRARY_CHECK_WORD_PAGE_SIZE) {
      break;
    }

    from += LIBRARY_CHECK_WORD_PAGE_SIZE;
  }

  return allRows;
}

async function loadLibraryWordClaims(userId: string) {
  const { data, error } = await supabase
    .from("user_library_word_claims")
    .select(
      `
        id,
        study_identity_key,
        surface,
        reading,
        meaning,
        claimed_color,
        created_at,
        updated_at
      `
    )
    .eq("user_id", userId)
    .eq("claimed_color", "green")
    .order("updated_at", { ascending: false })
    .limit(500)
    .returns<LibraryWordClaimRow[]>();

  if (error) {
    console.warn("Word Sky claims did not load for Ability Check:", error);
    return [];
  }

  return data ?? [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function loadLibraryProgressByKey(userId: string, studyKeys: string[]) {
  const progressByKey = new Map<string, LibraryWordProgressRow>();
  const uniqueKeys = uniqueStrings(studyKeys);

  for (let i = 0; i < uniqueKeys.length; i += LIBRARY_PROGRESS_KEY_BATCH_SIZE) {
    const batch = uniqueKeys.slice(i, i + LIBRARY_PROGRESS_KEY_BATCH_SIZE);
    const { data: progressRows, error: progressErr } = await supabase
      .from("user_library_word_progress")
      .select(
        `
          id,
          user_id,
          study_identity_key,
          surface,
          reading,
          definition_key,
          reading_gate_status,
          meaning_gate_status,
          held_before_reading_gate,
          held_before_meaning_gate,
          mastered,
          reading_gate_attempts,
          meaning_gate_attempts,
          reading_gate_passed_at,
          reading_gate_failed_at,
          meaning_gate_passed_at,
          meaning_gate_failed_at,
          mastered_at,
          last_studied_at
        `
      )
      .eq("user_id", userId)
      .eq("definition_key", "")
      .in("study_identity_key", batch)
      .returns<LibraryWordProgressRow[]>();

    if (progressErr) throw progressErr;

    for (const row of progressRows ?? []) {
      progressByKey.set(row.study_identity_key, row);
    }
  }

  return progressByKey;
}

function progressWithWordSkyClaim(
  userId: string,
  key: string,
  surface: string,
  reading: string,
  progress: LibraryWordProgressRow | null,
  claim: LibraryWordClaimRow | null | undefined
): LibraryWordProgressRow | null {
  if (!claim || claim.claimed_color !== "green") return progress;

  const hasExistingGateHistory =
    progress &&
    (
      progress.reading_gate_status !== "not_started" ||
      progress.meaning_gate_status !== "not_started" ||
      progress.held_before_reading_gate ||
      progress.held_before_meaning_gate ||
      progress.mastered
    );

  if (hasExistingGateHistory) return progress;

  return {
    id: progress?.id,
    user_id: userId,
    study_identity_key: key,
    surface,
    reading,
    definition_key: "",
    reading_gate_status: "not_started",
    meaning_gate_status: "not_started",
    held_before_reading_gate: false,
    held_before_meaning_gate: false,
    mastered: false,
    reading_gate_attempts: progress?.reading_gate_attempts ?? 0,
    meaning_gate_attempts: progress?.meaning_gate_attempts ?? 0,
    reading_gate_passed_at: progress?.reading_gate_passed_at ?? null,
    reading_gate_failed_at: progress?.reading_gate_failed_at ?? null,
    meaning_gate_passed_at: progress?.meaning_gate_passed_at ?? null,
    meaning_gate_failed_at: progress?.meaning_gate_failed_at ?? null,
    mastered_at: progress?.mastered_at ?? null,
    last_studied_at: progress?.last_studied_at ?? null,
  };
}

function isReadyForReadingGateProgress(progress: LibraryWordProgressRow | null | undefined) {
  return Boolean(
    progress?.id &&
    progress.reading_gate_status === "not_started" &&
    progress.meaning_gate_status === "not_started" &&
    !progress.held_before_reading_gate &&
    !progress.held_before_meaning_gate &&
    !progress.mastered
  );
}

function preReadingSupportCycle(progress: LibraryWordProgressRow | null | undefined) {
  if (!progress?.held_before_reading_gate) return null;
  return Math.max(2, (progress.reading_gate_attempts ?? 0) + 1);
}

function makeClaimStudyCard(
  userId: string,
  claim: LibraryWordClaimRow,
  colorSettings: LearningSettingsRow,
  progressByKey: Map<string, LibraryWordProgressRow>
): StudyCard | null {
  const key = claim.study_identity_key;
  const surface = (claim.surface ?? "").trim();
  const reading = (claim.reading ?? "").trim();
  const meaning = (claim.meaning ?? "").trim();

  if (!key || !surface || !reading || !meaning) return null;

  if (colorSettings.skip_katakana_library_check && isKatakanaOnly(surface)) {
    return null;
  }

  const progress = progressWithWordSkyClaim(
    userId,
    key,
    surface,
    reading,
    progressByKey.get(key) ?? null,
    claim
  );

  const colorStatus = computeLibraryStudyColorStatus({
    encounterCount: 0,
    settings: colorSettings,
    readingGate: progress?.reading_gate_status ?? "not_started",
    meaningGate: progress?.meaning_gate_status ?? "not_started",
    heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
    heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
    readyForReadingGate: isReadyForReadingGateProgress(progress),
    preReadingSupportCycle: preReadingSupportCycle(progress),
    mastered: progress?.mastered ?? false,
  });

  return {
    id: `claim:${key}`,
    userBookId: "",
    bookTitle: "Word Sky",
    bookCoverUrl: null,
    surface,
    reading,
    meaning,
    jlpt: null,
    encounterCount: 0,
    encounterIds: [],
    colorStatus,
    activeGate: pickLibraryCheckGate(colorStatus, key),
    studyIdentityKey: key,
    progress,
    definitionNumber: null,
  };
}

function libraryStudyCardClass(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";
  const base =
    "relative flex min-h-[30vh] w-full max-w-2xl items-center justify-center rounded-2xl border bg-white p-6 text-center shadow-2xl transition-colors sm:min-h-[36vh]";

  if (color === "green") return `${base} border-emerald-100`;
  if (color === "blue") return `${base} border-sky-100`;
  if (color === "grey") return `${base} border-slate-200`;
  if (color === "purple") return `${base} border-violet-100`;
  if (color === "red") return `${base} border-rose-100`;
  if (color === "orange") return `${base} border-orange-100`;

  return `${base} border-amber-100`;
}

function libraryStudyChipClass(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";
  const base = "rounded-full border px-2 py-1 text-[10px] font-semibold shadow-sm sm:px-3 sm:py-1.5 sm:text-xs";

  if (color === "green") return `${base} border-emerald-100 bg-white/90 text-emerald-900`;
  if (color === "blue") return `${base} border-sky-100 bg-white/90 text-sky-900`;
  if (color === "grey") return `${base} border-slate-100 bg-white/90 text-slate-700`;
  if (color === "purple") return `${base} border-violet-100 bg-white/90 text-violet-900`;
  if (color === "red") return `${base} border-rose-100 bg-white/90 text-rose-900`;
  if (color === "orange") return `${base} border-orange-100 bg-white/90 text-orange-950`;

  return `${base} border-amber-100 bg-white/90 text-amber-950`;
}

function libraryStudyDotClass(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";

  if (color === "red") return "bg-red-500";
  if (color === "orange") return "bg-orange-500";
  if (color === "yellow") return "bg-yellow-300";
  if (color === "green") return "bg-emerald-500";
  if (color === "blue") return "bg-sky-500";
  if (color === "purple") return "bg-violet-500";
  if (color === "grey") return "bg-slate-500";
  return "bg-slate-300";
}

function libraryStudyColorName(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";
  if (color === "grey") return "Limbo";
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickLibraryCheckGate(status: LibraryStudyColorStatus, _seed: string): LibraryCheckGate {
  if (status.color === "red" && status.eligibleForLibraryStudy) return "readiness";
  if (status.color === "yellow" && status.eligibleForLibraryStudy) return "readiness";
  if (status.nextGate === "reading") return "reading";
  if (status.nextGate === "meaning") return "meaning";
  return "reading";
}

function includeLibraryCheckCard(status: LibraryStudyColorStatus) {
  return status.eligibleForLibraryStudy || status.nextGate === "reading" || status.nextGate === "meaning";
}

function daysSinceIso(value: string | null | undefined, now = new Date()) {
  if (!value) return Number.POSITIVE_INFINITY;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;

  return (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
}

function missedGateRecheckDays(card: StudyCard) {
  return (
    MISSED_GATE_RECHECK_MIN_DAYS +
    (hashString(`${card.studyIdentityKey}::missed-gate`) % MISSED_GATE_RECHECK_WINDOW_DAYS)
  );
}

function regularGateRecheckDays(card: StudyCard) {
  return (
    REGULAR_GATE_RECHECK_MIN_DAYS +
    (hashString(`${card.studyIdentityKey}::regular-gate`) % REGULAR_GATE_RECHECK_WINDOW_DAYS)
  );
}

function appDayNumber(now = new Date()) {
  const [year, month, day] = ymdInTimeZone(now).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000));
}

function isInitialGateSlotDue(card: StudyCard, now = new Date()) {
  const recheckDays = regularGateRecheckDays(card);
  const dayNumber = appDayNumber(now);
  const releaseOffset =
    hashString(`${card.studyIdentityKey}::initial-gate-slot`) % recheckDays;

  return dayNumber % recheckDays === releaseOffset;
}

function lastStudiedTime(card: StudyCard) {
  const value = card.progress?.last_studied_at;
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function rankDailyCheckCards(cards: StudyCard[]) {
  return shuffleArray(cards).sort((a, b) => {
    const lastStudiedDifference = lastStudiedTime(a) - lastStudiedTime(b);
    if (lastStudiedDifference !== 0) return lastStudiedDifference;

    return (
      hashString(`${a.studyIdentityKey}::daily-rotation`) -
      hashString(`${b.studyIdentityKey}::daily-rotation`)
    );
  });
}

function isCardSeenToday(card: StudyCard, seenTodayIds: Set<string>) {
  return seenTodayIds.has(card.id) || seenTodayIds.has(card.studyIdentityKey);
}

function dedupeCardsByStudyIdentity(cards: StudyCard[]) {
  const seenKeys = new Set<string>();

  return cards.filter((card) => {
    const key = card.studyIdentityKey || card.id;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

function isMissedGateLimboDue(card: StudyCard, now = new Date()) {
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

function isBackToRedSupportCard(card: StudyCard) {
  return (
    card.colorStatus.color === "red" &&
    card.progress?.held_before_reading_gate === true &&
    card.progress?.held_before_meaning_gate === true
  );
}

function isRegularGateRecheckDue(card: StudyCard, now = new Date()) {
  if (isBackToRedSupportCard(card)) {
    return daysSinceIso(card.progress?.last_studied_at, now) >= PRE_READING_WAIT_RECHECK_DAYS;
  }

  if (card.colorStatus.color === "purple" || card.colorStatus.color === "grey") return true;
  if (!card.progress?.last_studied_at) return isInitialGateSlotDue(card, now);

  return daysSinceIso(card.progress.last_studied_at, now) >= regularGateRecheckDays(card);
}

function isCardAvailableForLibraryCheck(
  card: StudyCard,
  selectedJlpt: string,
  seenTodayIds: Set<string>,
  options: { ignoreTiming?: boolean } = {}
) {
  const jlptMatch = selectedJlpt === "all" || normalizeJlpt(card.jlpt) === selectedJlpt;

  if (!jlptMatch) return false;
  if (!includeLibraryCheckCard(card.colorStatus)) return false;

  // Used by "Check Again Today" so the button really means:
  // "give me cards even if I already checked them today / they are not due yet."
  if (options.ignoreTiming) return true;

  const notSeenToday = !isCardSeenToday(card, seenTodayIds);

  return (
    notSeenToday &&
    isMissedGateLimboDue(card) &&
    isRegularGateRecheckDue(card)
  );
}

function availableDailyCheckCountForLevel(
  cards: StudyCard[],
  level: DailyCheckLevel,
  seenTodayIds: Set<string>
) {
  return cards.filter(
    (card) =>
      normalizeJlpt(card.jlpt) === level &&
      isCardAvailableForLibraryCheck(card, "all", seenTodayIds)
  ).length;
}

function buildDailyCheckDeckSource(
  cards: StudyCard[],
  plan: DailyCheckPlan,
  seenTodayIds: Set<string>,
  options: { ignoreTiming?: boolean } = {}
) {
  const dueCards = cards.filter((card) =>
    isCardAvailableForLibraryCheck(card, "all", seenTodayIds, {
      ignoreTiming: options.ignoreTiming,
    })
  );

  const primaryDueCards = dueCards.filter((card) =>
    cardMatchesDailyCheckLevels(card, plan.levels)
  );

  const rotatedDue = rankDailyCheckCards(dedupeCardsByStudyIdentity(primaryDueCards));

  return rotatedDue;
}

function checkSessionSummary(deck: StudyCard[]) {
  const dueCount = deck.filter((card) =>
    isCardAvailableForLibraryCheck(card, "all", new Set())
  ).length;

  return {
    dueCount,
    fillCount: Math.max(0, deck.length - dueCount),
  };
}

function checkSessionSummaryText(deck: StudyCard[]) {
  const summary = checkSessionSummary(deck);
  if (deck.length === 0) return "";

  if (summary.fillCount === 0) {
    return `${summary.dueCount} due card${summary.dueCount === 1 ? "" : "s"}`;
  }

  return `${summary.dueCount} due + ${summary.fillCount} ready fill`;
}

function isCardAvailableForLibraryPractice(
  card: StudyCard,
  selectedJlpt: string,
  colorFilter: PracticeColorFilter
) {
  const jlptMatch = selectedJlpt === "all" || normalizeJlpt(card.jlpt) === selectedJlpt;
  if (!jlptMatch) return false;

  if (colorFilter === "all") return true;
  if (colorFilter === "katakana") return isKatakanaOnly(card.surface);

  return card.colorStatus.color === colorFilter;
}

function gatePromptText(card: StudyCard | undefined) {
  if (!card) return "Ability Check";

  if (card.activeGate === "readiness") {
    return "Readiness Check";
  }

  if (card.activeGate === "meaning") {
    return "Meaning Check";
  }

  return "Reading Check";
}

function gatePromptClass(card: StudyCard | undefined) {
  const base =
    "rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide shadow-sm sm:px-5 sm:py-2 sm:text-sm";

  if (card?.activeGate === "readiness") {
    return `${base} border-yellow-300 bg-yellow-100 text-yellow-950`;
  }

  if (card?.activeGate === "meaning") {
    return `${base} border-sky-300 bg-sky-100 text-sky-950`;
  }

  return `${base} border-emerald-300 bg-emerald-100 text-emerald-950`;
}

function checkModeLabel(card: StudyCard | undefined) {
  if (!card) return "Ability Check";
  if (card.activeGate === "readiness") return "Readiness Check";
  if (card.activeGate === "reading") return "Reading Check";
  if (card.activeGate === "meaning") return "Meaning Check";
  return "Ability Check";
}

function checkModeDescription(card: StudyCard | undefined) {
  if (!card) return "Ability Check moves words through readiness, reading, and meaning gates.";
  if (card.activeGate === "readiness") {
    return "Decide whether this word is ready to enter the Reading Gate.";
  }
  if (card.activeGate === "reading") {
    return "Green gate: show word + meaning, then type the reading.";
  }
  if (card.activeGate === "meaning") {
    return "Blue gate: show word + reading, then type one meaning word.";
  }
  return "Ability Check moves words through readiness, reading, and meaning gates.";
}

function studyModeForActiveGate(card: StudyCard | undefined): StudyMode {
  if (card?.activeGate === "reading") return "reading_typing";
  if (card?.activeGate === "meaning") return "meaning_typing";
  return "reading_typing";
}

function AbilityCheckFaq() {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
      <summary className="cursor-pointer text-sm font-black text-slate-900">
        Ability Check FAQ
      </summary>

      <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="font-black text-slate-900">What is Ability Check?</div>
          <p className="mt-1">
            A short daily gate check for words that are ready to move through reading,
            meaning, and mastery.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="font-black text-slate-900">Why don’t I see Red and Orange?</div>
          <p className="mt-1">
            Red and Orange build quietly from real reading encounters. Words arrive here
            once they reach Yellow readiness.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="font-black text-slate-900">Why can’t I choose a study mode?</div>
          <p className="mt-1">
            Ability Check chooses the gate for the card. Yellow checks readiness, Green asks
            reading, and Blue asks meaning.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="font-black text-slate-900">Can I keep studying?</div>
          <p className="mt-1">
            Yes. The Library reminder only appears after 10 cards are due, but you can
            open Ability Check anytime and study the cards that are ready.
          </p>
        </div>
      </div>
    </details>
  );
}

function promptModeClass(gate: LibraryCheckGate | undefined) {
  const base =
    "animate-pulse rounded-2xl border px-5 py-2.5 text-xl font-black uppercase tracking-[0.12em] shadow-sm sm:rounded-3xl sm:px-9 sm:py-4 sm:text-3xl sm:tracking-[0.16em]";

  if (gate === "readiness") {
    return `${base} border-yellow-300 bg-yellow-100 text-yellow-950`;
  }

  if (gate === "meaning") {
    return `${base} border-sky-300 bg-sky-100 text-sky-950`;
  }

  return `${base} border-emerald-300 bg-emerald-100 text-emerald-950`;
}

function KatakanaBadge() {
  return (
    <span
      title="Katakana-only word"
      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
    >
      カ
    </span>
  );
}

function LibraryCheckIntroCard({
  mode,
  onModeChange,
}: {
  mode: LibraryStudyMode;
  onModeChange: (mode: LibraryStudyMode) => void;
}) {
  const colorSteps = [
    { label: "Yellow", className: "bg-yellow-300", text: "ready for gate checks" },
    { label: "Green", className: "bg-emerald-500", text: "reading gate" },
    { label: "Blue", className: "bg-sky-500", text: "meaning gate" },
    { label: "Purple", className: "bg-violet-500", text: "mastered" },
  ];

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">
            {mode === "practice" ? "Library Practice" : "Ability Check"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {mode === "practice"
              ? "A gentle reveal space for reviewing all words in your library without moving their colors."
              : "A once-a-day check for words that are ready to move by ability."}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => onModeChange("check")}
            className={`rounded-lg px-3 py-2 transition ${mode === "check" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
          >
            Check
          </button>
          <button
            type="button"
            onClick={() => onModeChange("practice")}
            className={`rounded-lg px-3 py-2 transition ${mode === "practice" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
          >
            Review
          </button>
        </div>
      </div>

      {mode === "practice" ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-sky-50 px-3 py-2">
            <div className="text-xs font-semibold text-sky-950">Reveal slowly</div>
            <div className="text-[11px] leading-4 text-slate-500">Word, then reading, then meaning.</div>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-xs font-semibold text-slate-800">No gate movement</div>
            <div className="text-[11px] leading-4 text-slate-500">Review never passes or fails a word.</div>
          </div>

          <div className="rounded-xl bg-violet-50 px-3 py-2">
            <div className="text-xs font-semibold text-violet-950">Repeat freely</div>
            <div className="text-[11px] leading-4 text-slate-500">Shuffle and review as much as you want.</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {colorSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <span className={`h-3 w-3 rounded-full ${step.className}`} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800">{step.label}</div>
                <div className="truncate text-[11px] text-slate-500">{step.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryPracticePanel({
  card,
  total,
  revealStep,
  practiceMode,
  onAdvance,
  onNext,
  onPrevious,
  onShuffle,
  onMeaningAnswered,
  onTypingMissed,
  meaningReviewCount,
  onReviewMeanings,
}: {
  card: StudyCard | undefined;
  total: number;
  revealStep: PracticeRevealStep;
  practiceMode: PracticeStudyMode;
  onAdvance: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onMeaningAnswered: (
    card: StudyCard,
    userAnswer: string,
    correctAnswer: string,
    ok: boolean
  ) => void;
  onTypingMissed: (card: StudyCard, gate: "reading" | "meaning") => void;
  meaningReviewCount: number;
  onReviewMeanings: () => void;
}) {
  const [typingStep, setTypingStep] = useState<PracticeTypingStep>("reading");
  const [typingInput, setTypingInput] = useState("");
  const [typingFeedback, setTypingFeedback] = useState<null | {
    ok: boolean;
    answer: string;
    label: string;
  }>(null);
  const [typingMissedStep, setTypingMissedStep] = useState<PracticeTypingStep | null>(null);
  const typingPracticeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTypingStep("reading");
    setTypingInput("");
    setTypingFeedback(null);
    setTypingMissedStep(null);
  }, [card?.id, practiceMode]);

  if (!card) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Review Study
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">No practice cards here yet.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          Try another JLPT filter, or add a few easier words from Word Sky.
        </p>
      </div>
    );
  }

  const showReading = revealStep === "reading" || revealStep === "meaning";
  const showMeaning = revealStep === "meaning";
  const typingLabel = typingStep === "reading" ? "Reading" : "Meaning";

  function submitTypingPractice() {
    if (!typingInput.trim()) return;

    const userAnswer = typingInput.trim();
    const correctAnswer = typingStep === "reading" ? card.reading : card.meaning;
    const ok =
      typingStep === "reading"
        ? normalizeKana(userAnswer) === normalizeKana(correctAnswer)
        : matchesAnyMeaning(userAnswer, correctAnswer);

    if (typingStep === "reading") {
      if (!ok) {
        if (typingMissedStep !== "reading") onTypingMissed(card, "reading");
        setTypingMissedStep("reading");
        setTypingFeedback({ ok, answer: correctAnswer || "—", label: typingLabel });
        setTypingInput("");
        window.requestAnimationFrame(() => typingPracticeInputRef.current?.focus());
        return;
      }

      setTypingFeedback({ ok, answer: correctAnswer || "—", label: typingLabel });

      window.setTimeout(() => {
        setTypingStep("meaning");
        setTypingInput("");
        setTypingFeedback(null);
        setTypingMissedStep(null);
        window.requestAnimationFrame(() => typingPracticeInputRef.current?.focus());
      }, 4000);
      return;
    }

    if (!ok) {
      if (typingMissedStep !== "meaning") {
        onMeaningAnswered(card, userAnswer, correctAnswer, false);
        onTypingMissed(card, "meaning");
      }
      setTypingMissedStep("meaning");
      setTypingFeedback({ ok, answer: correctAnswer || "—", label: typingLabel });
      setTypingInput("");
      window.requestAnimationFrame(() => typingPracticeInputRef.current?.focus());
      return;
    }

    if (typingMissedStep !== "meaning") {
      onMeaningAnswered(card, userAnswer, correctAnswer, true);
    }
    setTypingFeedback({ ok, answer: correctAnswer || "—", label: typingLabel });

    window.setTimeout(() => {
      onNext();
      window.setTimeout(() => {
        window.requestAnimationFrame(() => typingPracticeInputRef.current?.focus());
      }, 0);
    }, 4000);
  }

  return (
    <div className="w-full max-w-2xl space-y-2">
      {practiceMode === "reveal" ? (
        <button
          type="button"
          onClick={onAdvance}
          className="relative flex min-h-[30vh] w-full max-w-2xl cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl transition hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-sky-300 sm:min-h-[36vh]"
        >
          <div className="absolute left-4 top-4 flex">
            <div className="rounded-full border border-sky-100 bg-white/90 px-5 py-2 text-sm font-semibold text-sky-950 shadow-sm">
              Review Study{card.jlpt ? ` · ${card.jlpt}` : ""}
            </div>
          </div>

          <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
            <div className="rounded-full border border-slate-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              <span
                className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${libraryStudyDotClass(
                  card.colorStatus
                )}`}
              />
              {libraryStudyColorName(card.colorStatus)}
            </div>

            {isKatakanaOnly(card.surface) ? <KatakanaBadge /> : null}
          </div>

          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {definitionLabel(card) ? (
              <div className={libraryStudyChipClass(card.colorStatus)}>
                {definitionLabel(card)}
              </div>
            ) : null}
          </div>

          <div className="absolute bottom-4 right-4 flex flex-wrap justify-end gap-2">
            <div className={libraryStudyChipClass(card.colorStatus)}>
              Read {card.encounterCount}x
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-5 pt-12 pb-10">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Word
            </div>
            <div className="text-5xl font-bold text-slate-950">{card.surface}</div>

            <div className="grid w-full max-w-md gap-3 text-center">
              <div className="rounded-2xl border border-slate-100 bg-white/75 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reading
                </div>
                <div className={`mt-1 text-2xl font-semibold ${showReading ? "text-slate-900" : "text-slate-300"}`}>
                  {showReading ? card.reading : "Hidden"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white/75 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Meaning
                </div>
                <div className={`mt-1 text-xl font-semibold ${showMeaning ? "text-slate-900" : "text-slate-300"}`}>
                  {showMeaning ? card.meaning : "Hidden"}
                </div>
              </div>
            </div>
          </div>
        </button>
      ) : (
        <div className="relative flex min-h-[30vh] w-full max-w-2xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl sm:min-h-[36vh]">
          <div className="absolute left-4 top-4 flex">
            <div className="rounded-full border border-sky-100 bg-white/90 px-5 py-2 text-sm font-semibold text-sky-950 shadow-sm">
              Typing Practice{card.jlpt ? ` · ${card.jlpt}` : ""}
            </div>
          </div>

          <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
            <div className="rounded-full border border-slate-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              <span
                className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${libraryStudyDotClass(
                  card.colorStatus
                )}`}
              />
              {libraryStudyColorName(card.colorStatus)}
            </div>

            {isKatakanaOnly(card.surface) ? <KatakanaBadge /> : null}
          </div>

          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {definitionLabel(card) ? (
              <div className={libraryStudyChipClass(card.colorStatus)}>
                {definitionLabel(card)}
              </div>
            ) : null}
          </div>

          <div className="absolute bottom-4 right-4 flex flex-wrap justify-end gap-2">
            <div className={libraryStudyChipClass(card.colorStatus)}>
              Read {card.encounterCount}x
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-5 pt-12 pb-10">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {typingLabel}
            </div>
            <div className="text-5xl font-bold text-slate-950">{card.surface}</div>
            {typingStep === "meaning" ? (
              <div className="text-lg font-semibold text-slate-500">{card.reading}</div>
            ) : null}

            <div className="w-full max-w-md space-y-3">
              {typingStep === "reading" ? (
                <p className="text-center text-xs text-gray-500">
                  <span className="inline sm:whitespace-nowrap">Kana is best; </span>
                  <span className="inline sm:whitespace-nowrap">Hepburn romaji also works</span>
                </p>
              ) : null}

              <input
                ref={typingPracticeInputRef}
                value={typingInput}
                onChange={(e) => setTypingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  e.stopPropagation();
                  if (!typingFeedback || !typingFeedback.ok) submitTypingPractice();
                }}
                placeholder={typingStep === "reading" ? "Type kana or Hepburn romaji" : "Type the meaning"}
                inputMode="text"
                autoCorrect="off"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                disabled={typingFeedback?.ok === true}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base"
              />

              {typingFeedback ? (
                <div
                  className={`rounded-2xl border px-4 py-3 ${typingFeedback.ok
                    ? "border-emerald-100 bg-emerald-50"
                    : "border-rose-100 bg-rose-50"
                    }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {typingFeedback.ok ? "Looks right" : "Check this one"}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">
                    {typingFeedback.label}: {typingFeedback.answer}
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {typingFeedback.ok
                      ? "Next card comes automatically."
                      : typingStep === "reading"
                        ? "Retype the reading once to continue."
                        : `Retype "${shortMeaningRetypeHint(typingFeedback.answer)}" from the meaning to continue.`}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={submitTypingPractice}
                  className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Show answer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={onPrevious}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          disabled={total <= 1}
        >
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          disabled={total <= 1}
        >
          Skip
        </button>

        {practiceMode === "typing" ? (
          <button
            type="button"
            onClick={onReviewMeanings}
            disabled={meaningReviewCount === 0}
            className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-950 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Review meanings and finish{meaningReviewCount ? ` (${meaningReviewCount})` : ""}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onShuffle}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          disabled={total <= 1}
        >
          Shuffle
        </button>
      </div>

      <p className="text-center text-xs leading-5 text-slate-500">
        {practiceMode === "reveal"
          ? "Tap the card to reveal. Review does not move colors or count as passing an Ability Check gate."
          : "Reading checks automatically. Meaning answers can be reviewed when you finish."}
      </p>
    </div>
  );
}

function errorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const maybeError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return (
    [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
      .filter(Boolean)
      .join(" ") || "Unknown error"
  );
}

function normalizeMeaningAnswer(value: string) {
  return normalizeText(value)
    .replace(/[“”"]/g, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[.,;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningAnswerCandidates(fullMeaning: string) {
  const candidates = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeMeaningAnswer(value);
    if (normalized) candidates.add(normalized);
  };

  add(fullMeaning);
  add(shortMeaningRetypeHint(fullMeaning));
  add(fullMeaning.replace(/\([^)]*\)/g, " "));

  for (const part of fullMeaning.split(/[;,]/)) {
    add(part);
    add(part.replace(/\([^)]*\)/g, " "));
  }

  const firstNaturalBreak = fullMeaning.split(/[;,()]/)[0] ?? "";
  add(firstNaturalBreak);

  return candidates;
}

function matchesAnyMeaning(input: string, fullMeaning: string) {
  const normalizedInput = normalizeMeaningAnswer(input);
  if (!normalizedInput) return false;

  if (meaningAnswerCandidates(fullMeaning).has(normalizedInput)) {
    return true;
  }

  const semicolonParts = fullMeaning
    .split(";")
    .map((part) => normalizeMeaningAnswer(part))
    .filter(Boolean);

  for (const part of semicolonParts) {
    if (part === normalizedInput) return true;

    const commaParts = part
      .split(",")
      .map((piece) => normalizeMeaningAnswer(piece))
      .filter(Boolean);

    for (const piece of commaParts) {
      if (piece === normalizedInput) return true;

      const words = piece
        .replace(/[()]/g, " ")
        .split(/\s+/)
        .map((word) => normalizeMeaningAnswer(word))
        .filter(Boolean);

      if (words.includes(normalizedInput)) {
        return true;
      }
    }
  }

  return false;
}

function shortMeaningRetypeHint(fullMeaning: string) {
  const words = fullMeaning
    .replace(/[;,:()"]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (words.length === 0) return "part of the meaning";
  return words.join(" ");
}

function getTodayKey() {
  return todayYmdAppTimeZone();
}

function loadSeenForToday() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as Record<string, string[]>;
    const today = getTodayKey();
    const todaysValues = parsed[today] ?? [];
    return new Set(todaysValues);
  } catch {
    return new Set<string>();
  }
}

function saveSeenForToday(values: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    const today = getTodayKey();

    const cleaned: Record<string, string[]> = {};
    cleaned[today] = Array.from(values);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, ...cleaned }));
  } catch {
    // ignore localStorage failures
  }
}

function markAbilityCheckCompletedToday() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ABILITY_CHECK_COMPLETED_KEY, getTodayKey());
}

function hideAbilityCheckReminderForToday() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ABILITY_CHECK_REMINDER_HIDE_KEY, getTodayKey());
}

export default function LibraryStudyPage() {
  const router = useRouter();
  const typingInputRef = useRef<HTMLInputElement | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [learningSettings, setLearningSettings] =
    useState<LearningSettingsRow>(DEFAULT_LEARNING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canUseAbilityCheck, setCanUseAbilityCheck] = useState(false);
  const [fullAccessLocked, setFullAccessLocked] = useState(false);

  const [allCards, setAllCards] = useState<StudyCard[]>([]);
  const [deck, setDeck] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [practiceDeck, setPracticeDeck] = useState<StudyCard[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceRevealStep, setPracticeRevealStep] = useState<PracticeRevealStep>("word");
  const [practiceStudyMode, setPracticeStudyMode] = useState<PracticeStudyMode>("reveal");
  const [, setDebugInfo] = useState<LibraryCheckDebug | null>(null);

  const [libraryMode, setLibraryMode] = useState<LibraryStudyMode>("check");
  const [selectedJlpt, setSelectedJlpt] = useState("all");
  const [dailyCheckPlan, setDailyCheckPlan] = useState<DailyCheckPlan | null>(null);
  const [setupLevels, setSetupLevels] = useState<DailyCheckLevel[]>([]);
  const [practiceColorFilter, setPracticeColorFilter] =
    useState<PracticeColorFilter>("all");

  const [checked, setChecked] = useState<null | { ok: boolean; correct: string }>(null);
  const [typingInput, setTypingInput] = useState("");
  const [typingCorrectionComplete, setTypingCorrectionComplete] = useState(false);

  const [endedEarly, setEndedEarly] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [seenTodayIds, setSeenTodayIds] = useState<Set<string>>(new Set());
  const [activeTodayKey, setActiveTodayKey] = useState(getTodayKey());
  const [meaningReviewItems, setMeaningReviewItems] = useState<MeaningReviewItem[]>([]);
  const [showPracticeMeaningReview, setShowPracticeMeaningReview] = useState(false);

  const currentCard = deck[index];
  const practiceCard = practiceDeck[practiceIndex];
  const activeStudyMode = studyModeForActiveGate(currentCard);
  const currentInstructionText = checked
    ? checked.ok || typingCorrectionComplete
      ? "Great! Next word comes automatically."
      : activeStudyMode === "reading_typing"
        ? "Not quite. Retype the reading."
        : `Not quite. Retype "${shortMeaningRetypeHint(checked.correct)}" from the meaning.`
    : null;

  const filteredCards = useMemo(() => {
    if (!dailyCheckPlan) return [];

    return buildDailyCheckDeckSource(allCards, dailyCheckPlan, seenTodayIds);
  }, [allCards, dailyCheckPlan, seenTodayIds]);

  const practiceFilteredCards = useMemo(() => {
    return allCards.filter((card) =>
      isCardAvailableForLibraryPractice(card, selectedJlpt, practiceColorFilter)
    );
  }, [allCards, selectedJlpt, practiceColorFilter]);

  const availableCountBySetupLevel = useMemo(() => {
    const counts: Record<DailyCheckLevel, number> = {
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0,
      "NON-JLPT": 0,
    };

    for (const level of DAILY_CHECK_LEVELS) {
      counts[level] = availableDailyCheckCountForLevel(
        allCards,
        level,
        seenTodayIds
      );
    }

    return counts;
  }, [allCards, seenTodayIds]);

  const allLevelsDueCount = useMemo(
    () =>
      DAILY_CHECK_LEVELS.reduce(
        (sum, level) => sum + availableCountBySetupLevel[level],
        0
      ),
    [availableCountBySetupLevel]
  );

  useEffect(() => {
    if (libraryMode !== "check") return;
    if (dailyCheckPlan) return;
    if (loading || needsSignIn || errorMsg) return;
    if (allCards.length === 0) return;
    if (allLevelsDueCount >= ABILITY_CHECK_MIN_DUE_CARDS) return;

    hideAbilityCheckReminderForToday();
  }, [
    allCards.length,
    allLevelsDueCount,
    dailyCheckPlan,
    errorMsg,
    libraryMode,
    loading,
    needsSignIn,
  ]);

  useEffect(() => {
    setDebugInfo((prev) => (prev ? { ...prev, filteredCards: filteredCards.length } : prev));
  }, [filteredCards.length]);

  useEffect(() => {
    function resetForCurrentDay() {
      const todayKey = getTodayKey();

      setActiveTodayKey((previousKey) => {
        if (previousKey !== todayKey) {
          const todaysPlan = loadDailyCheckPlanForToday();

          setSeenTodayIds(loadSeenForToday());
          setDailyCheckPlan(todaysPlan);
          setNotice(null);
          setEndedEarly(false);
          setIndex(0);
          resetCardState();

          return todayKey;
        }

        return previousKey;
      });
    }

    setSeenTodayIds(loadSeenForToday());
    setDailyCheckPlan(loadDailyCheckPlanForToday());
    resetForCurrentDay();

    const interval = window.setInterval(resetForCurrentDay, 60_000);

    window.addEventListener("focus", resetForCurrentDay);
    document.addEventListener("visibilitychange", resetForCurrentDay);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", resetForCurrentDay);
      document.removeEventListener("visibilitychange", resetForCurrentDay);
    };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNeedsSignIn(false);
      setErrorMsg(null);
      setCanUseAbilityCheck(false);
      setFullAccessLocked(false);

      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
          setCurrentUserId(null);
          setNeedsSignIn(true);
          setLoading(false);
          return;
        }

        setCurrentUserId(user.id);

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role, is_super_teacher, app_access_type, app_access_expires_at")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) {
          console.error("Error loading profile access for Ability Check:", profileErr);
        }

        const appAccessStatus = profile
          ? getAppAccessStatus(profile)
          : { hasAccess: false, hasFullAccess: false, reason: "missing_profile" };

        const featureAccess = getFeatureAccess({
          role: profile?.is_super_teacher ? "super_teacher" : profile?.role ?? null,

          // For this first pass, anyone who currently has app access keeps
          // full learning access. Later, when expired trials become free users,
          // we can separate "can enter app" from "has full learning access."
          hasFullAccess: appAccessStatus.hasFullAccess,
        });

        const canUseAbilityCheckNow = canUseFullAccessFeature(
          featureAccess,
          "ability_check"
        );

        setCanUseAbilityCheck(canUseAbilityCheckNow);

        if (!canUseAbilityCheckNow) {
          setAllCards([]);
          setDeck([]);
          setFullAccessLocked(true);
          setLoading(false);
          return;
        }

        const { data: userBooks, error: userBooksErr } = await supabase
          .from("user_books")
          .select(`
    id,
    books:book_id (
      title,
      cover_url
    )
  `)
          .eq("user_id", user.id)
          .returns<UserBookJoinRow[]>();

        if (userBooksErr) throw userBooksErr;

        const userBookIds = (userBooks ?? []).map((row) => row.id).filter(Boolean);

        if (userBookIds.length === 0) {
          setAllCards([]);
          setDeck([]);
          setLoading(false);
          return;
        }

        let learningSettings: LearningSettingsRow | null = null;
        const { data: loadedLearningSettings, error: settingsErr } = await supabase
          .from("user_learning_settings")
          .select("red_stages, orange_stages, yellow_stages, show_badge_numbers, skip_katakana_library_check")
          .eq("user_id", user.id)
          .maybeSingle<LearningSettingsRow>();

        if (settingsErr) {
          throw settingsErr;
        } else {
          learningSettings = loadedLearningSettings;
        }

        const colorSettings = {
          ...DEFAULT_LEARNING_SETTINGS,
          ...(learningSettings ?? {}),
        };
        const encounterThreshold = getLibraryStudyEncounterStageCounts(colorSettings).total;
        setLearningSettings(colorSettings);

        const metaById = new Map<string, { title: string; cover_url: string | null }>();
        for (const row of userBooks ?? []) {
          metaById.set(row.id, getBookMeta(row));
        }

        const { data: summaryRows, error: summaryErr } = await supabase
          .from("user_library_word_summaries")
          .select(
            `
              study_identity_key,
              surface,
              reading,
              meaning,
              jlpt,
              total_encounter_count,
              check_ready_encounter_count,
              sample_user_book_word_id,
              sample_user_book_id,
              sample_book_title,
              sample_book_cover_url
            `
          )
          .eq("user_id", user.id)
          .gt("check_ready_encounter_count", 0)
          .order("total_encounter_count", { ascending: false })
          .limit(500)
          .returns<LibraryWordSummaryRow[]>();

        const claimRows = await loadLibraryWordClaims(user.id);
        const claimByKey = new Map<string, LibraryWordClaimRow>();
        for (const claim of claimRows) {
          if (claim.study_identity_key) claimByKey.set(claim.study_identity_key, claim);
        }

        if (!summaryErr && summaryRows && summaryRows.length > 0) {
          const definitionNumberByWordId = new Map<string, number>();
          const sampleWordIds = uniqueStrings(
            summaryRows.map((row) => row.sample_user_book_word_id).filter(Boolean)
          );

          if (sampleWordIds.length > 0) {
            const { data: sampleWords, error: sampleWordsErr } = await supabase
              .from("user_book_words")
              .select("id, meaning_choice_index")
              .in("id", sampleWordIds);

            if (sampleWordsErr) {
              console.warn("Could not load definition numbers for Ability Check:", sampleWordsErr);
            } else {
              for (const word of sampleWords ?? []) {
                const definitionNumber = definitionNumberFromIndex(
                  (word as any).meaning_choice_index
                );
                if (definitionNumber != null) {
                  definitionNumberByWordId.set((word as any).id, definitionNumber);
                }
              }
            }
          }

          const studyKeys = uniqueStrings([
            ...summaryRows.map((row) => row.study_identity_key).filter(Boolean),
            ...claimRows.map((row) => row.study_identity_key).filter(Boolean),
          ]);

          const progressByKey = new Map<string, LibraryWordProgressRow>();

          if (studyKeys.length > 0) {
            try {
              const loadedProgress = await loadLibraryProgressByKey(user.id, studyKeys);
              for (const [key, row] of loadedProgress.entries()) {
                progressByKey.set(key, row);
              }
            } catch (progressErr) {
              console.warn("Ability Check progress did not load:", progressErr);
              setNotice(
                "Ability Check loaded, but saved gate progress did not load. You can still preview the cards."
              );
            }
          }

          const cards: StudyCard[] = summaryRows
            .map((summary) => {
              const surface = (summary.surface ?? "").trim();
              const reading = (summary.reading ?? "").trim();
              const meaning = (summary.meaning ?? "").trim();
              const encounterCount = summary.total_encounter_count ?? 0;
              const progress = progressWithWordSkyClaim(
                user.id,
                summary.study_identity_key,
                surface,
                reading,
                progressByKey.get(summary.study_identity_key) ?? null,
                claimByKey.get(summary.study_identity_key)
              );

              if (!surface || !reading || !meaning || !summary.sample_user_book_word_id) {
                return null;
              }

              if (colorSettings.skip_katakana_library_check && isKatakanaOnly(surface)) {
                return null;
              }

              const colorStatus = computeLibraryStudyColorStatus({
                encounterCount,
                settings: colorSettings,
                readingGate: progress?.reading_gate_status ?? "not_started",
                meaningGate: progress?.meaning_gate_status ?? "not_started",
                heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
                heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
                readyForReadingGate: isReadyForReadingGateProgress(progress),
                preReadingSupportCycle: preReadingSupportCycle(progress),
                mastered: progress?.mastered ?? false,
              });

              return {
                id: summary.sample_user_book_word_id,
                userBookId: summary.sample_user_book_id ?? "",
                bookTitle: summary.sample_book_title ?? "Untitled",
                bookCoverUrl: summary.sample_book_cover_url ?? null,
                surface,
                reading,
                meaning,
                jlpt: summary.jlpt ?? null,
                encounterCount,
                encounterIds: [summary.sample_user_book_word_id],
                colorStatus,
                activeGate: pickLibraryCheckGate(colorStatus, summary.study_identity_key),
                studyIdentityKey: summary.study_identity_key,
                progress,
                definitionNumber: definitionNumberByWordId.get(summary.sample_user_book_word_id) ?? null,
              };
            })
            .filter((card): card is StudyCard => Boolean(card));

          const summaryCardKeys = new Set(cards.map((card) => card.studyIdentityKey));
          const claimCards = claimRows
            .filter((claim) => !summaryCardKeys.has(claim.study_identity_key))
            .map((claim) => makeClaimStudyCard(user.id, claim, colorSettings, progressByKey))
            .filter((card): card is StudyCard => Boolean(card));
          const allStudyCards = [...cards, ...claimCards];

          setAllCards(allStudyCards);
          setDebugInfo({
            threshold: encounterThreshold,
            rawRows: summaryRows.length,
            completeGroups: summaryRows.length,
            eligibleCards: allStudyCards.length,
            filteredCards: allStudyCards.length,
            topCompleteGroups: summaryRows.slice(0, 8).map((summary) => {
              const surface = summary.surface?.trim() ?? "";
              const reading = summary.reading?.trim() ?? "";
              const progress = progressWithWordSkyClaim(
                user.id,
                summary.study_identity_key,
                surface,
                reading,
                progressByKey.get(summary.study_identity_key) ?? null,
                claimByKey.get(summary.study_identity_key)
              );
              const encounterCount = summary.total_encounter_count ?? 0;
              const status = computeLibraryStudyColorStatus({
                encounterCount,
                settings: colorSettings,
                readingGate: progress?.reading_gate_status ?? "not_started",
                meaningGate: progress?.meaning_gate_status ?? "not_started",
                heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
                heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
                readyForReadingGate: isReadyForReadingGateProgress(progress),
                preReadingSupportCycle: preReadingSupportCycle(progress),
                mastered: progress?.mastered ?? false,
              });

              return {
                surface: summary.surface?.trim() ?? "",
                reading: summary.reading?.trim() ?? "",
                encounters: encounterCount,
                reason: status.reason,
              };
            }),
          });
          return;
        }

        if (summaryErr) {
          console.warn("Library word summaries are not available yet:", summaryErr);
        }

        const words = await loadAllLibraryCheckWords(userBookIds);

        const groupedWords = new Map<string, UserBookWordRow[]>();

        for (const row of words) {
          const surface = row.surface?.trim() ?? "";
          const reading = row.reading?.trim() ?? "";
          const meaning = row.meaning?.trim() ?? "";
          const key = studyIdentityKey(surface, reading);

          if (!surface || !reading || !meaning || !key) continue;

          const group = groupedWords.get(key) ?? [];
          group.push(row);
          groupedWords.set(key, group);
        }

        const progressByKey = new Map<string, LibraryWordProgressRow>();
        const studyKeys = uniqueStrings([
          ...Array.from(groupedWords.entries()).map(([key]) => key),
          ...claimRows.map((row) => row.study_identity_key).filter(Boolean),
        ]);

        if (studyKeys.length > 0) {
          try {
            const loadedProgress = await loadLibraryProgressByKey(user.id, studyKeys);
            for (const [key, row] of loadedProgress.entries()) {
              progressByKey.set(key, row);
            }
          } catch (progressErr) {
            console.warn("Ability Check progress did not load:", progressErr);
            setNotice(
              "Ability Check loaded, but saved gate progress did not load. You can still preview the cards."
            );
          }
        }

        const cards: StudyCard[] = Array.from(groupedWords.entries())
          .map(([key, group]) => {
            const representative = group[0];
            const meta = metaById.get(representative.user_book_id);
            const surface = representative.surface!.trim();
            const reading = representative.reading!.trim();
            const progress = progressWithWordSkyClaim(
              user.id,
              key,
              surface,
              reading,
              progressByKey.get(key) ?? null,
              claimByKey.get(key)
            );

            if (
              colorSettings.skip_katakana_library_check &&
              isKatakanaOnly(representative.surface)
            ) {
              return null;
            }

            const colorStatus = computeLibraryStudyColorStatus({
              encounterCount: group.length,
              settings: colorSettings,
              readingGate: progress?.reading_gate_status ?? "not_started",
              meaningGate: progress?.meaning_gate_status ?? "not_started",
              heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
              heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
              readyForReadingGate: isReadyForReadingGateProgress(progress),
              preReadingSupportCycle: preReadingSupportCycle(progress),
              mastered: progress?.mastered ?? false,
            });

            return {
              id: representative.id,
              userBookId: representative.user_book_id,
              bookTitle: meta?.title ?? "Untitled",
              bookCoverUrl: meta?.cover_url ?? null,
              surface,
              reading,
              meaning: representative.meaning!.trim(),
              jlpt: representative.jlpt ?? null,
              encounterCount: group.length,
              encounterIds: group.map((word) => word.id),
              colorStatus,
              activeGate: pickLibraryCheckGate(colorStatus, key),
              studyIdentityKey: key,
              progress,
              definitionNumber: definitionNumberFromIndex(representative.meaning_choice_index),
            };
          })
          .filter((card): card is StudyCard => Boolean(card));

        const groupedCardKeys = new Set(cards.map((card) => card.studyIdentityKey));
        const claimCards = claimRows
          .filter((claim) => !groupedCardKeys.has(claim.study_identity_key))
          .map((claim) => makeClaimStudyCard(user.id, claim, colorSettings, progressByKey))
          .filter((card): card is StudyCard => Boolean(card));
        const allStudyCards = [...cards, ...claimCards];

        setAllCards(allStudyCards);
        setDebugInfo({
          threshold: encounterThreshold,
          rawRows: words?.length ?? 0,
          completeGroups: groupedWords.size,
          eligibleCards: allStudyCards.length,
          filteredCards: allStudyCards.length,
          topCompleteGroups: Array.from(groupedWords.entries())
            .map(([key, group]) => {
              const representative = group[0];
              const progress = progressWithWordSkyClaim(
                user.id,
                key,
                representative.surface?.trim() ?? "",
                representative.reading?.trim() ?? "",
                progressByKey.get(key) ?? null,
                claimByKey.get(key)
              );
              const status = computeLibraryStudyColorStatus({
                encounterCount: group.length,
                settings: colorSettings,
                readingGate: progress?.reading_gate_status ?? "not_started",
                meaningGate: progress?.meaning_gate_status ?? "not_started",
                heldBeforeReadingGate: progress?.held_before_reading_gate ?? false,
                heldBeforeMeaningGate: progress?.held_before_meaning_gate ?? false,
                readyForReadingGate: isReadyForReadingGateProgress(progress),
                preReadingSupportCycle: preReadingSupportCycle(progress),
                mastered: progress?.mastered ?? false,
              });

              return {
                surface: representative.surface?.trim() ?? "",
                reading: representative.reading?.trim() ?? "",
                encounters: group.length,
                reason: status.reason,
              };
            })
            .sort((a, b) => b.encounters - a.encounters)
            .slice(0, 8),
        });
      } catch (err: any) {
        console.error("Error loading Ability Check:", err);
        setErrorMsg(errorMessage(err) || "Failed to load Ability Check.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (allCards.length === 0 || !dailyCheckPlan) {
      setDeck([]);
      setIndex(0);
      resetCardState();
      setEndedEarly(false);
      return;
    }

    const cardById = new Map(allCards.map((card) => [card.id, card]));
    const savedCards = dedupeCardsByStudyIdentity(
      (dailyCheckPlan.cardIds ?? [])
        .map((id) => cardById.get(id))
        .filter((card): card is StudyCard => Boolean(card))
    );
    const savedCardIds = savedCards.map((card) => card.id);
    const planCardIds =
      savedCardIds.length > 0
        ? savedCardIds
        : buildDailyCheckDeckSource(
          allCards,
          { ...dailyCheckPlan, cardIds: undefined },
          seenTodayIds
        ).map((card) => card.id);

    const nextDeckSource = planCardIds
      .map((id) => cardById.get(id))
      .filter((card): card is StudyCard => Boolean(card))
      .filter((card) => !isCardSeenToday(card, seenTodayIds));

    const planNeedsSave =
      !dailyCheckPlan.cardIds ||
      dailyCheckPlan.cardIds.length !== planCardIds.length ||
      dailyCheckPlan.cardIds.some((id, index) => id !== planCardIds[index]);

    if (planNeedsSave) {
      const planWithCards = {
        ...dailyCheckPlan,
        cardIds: planCardIds,
      };

      saveDailyCheckPlanForToday(planWithCards);
      setDailyCheckPlan(planWithCards);
    }

    setDeck(nextDeckSource);
    setIndex(0);
    resetCardState();
    setEndedEarly(false);

    // Do not include seenTodayIds here.
    // Answering cards should not rebuild the active daily deck.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCards, dailyCheckPlan, activeTodayKey]);

  useEffect(() => {
    setPracticeDeck(shuffleArray(practiceFilteredCards));
    setPracticeIndex(0);
    setPracticeRevealStep("word");
  }, [practiceFilteredCards]);

  useEffect(() => {
    if (!checked) return;
    if (!checked.ok && !typingCorrectionComplete) return;

    const timer = window.setTimeout(() => {
      movePastCurrentCard();
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [checked, typingCorrectionComplete]);

  useEffect(() => {
    if (!checked || libraryMode !== "check") return;
    if (!checked.ok && !typingCorrectionComplete) return;

    function stopEnterAdvance(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("keydown", stopEnterAdvance, true);
    return () => window.removeEventListener("keydown", stopEnterAdvance, true);
  }, [checked, typingCorrectionComplete, libraryMode]);

  useEffect(() => {
    const needsTypingFocus =
      activeStudyMode === "reading_typing" ||
      activeStudyMode === "meaning_typing";

    if (!needsTypingFocus) return;
    if (!currentCard) return;

    const timer = window.setTimeout(() => {
      typingInputRef.current?.focus();
      typingInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeStudyMode, currentCard, index]);

  useEffect(() => {
    if (libraryMode !== "check") return;
    if (endedEarly) return;
    if (deck.length === 0) return;
    if (index < deck.length) return;
    if (deck.length < ABILITY_CHECK_MIN_DUE_CARDS) return;

    markAbilityCheckCompletedToday();
  }, [libraryMode, endedEarly, deck.length, index]);

  function resetCardState() {
    setChecked(null);
    setTypingInput("");
    setTypingCorrectionComplete(false);
  }

  function markStudyCardSeen(card: StudyCard) {
    setSeenTodayIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      next.add(card.studyIdentityKey);
      saveSeenForToday(next);
      return next;
    });
  }

  function toggleSetupLevel(level: DailyCheckLevel) {
    setSetupLevels((prev) => {
      if (prev.includes(level)) {
        return prev.filter((item) => item !== level);
      }

      return [...prev, level];
    });
  }

  function toggleAllSetupLevels() {
    setSetupLevels((prev) => {
      const allLevelsSelected = DAILY_CHECK_LEVELS.every((level) =>
        prev.includes(level)
      );

      if (allLevelsSelected) {
        return [];
      }

      return [...DAILY_CHECK_LEVELS];
    });
  }

  function startDailyCheck() {
    if (setupLevels.length === 0) {
      alert("Please choose at least one level for today’s Ability Check.");
      return;
    }

    const selectedDueCount = setupLevels.reduce(
      (sum, level) => sum + availableCountBySetupLevel[level],
      0
    );

    if (selectedDueCount < ABILITY_CHECK_MIN_DUE_CARDS) {
      setNotice(
        `Ability Check opens when ${ABILITY_CHECK_MIN_DUE_CARDS} or more cards are due. You have ${selectedDueCount} due right now.`
      );
      return;
    }

    const todayKey = getTodayKey();

    const plan: DailyCheckPlan = {
      dateKey: todayKey,
      levels: setupLevels,
      startedAt: new Date().toISOString(),
    };

    saveDailyCheckPlanForToday(plan);

    setDailyCheckPlan(plan);
    setNotice(null);
    setEndedEarly(false);
    setIndex(0);
    resetCardState();
  }

  function resetPracticeReveal() {
    setPracticeRevealStep("word");
  }

  function goToNextPracticeCard() {
    if (practiceDeck.length === 0) return;

    setPracticeIndex((prev) => {
      if (practiceDeck.length <= 1) return prev;
      if (prev + 1 >= practiceDeck.length) return 0;
      return prev + 1;
    });

    resetPracticeReveal();
  }

  function advancePracticeCard() {
    if (practiceRevealStep === "word") {
      setPracticeRevealStep("reading");
      return;
    }

    if (practiceRevealStep === "reading") {
      setPracticeRevealStep("meaning");
      return;
    }

    if (practiceDeck.length <= 1) {
      resetPracticeReveal();
      return;
    }

    setPracticeIndex((prev) => {
      if (prev + 1 >= practiceDeck.length) return 0;
      return prev + 1;
    });

    resetPracticeReveal();
  }

  function goToPreviousPracticeCard() {
    if (practiceDeck.length === 0) return;

    setPracticeIndex((prev) => {
      if (prev <= 0) return practiceDeck.length - 1;
      return prev - 1;
    });
    resetPracticeReveal();
  }

  function shufflePracticeDeck() {
    setPracticeDeck(shuffleArray(practiceFilteredCards));
    setPracticeIndex(0);
    resetPracticeReveal();
  }

  function nextCardWithoutMarkingSeen() {
    if (index + 1 >= deck.length) {
      setIndex(deck.length);
      resetCardState();
      return;
    }

    setIndex((prev) => prev + 1);
    resetCardState();
    setNotice(null);
  }

  function movePastCurrentCard() {
    if (currentCard) {
      markStudyCardSeen(currentCard);
    }
    nextCardWithoutMarkingSeen();
  }

  function finishForToday() {
    setEndedEarly(true);
    setIndex(deck.length);
    resetCardState();
  }

  function finishMeaningReview() {
    setMeaningReviewItems([]);
  }

  function finishPracticeMeaningReview() {
    setMeaningReviewItems([]);
    setShowPracticeMeaningReview(false);
    router.push("/books");
  }

  function queuePracticeMeaningReview(
    card: StudyCard,
    userAnswer: string,
    correctAnswer: string,
    ok: boolean
  ) {
    queueMeaningReview(card, userAnswer, correctAnswer, "practice_meaning_typing", ok);
  }

  function handlePracticeTypingMiss(card: StudyCard, gate: "reading" | "meaning") {
    if (card.colorStatus.color !== "purple") return;

    void saveTypedGateProgress(gate, false, {
      card,
      forceMeaning: gate === "meaning",
    });
  }

  function queueMeaningReview(
    card: StudyCard,
    userAnswer: string,
    correctAnswer: string,
    cardType: string,
    originalOk: boolean
  ) {
    setMeaningReviewItems((prev) => {
      if (prev.some((item) => item.id === `${card.id}:${cardType}`)) return prev;

      return [
        ...prev,
        {
          id: `${card.id}:${cardType}`,
          card,
          userAnswer,
          correctAnswer,
          cardType,
          originalOk,
        },
      ];
    });
  }

  function canComeBackLater(card: StudyCard | undefined) {
    return (
      card?.colorStatus.color === "yellow" &&
      card.colorStatus.nextGate === "reading" &&
      (card.activeGate === "readiness" || card.activeGate === "reading")
    );
  }

  function recordCurrentStudyEvent(
    result: "correct" | "incorrect" | "skipped" | "reviewed",
    isCorrect: boolean | null,
    cardType: string
  ) {
    if (!canUseAbilityCheck) return;
    if (!currentCard) return;

    void recordStudyEvent({
      userBookId:
        (currentCard as any).user_book_id ??
        (currentCard as any).userBookId ??
        null,
      userBookWordId: isClaimCardId(currentCard.id) ? null : currentCard.id,
      studyMode: "study_flashcards",
      cardType,
      result,
      isCorrect,
      surface: currentCard.surface,
      reading: currentCard.reading,
      meaning: currentCard.meaning,
    });
  }

  async function saveTypedGateProgress(
    gate: "reading" | "meaning",
    ok: boolean,
    options: { forceMeaning?: boolean; card?: StudyCard } = {}
  ) {
    const activeCard = options.card ?? currentCard;
    if (!canUseAbilityCheck) return;
    if (!currentUserId || !activeCard) return;

    const now = new Date().toISOString();
    const existing = activeCard.progress;
    const isMasteryCheck =
      activeCard.colorStatus.color === "purple" ||
      Boolean(existing?.mastered);

    if (!options.forceMeaning && activeCard.activeGate !== gate) return;

    const nextProgress: LibraryWordProgressRow = {
      id: existing?.id,
      user_id: currentUserId,
      study_identity_key: activeCard.studyIdentityKey,
      surface: activeCard.surface,
      reading: activeCard.reading,
      definition_key: "",
      reading_gate_status: existing?.reading_gate_status ?? "not_started",
      meaning_gate_status: existing?.meaning_gate_status ?? "not_started",
      held_before_reading_gate: existing?.held_before_reading_gate ?? false,
      held_before_meaning_gate: existing?.held_before_meaning_gate ?? false,
      mastered: existing?.mastered ?? false,
      reading_gate_attempts: existing?.reading_gate_attempts ?? 0,
      meaning_gate_attempts: existing?.meaning_gate_attempts ?? 0,
      reading_gate_passed_at: existing?.reading_gate_passed_at ?? null,
      reading_gate_failed_at: existing?.reading_gate_failed_at ?? null,
      meaning_gate_passed_at: existing?.meaning_gate_passed_at ?? null,
      meaning_gate_failed_at: existing?.meaning_gate_failed_at ?? null,
      mastered_at: existing?.mastered_at ?? null,
      last_studied_at: now,
    };

    if (gate === "reading") {
      nextProgress.reading_gate_status = ok ? "passed" : "failed";
      nextProgress.held_before_reading_gate = false;
      nextProgress.reading_gate_attempts += 1;
      if (ok) {
        nextProgress.reading_gate_passed_at = now;
      } else {
        nextProgress.reading_gate_failed_at = now;
        nextProgress.meaning_gate_status = "not_started";
        nextProgress.meaning_gate_passed_at = null;
        nextProgress.meaning_gate_failed_at = null;
        nextProgress.mastered = false;
        nextProgress.mastered_at = null;
      }
    } else {
      nextProgress.meaning_gate_status = ok ? "passed" : "failed";
      nextProgress.held_before_meaning_gate = false;
      nextProgress.meaning_gate_attempts += 1;
      if (ok) {
        nextProgress.meaning_gate_passed_at = now;
        nextProgress.reading_gate_status = "passed";
        nextProgress.mastered = true;
        nextProgress.mastered_at = now;
      } else {
        nextProgress.meaning_gate_failed_at = now;
        nextProgress.reading_gate_status = "passed";
        nextProgress.mastered = false;
        nextProgress.mastered_at = null;
      }
    }

    if (isMasteryCheck) {
      if (ok) {
        nextProgress.reading_gate_status = "passed";
        nextProgress.meaning_gate_status = "passed";
        nextProgress.mastered = true;
        nextProgress.mastered_at = nextProgress.mastered_at ?? now;
      } else {
        nextProgress.mastered = false;
        nextProgress.mastered_at = null;

        if (gate === "reading") {
          nextProgress.reading_gate_status = "failed";
          nextProgress.meaning_gate_status = "not_started";
          nextProgress.meaning_gate_passed_at = null;
          nextProgress.meaning_gate_failed_at = null;
        } else {
          nextProgress.reading_gate_status = "passed";
          nextProgress.meaning_gate_status = "failed";
        }
      }
    }

    const { error } = await supabase
      .from("user_library_word_progress")
      .upsert(
        {
          user_id: nextProgress.user_id,
          study_identity_key: nextProgress.study_identity_key,
          surface: nextProgress.surface,
          reading: nextProgress.reading,
          definition_key: nextProgress.definition_key,
          reading_gate_status: nextProgress.reading_gate_status,
          meaning_gate_status: nextProgress.meaning_gate_status,
          held_before_reading_gate: nextProgress.held_before_reading_gate,
          held_before_meaning_gate: nextProgress.held_before_meaning_gate,
          mastered: nextProgress.mastered,
          reading_gate_attempts: nextProgress.reading_gate_attempts,
          meaning_gate_attempts: nextProgress.meaning_gate_attempts,
          reading_gate_passed_at: nextProgress.reading_gate_passed_at,
          reading_gate_failed_at: nextProgress.reading_gate_failed_at,
          meaning_gate_passed_at: nextProgress.meaning_gate_passed_at,
          meaning_gate_failed_at: nextProgress.meaning_gate_failed_at,
          mastered_at: nextProgress.mastered_at,
          last_studied_at: nextProgress.last_studied_at,
        },
        { onConflict: "user_id,study_identity_key,definition_key" }
      )
      .select(
        `
          id,
          user_id,
          study_identity_key,
          surface,
          reading,
          definition_key,
          reading_gate_status,
          meaning_gate_status,
          held_before_reading_gate,
          held_before_meaning_gate,
          mastered,
          reading_gate_attempts,
          meaning_gate_attempts,
          reading_gate_passed_at,
          reading_gate_failed_at,
          meaning_gate_passed_at,
          meaning_gate_failed_at,
          mastered_at,
          last_studied_at
        `
      )
      .single<LibraryWordProgressRow>();

    if (error) {
      console.error("Error saving Ability Check gate progress:", error);
      setNotice("Could not save Ability Check gate progress.");
      return;
    }

    // Keep the active card on its original gate for this session.
    // The saved progress is picked up next time, so a word cannot climb twice in one sitting.
  }

  async function comeBackLaterForCurrentCard(waitKind: "soft" | "hard" = "hard") {
    if (!canUseAbilityCheck) return;
    if (!currentUserId || !currentCard || !canComeBackLater(currentCard)) return;

    const existing = currentCard.progress;
    const now = new Date().toISOString();
    const isHardHold = waitKind === "hard";
    const nextSupportAttempt = (existing?.reading_gate_attempts ?? 0) + 1;

    const { data, error } = await supabase
      .from("user_library_word_progress")
      .upsert(
        {
          user_id: currentUserId,
          study_identity_key: currentCard.studyIdentityKey,
          surface: currentCard.surface,
          reading: currentCard.reading,
          definition_key: "",
          reading_gate_status: existing?.reading_gate_status ?? "not_started",
          meaning_gate_status: existing?.meaning_gate_status ?? "not_started",
          held_before_reading_gate: true,
          held_before_meaning_gate: isHardHold,
          mastered: existing?.mastered ?? false,
          reading_gate_attempts: nextSupportAttempt,
          meaning_gate_attempts: existing?.meaning_gate_attempts ?? 0,
          reading_gate_passed_at: existing?.reading_gate_passed_at ?? null,
          reading_gate_failed_at: existing?.reading_gate_failed_at ?? null,
          meaning_gate_passed_at: existing?.meaning_gate_passed_at ?? null,
          meaning_gate_failed_at: existing?.meaning_gate_failed_at ?? null,
          mastered_at: existing?.mastered_at ?? null,
          last_studied_at: now,
        },
        { onConflict: "user_id,study_identity_key,definition_key" }
      )
      .select(
        `
        id,
        user_id,
        study_identity_key,
        surface,
        reading,
        definition_key,
        reading_gate_status,
        meaning_gate_status,
        held_before_reading_gate,
        held_before_meaning_gate,
        mastered,
        reading_gate_attempts,
        meaning_gate_attempts,
        reading_gate_passed_at,
        reading_gate_failed_at,
        meaning_gate_passed_at,
        meaning_gate_failed_at,
        mastered_at,
        last_studied_at
      `
      )
      .single<LibraryWordProgressRow>();

    if (error) {
      console.error("Error holding Ability Check card for later:", error);
      setNotice("Could not hold this word for later.");
      return;
    }

    const heldProgress = data ?? {
      ...(existing ?? {}),
      user_id: currentUserId,
      study_identity_key: currentCard.studyIdentityKey,
      surface: currentCard.surface,
      reading: currentCard.reading,
      definition_key: "",
      reading_gate_status: existing?.reading_gate_status ?? "not_started",
      meaning_gate_status: existing?.meaning_gate_status ?? "not_started",
      held_before_reading_gate: true,
      held_before_meaning_gate: isHardHold,
      mastered: existing?.mastered ?? false,
      reading_gate_attempts: nextSupportAttempt,
      meaning_gate_attempts: existing?.meaning_gate_attempts ?? 0,
      reading_gate_passed_at: existing?.reading_gate_passed_at ?? null,
      reading_gate_failed_at: existing?.reading_gate_failed_at ?? null,
      meaning_gate_passed_at: existing?.meaning_gate_passed_at ?? null,
      meaning_gate_failed_at: existing?.meaning_gate_failed_at ?? null,
      mastered_at: existing?.mastered_at ?? null,
      last_studied_at: now,
    } as LibraryWordProgressRow;

    setAllCards((prev) =>
      prev.map((card) =>
        card.studyIdentityKey === currentCard.studyIdentityKey
          ? {
            ...card,
            progress: heldProgress,
            colorStatus: computeLibraryStudyColorStatus({
              encounterCount: card.encounterCount,
              settings: learningSettings,
              readingGate: heldProgress.reading_gate_status,
              meaningGate: heldProgress.meaning_gate_status,
              heldBeforeReadingGate: true,
              heldBeforeMeaningGate: isHardHold,
              readyForReadingGate: false,
              preReadingSupportCycle: preReadingSupportCycle(heldProgress),
              mastered: heldProgress.mastered,
            }),
          }
          : card
      )
    );

    markStudyCardSeen(currentCard);
    nextCardWithoutMarkingSeen();
  }

  async function moveCurrentCardToReadingGate() {
    if (!canUseAbilityCheck) return;
    if (!currentUserId || !currentCard || currentCard.activeGate !== "readiness") return;

    const existing = currentCard.progress;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("user_library_word_progress")
      .upsert(
        {
          user_id: currentUserId,
          study_identity_key: currentCard.studyIdentityKey,
          surface: currentCard.surface,
          reading: currentCard.reading,
          definition_key: "",
          reading_gate_status: "not_started",
          meaning_gate_status: "not_started",
          held_before_reading_gate: false,
          held_before_meaning_gate: false,
          mastered: false,
          reading_gate_attempts: existing?.reading_gate_attempts ?? 0,
          meaning_gate_attempts: existing?.meaning_gate_attempts ?? 0,
          reading_gate_passed_at: existing?.reading_gate_passed_at ?? null,
          reading_gate_failed_at: existing?.reading_gate_failed_at ?? null,
          meaning_gate_passed_at: null,
          meaning_gate_failed_at: null,
          mastered_at: null,
          last_studied_at: now,
        },
        { onConflict: "user_id,study_identity_key,definition_key" }
      )
      .select(
        `
        id,
        user_id,
        study_identity_key,
        surface,
        reading,
        definition_key,
        reading_gate_status,
        meaning_gate_status,
        held_before_reading_gate,
        held_before_meaning_gate,
        mastered,
        reading_gate_attempts,
        meaning_gate_attempts,
        reading_gate_passed_at,
        reading_gate_failed_at,
        meaning_gate_passed_at,
        meaning_gate_failed_at,
        mastered_at,
        last_studied_at
      `
      )
      .single<LibraryWordProgressRow>();

    if (error) {
      console.error("Error moving Ability Check card to reading gate:", error);
      setNotice("Could not move this word to the Reading Gate.");
      return;
    }

    const readyProgress = data;

    if (!readyProgress) {
      setNotice("Could not move this word to the Reading Gate.");
      return;
    }

    const updateCard = (card: StudyCard): StudyCard => {
      if (card.studyIdentityKey !== currentCard.studyIdentityKey) return card;

      const colorStatus = computeLibraryStudyColorStatus({
        encounterCount: card.encounterCount,
        settings: learningSettings,
        readingGate: readyProgress.reading_gate_status,
        meaningGate: readyProgress.meaning_gate_status,
        heldBeforeReadingGate: readyProgress.held_before_reading_gate,
        heldBeforeMeaningGate: readyProgress.held_before_meaning_gate,
        readyForReadingGate: isReadyForReadingGateProgress(readyProgress),
        preReadingSupportCycle: preReadingSupportCycle(readyProgress),
        mastered: readyProgress.mastered,
      });

      return {
        ...card,
        progress: readyProgress,
        colorStatus,
        activeGate: pickLibraryCheckGate(colorStatus, card.studyIdentityKey),
      };
    };

    setAllCards((prev) => prev.map(updateCard));
    markStudyCardSeen(currentCard);
    nextCardWithoutMarkingSeen();
    resetCardState();
    setNotice(null);
  }

  async function countMeaningReviewAsPassed(item: MeaningReviewItem) {
    await saveTypedGateProgress("meaning", true, { forceMeaning: true, card: item.card });
    setMeaningReviewItems((prev) => prev.filter((review) => review.id !== item.id));
  }

  function keepMeaningReviewMissed(item: MeaningReviewItem) {
    setMeaningReviewItems((prev) => prev.filter((review) => review.id !== item.id));
  }

  async function countMeaningReviewAsMissed(item: MeaningReviewItem) {
    await saveTypedGateProgress("meaning", false, { forceMeaning: true, card: item.card });
    setMeaningReviewItems((prev) => prev.filter((review) => review.id !== item.id));
  }

  function checkTypingSingle() {
    if (!currentCard) return;

    if (checked && !checked.ok) {
      const correctionOk =
        activeStudyMode === "reading_typing"
          ? normalizeKana(typingInput) === normalizeKana(checked.correct)
          : matchesAnyMeaning(typingInput, checked.correct);

      if (!correctionOk) {
        setTypingInput("");
        setNotice(
          activeStudyMode === "reading_typing"
            ? "Retype the reading once to continue."
            : `Retype "${shortMeaningRetypeHint(checked.correct)}" from the meaning to continue.`
        );
        return;
      }

      setTypingInput("");
      setTypingCorrectionComplete(true);
      setNotice(null);
      return;
    }

    if (checked) return;

    const currentStudyMode = activeStudyMode;
    let correct = currentCard.reading;
    let ok = false;

    if (currentStudyMode === "reading_typing") {
      correct = currentCard.reading;
      ok = normalizeKana(typingInput) === normalizeKana(correct);
    } else if (currentStudyMode === "meaning_typing") {
      correct = currentCard.meaning;
      ok = matchesAnyMeaning(typingInput, correct);
    }

    if (currentStudyMode === "meaning_typing") {
      queueMeaningReview(currentCard, typingInput.trim(), correct, currentStudyMode, ok);
    }

    setChecked({ ok, correct });
    if (!ok) {
      setTypingInput("");
      window.requestAnimationFrame(() => typingInputRef.current?.focus());
    }
    markStudyCardSeen(currentCard);

    recordCurrentStudyEvent(
      ok ? "correct" : "incorrect",
      ok,
      currentStudyMode
    );

    if (currentStudyMode === "reading_typing") {
      void saveTypedGateProgress("reading", ok);
    } else if (currentStudyMode === "meaning_typing") {
      void saveTypedGateProgress("meaning", ok);
    }
  }

  async function flagCurrentCard() {
    if (!canUseAbilityCheck) return;
    if (!currentCard) return;

    const ok = window.confirm("Hide this card from study?");
    if (!ok) return;

    if (isClaimCardId(currentCard.id)) {
      const { error } = await supabase
        .from("user_library_word_claims")
        .delete()
        .eq("user_id", currentUserId)
        .eq("study_identity_key", currentCard.studyIdentityKey);

      if (error) {
        console.error("Error hiding Word Sky claim:", error);
        alert(`Could not flag card.\n${error.message}`);
        return;
      }

      setAllCards((prev) => prev.filter((card) => card.id !== currentCard.id));
      setNotice("Word Sky claim removed from study.");
      return;
    }

    const { error } = await supabase
      .from("user_book_words")
      .update({ hidden: true })
      .eq("id", currentCard.id);

    if (error) {
      console.error("Error hiding study card:", error);
      alert(`Could not flag card.\n${error.message}`);
      return;
    }

    setAllCards((prev) => prev.filter((card) => card.id !== currentCard.id));
    setNotice("Card hidden from study.");
  }

  if (loading) {
    return <AbilityCheckLoadingState />;
  }

  if (needsSignIn) {
    return (
      <AbilityCheckNeedsSignInState
        onGoToLogin={() => router.push("/login")}
      />
    );
  }

  if (fullAccessLocked) {
    const copy = getFullAccessRequiredCopy("ability_check");

    return (
      <AbilityCheckFullAccessLockedState
        title={copy.title}
        message={copy.message}
        onBackToLibrary={() => router.push("/books")}
        onViewStats={() => router.push("/community/stats")}
      />
    );
  }

  if (errorMsg) {
    return (
      <AbilityCheckErrorState
        message={errorMsg}
        onBackToLibrary={() => router.push("/books")}
      />
    );
  }

  if (allCards.length === 0) {
    return (
      <AbilityCheckNoCardsState
        onOpenWordSky={() => router.push("/library-study/word-sky")}
        onBackToLibrary={() => router.push("/books")}
      />
    );
  }

  if (libraryMode === "check" && !dailyCheckPlan) {
    const allLevelsSelected = DAILY_CHECK_LEVELS.every((level) =>
      setupLevels.includes(level)
    );

    const selectedDueCount = setupLevels.reduce(
      (sum, level) => sum + availableCountBySetupLevel[level],
      0
    );

    if (allLevelsDueCount < ABILITY_CHECK_MIN_DUE_CARDS) {
      return (
        <AbilityCheckRestingState
          dueCount={allLevelsDueCount}
          minDueCards={ABILITY_CHECK_MIN_DUE_CARDS}
          hasPracticeCards={practiceFilteredCards.length > 0}
          onOpenPractice={() => router.push("/library-study/practice")}
          onOpenWordSky={() => router.push("/library-study/word-sky")}
          onOpenPurpleReview={() => router.push("/library-study/practice?color=purple")}
          onOpenBookFlashcards={() => router.push("/library-study/book-flashcards")}
        />
      );
    }

    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Daily Ability Check
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Choose today’s check
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Pick one or more levels. Once you start, your levels and card count are locked for today.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            Don’t worry about checking this on your own. Mekuru will alert you from your Library
            when enough Ability Check cards are ready.
          </div>

          <div className="mt-5">
            <AbilityCheckFaq />
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Levels</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Choose one or more levels for today’s official check. Ability Check only uses cards due today.
            </p>

            <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center shadow-sm">
              <div className="text-sm font-black text-emerald-950">
                Your {allLevelsDueCount} Ability Check cards are ready.
              </div>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Select the levels you want to include, then start today’s check.
              </p>
            </div>

            <label
              className={`mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${allLevelsSelected
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allLevelsSelected}
                  onChange={toggleAllSetupLevels}
                  className="h-4 w-4 accent-slate-900"
                />
                <span className="font-black">All Levels</span>
              </span>

              <span className={`text-xs ${allLevelsSelected ? "text-white/70" : "text-slate-400"}`}>
                {allLevelsDueCount} due today
              </span>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DAILY_CHECK_LEVELS.map((level) => {
                const selected = setupLevels.includes(level);
                const availableCount = availableCountBySetupLevel[level];

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleSetupLevel(level)}
                    className={`rounded-2xl border px-4 py-3 text-sm transition ${selected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                  >
                    <div className="font-black">{level}</div>
                    <div className={`mt-1 text-xs ${selected ? "text-white/75" : "text-slate-400"}`}>
                      {availableCount} due today
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              The reminder clears after you finish at least {ABILITY_CHECK_MIN_DUE_CARDS} due cards.
            </p>
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Strict due cards</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Ability Check gives you the cards that are due today for the levels you choose. If you leave before finishing, Mekuru keeps your place and the reminder stays on until at least 10 cards are completed.
            </p>
          </section>

          <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
            <div>Want more study after the strict check?</div>
            <div>
              Use Library Review or book flashcards for extra practice that does not move colors.
              Use Word Sky to add easier words to the Reading Gate.
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={startDailyCheck}
              disabled={setupLevels.length === 0}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-black disabled:opacity-40"
            >
              {selectedDueCount > 0 ? `Start ${selectedDueCount} Card Check` : "Start Ability Check"}
            </button>

            {practiceFilteredCards.length > 0 ? (
              <button
                type="button"
                onClick={() => router.push("/library-study/practice")}
                className="rounded-2xl border border-sky-200 bg-green-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
              >
                Open Library Review
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => router.push("/library-study/word-sky")}
              className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
            >
              Open Word Sky
            </button>
            <button
              type="button"
              onClick={() => router.push("/library-study/book-flashcards")}
              className="rounded-2xl border border-violet-200 bg-violet-100 px-5 py-3 text-sm font-semibold text-violet-950 shadow-sm transition hover:bg-violet-50"
            >
              Open Book Flashcards
            </button>

            <button
              type="button"
              onClick={() => router.push("/books")}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Library
            </button>
          </div>
        </div>
      </main >
    );
  }

  if (libraryMode === "check" && deck.length === 0 && filteredCards.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Strict due cards
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Ability Check</h1>

          <p className="mt-3 text-gray-600">
            No cards are due for today’s Ability Check.
          </p>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
            That is normal. Ability Check opens when at least {ABILITY_CHECK_MIN_DUE_CARDS} cards
            are due, and it becomes more regularly available after you read and save a lot of words
            or add comfortable words from Word Sky. If you want to study now, try one of these
            other study options.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {practiceFilteredCards.length > 0 ? (
              <button
                type="button"
                onClick={() => router.push("/library-study/practice")}
                className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
              >
                Open Library Review
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => router.push("/library-study/word-sky")}
              className="rounded-2xl border border-amber-200 bg-amber-100 px-5 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50"
            >
              Word Sky
            </button>
            <button
              type="button"
              onClick={() => router.push("/library-study/practice?color=purple")}
              className="rounded-2xl border border-violet-200 bg-violet-100 px-5 py-3 text-sm font-semibold text-violet-950 shadow-sm transition hover:bg-violet-50"
            >
              久しぶり Review
            </button>
            <button
              type="button"
              onClick={() => router.push("/library-study/book-flashcards")}
              className="rounded-2xl border border-emerald-200 bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50"
            >
              Book Flashcards
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (
    libraryMode === "practice" &&
    showPracticeMeaningReview &&
    meaningReviewItems.length > 0
  ) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
              久しぶり Review
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Review meaning answers
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Regular review does not move colors. Purple review can move forgotten words back to the gate they need.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {meaningReviewItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-2xl font-semibold text-slate-950">
                      {item.card.surface}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{item.card.reading}</div>
                  </div>
                  <div
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.originalOk
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                      }`}
                  >
                    {item.originalOk ? "Matched" : "Moved back if Purple"}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-white px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Your answer
                    </div>
                    <div className="mt-1 text-slate-900">{item.userAnswer || "—"}</div>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Saved meaning
                    </div>
                    <div className="mt-1 text-slate-900">{item.correctAnswer}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={finishPracticeMeaningReview}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-black"
            >
              Finish Review
            </button>

            <button
              type="button"
              onClick={() => setShowPracticeMeaningReview(false)}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to practice
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (
    libraryMode === "check" &&
    index >= deck.length &&
    meaningReviewItems.length > 0
  ) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Meaning Review
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Review meaning answers
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Correct answers are already saved. For missed answers, change the result only if the app was too strict.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {meaningReviewItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-2xl font-semibold text-slate-950">
                      {item.card.surface}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{item.card.reading}</div>
                    <div
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.originalOk
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                        }`}
                    >
                      App marked: {item.originalOk ? "passed" : "missed"}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Your answer
                        </div>
                        <div className="mt-1 text-slate-900">{item.userAnswer || "—"}</div>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Saved meaning
                        </div>
                        <div className="mt-1 text-slate-900">{item.correctAnswer}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid shrink-0 gap-2 sm:grid-cols-2 md:w-[260px] md:grid-cols-1">
                    {item.originalOk ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                        Marked as passed
                        <div className="mt-1 text-xs font-normal text-emerald-700">
                          No action needed
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void countMeaningReviewAsPassed(item)}
                          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Count as passed
                        </button>

                        <button
                          type="button"
                          onClick={() => keepMeaningReviewMissed(item)}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Keep as missed
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={finishMeaningReview}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-black"
            >
              Finish Review
            </button>

            <button
              type="button"
              onClick={() => router.push("/books")}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Library
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (libraryMode === "check" && index >= deck.length) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6">
        <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          {!endedEarly ? (
            <>
              <span className="pointer-events-none absolute left-10 top-8 h-2 w-2 animate-[dailySpark_1000ms_ease-out_forwards] rounded-full bg-emerald-300" />
              <span className="pointer-events-none absolute right-12 top-10 h-2 w-2 animate-[dailySpark_1100ms_ease-out_120ms_forwards] rounded-full bg-sky-300" />
              <span className="pointer-events-none absolute bottom-12 left-1/2 h-1.5 w-1.5 animate-[dailySpark_950ms_ease-out_200ms_forwards] rounded-full bg-amber-300" />
            </>
          ) : null}

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl shadow-sm">
            {endedEarly ? "✓" : "★"}
          </div>

          <h1 className="mt-4 text-2xl font-black text-slate-950">
            {endedEarly ? "Saved your place" : "Daily Ability Check complete"}
          </h1>

          {endedEarly ? (
            <>
              <p className="mt-3 text-gray-700">You gave your library some practice.</p>
              <p className="mt-2 text-sm text-gray-500">
                Your reminder will stay on until you finish today’s check.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-gray-700">
                You finished the cards available today.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Ability Check stays strict. Use another study space if you want more practice.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push("/books")}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Library
            </button>
            <button
              type="button"
              onClick={() => router.push("/library-study/practice")}
              className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
            >
              Open Library Review
            </button>
            <button
              type="button"
              onClick={() => router.push("/library-study/practice?color=purple")}
              className="rounded-2xl border border-violet-200 bg-violet-100 px-5 py-3 text-sm font-semibold text-violet-950 shadow-sm transition hover:bg-violet-50"
            >
              久しぶり Review
            </button>
            <button
              type="button"
              onClick={() => router.push("/library-study/word-sky")}
              className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
            >
              Open Word Sky
            </button>
            <button
              type="button"
              onClick={() => router.push("/library-study/book-flashcards")}
              className="rounded-2xl border border-emerald-200 bg-emerald-100 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50"
            >
              Open Book Flashcards
            </button>
          </div>

          <style jsx>{`
            @keyframes dailySpark {
              0% {
                opacity: 0;
                transform: scale(0.2);
                box-shadow:
                  0 0 0 0 currentColor,
                  0 0 0 0 currentColor,
                  0 0 0 0 currentColor;
              }
              35% {
                opacity: 1;
              }
              100% {
                opacity: 0;
                transform: scale(1.15);
                box-shadow:
                  16px -10px 0 -1px currentColor,
                  -14px -8px 0 -1px currentColor,
                  2px 16px 0 -1px currentColor;
              }
            }
          `}</style>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-100 px-4 py-4 sm:px-6">
      <div className="mb-3 flex w-full max-w-3xl flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Ability Check</h1>
      </div>

      <div className="mb-2 w-full max-w-3xl space-y-2">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Ability Check
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                A daily gate check for Yellow, Green, and Blue words.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Don’t worry about checking this on your own. Mekuru will alert you from your
                Library when enough cards are ready.
              </p>
              {deck.length > 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Today’s set: {checkSessionSummaryText(deck)}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => router.push("/library-study/practice")}
              className="rounded-2xl border border-sky-200 bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
            >
              Open Library Review
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/library-study/word-sky")}
          className="w-full rounded-2xl border border-sky-100 bg-[#f5fbff] px-4 py-3 text-left shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-sky-950">
                Need more words, or bogged down with difficult words?
              </div>
              <div className="text-xs leading-5 text-slate-500">
                Add easier words you may not need to look up in a book to your study.
              </div>
            </div>
            <div className="text-sm font-semibold text-sky-900">Open Word Sky</div>
          </div>
        </button>

        <AbilityCheckFaq />

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {libraryMode === "practice" ? "Practice Progress" : "Session Progress"}
              </p>
              <p className="text-base font-semibold text-slate-800">
                Card{" "}
                {libraryMode === "practice"
                  ? `${practiceDeck.length > 0 ? practiceIndex + 1 : 0}/${practiceDeck.length}`
                  : `${index + 1}/${deck.length}`}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {libraryMode === "practice" ? "Practice Pool" : "Cards Left"}
              </p>
              <p className="text-base font-semibold text-slate-800">
                {libraryMode === "practice"
                  ? practiceDeck.length
                  : Math.max(deck.length - index, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            {libraryMode === "practice" ? (
              <select
                value={selectedJlpt}
                onChange={(e) => setSelectedJlpt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All Levels</option>
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
                <option value="NON-JLPT">NON-JLPT</option>
              </select>
            ) : (
              <div className="flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                Today’s levels: {dailyCheckPlan ? dailyCheckLevelsLabel(dailyCheckPlan.levels) : "Not started"}
              </div>
            )}

            {libraryMode === "practice" ? (
              <select
                value={practiceColorFilter}
                onChange={(e) =>
                  setPracticeColorFilter(e.target.value as PracticeColorFilter)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All Colors</option>
                <option value="red">Red</option>
                <option value="orange">Orange</option>
                <option value="yellow">Yellow</option>
                <option value="green">Green</option>
                <option value="blue">Blue</option>
                <option value="purple">Purple</option>
                <option value="grey">Limbo</option>
                <option value="katakana">Katakana</option>
              </select>
            ) : null}

            {libraryMode === "practice" ? (
              <div className="grid shrink-0 grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setPracticeStudyMode("reveal")}
                  className={`rounded-lg px-3 py-2 transition ${practiceStudyMode === "reveal"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500"
                    }`}
                >
                  Reveal
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeStudyMode("typing")}
                  className={`rounded-lg px-3 py-2 transition ${practiceStudyMode === "typing"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500"
                    }`}
                >
                  Typing
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
                Daily gate check
              </div>
            )}
          </div>
        </div>
      </div>

      {libraryMode === "practice" ? (
        <LibraryPracticePanel
          card={practiceCard}
          total={practiceDeck.length}
          revealStep={practiceRevealStep}
          practiceMode={practiceStudyMode}
          onAdvance={advancePracticeCard}
          onNext={goToNextPracticeCard}
          onPrevious={goToPreviousPracticeCard}
          onShuffle={shufflePracticeDeck}
          onMeaningAnswered={queuePracticeMeaningReview}
          onTypingMissed={handlePracticeTypingMiss}
          meaningReviewCount={meaningReviewItems.length}
          onReviewMeanings={() => setShowPracticeMeaningReview(true)}
        />
      ) : (
        <>
          <div className={libraryStudyCardClass(currentCard?.colorStatus)}>
            {currentCard ? (
              <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4 sm:gap-3">
                <div className={gatePromptClass(currentCard)}>
                  {gatePromptText(currentCard)}
                </div>

                <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2">
                  <div className="rounded-full border border-slate-100 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm sm:px-3 sm:py-1.5 sm:text-sm">
                    <span
                      className={`mr-1 inline-block h-2.5 w-2.5 rounded-full sm:mr-1.5 sm:h-5 sm:w-5 ${libraryStudyDotClass(
                        currentCard.colorStatus
                      )}`}
                    />
                    {libraryStudyColorName(currentCard.colorStatus)}
                  </div>
                  {isKatakanaOnly(currentCard.surface) ? <KatakanaBadge /> : null}
                </div>
              </div>
            ) : null}

            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 sm:bottom-4 sm:left-4 sm:gap-2">
              {definitionLabel(currentCard) ? (
                <div className={libraryStudyChipClass(currentCard?.colorStatus)}>
                  {definitionLabel(currentCard)}
                </div>
              ) : null}
            </div>

            {currentCard ? (
              <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-1.5 sm:bottom-4 sm:right-4 sm:gap-2">
                <div className={libraryStudyChipClass(currentCard.colorStatus)}>
                  Read {currentCard.encounterCount}x
                </div>
              </div>
            ) : null}

            <div className="flex w-full flex-col items-center gap-6 pt-12 pb-10">
              {currentCard?.activeGate === "readiness" ? (
                <>
                  <div className={promptModeClass("readiness")}>
                    READINESS
                  </div>
                  <div className="text-center text-5xl font-bold leading-tight">
                    {currentCard.surface}
                  </div>
                  <p className="max-w-md text-center text-sm leading-6 text-slate-500">
                    Does this word feel ready for a real reading check?
                  </p>
                  <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void moveCurrentCardToReadingGate()}
                      className="rounded-2xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950 shadow-sm transition hover:bg-emerald-50"
                    >
                      Ready for Reading Gate
                    </button>
                    <button
                      type="button"
                      onClick={() => void comeBackLaterForCurrentCard("hard")}
                      className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Not yet
                      <span className="mt-1 block text-[10px] font-normal text-slate-500">
                        Give it more reading support
                      </span>
                    </button>
                  </div>
                </>
              ) : null}

              {currentCard?.activeGate !== "readiness" && activeStudyMode === "reading_typing" && (
                <>
                  <div className={promptModeClass("reading")}>
                    READING
                  </div>
                  <div className="text-5xl font-bold">{currentCard?.surface}</div>
                </>
              )}

              {currentCard?.activeGate !== "readiness" && activeStudyMode === "meaning_typing" && (
                <>
                  <div className={promptModeClass("meaning")}>
                    MEANING
                  </div>
                  <div className="text-5xl font-bold">{currentCard?.surface}</div>
                  <div className="text-lg text-slate-500">{currentCard?.reading}</div>
                </>
              )}

              {currentCard?.activeGate !== "readiness" && (
                <div className="w-full max-w-sm">
                  {activeStudyMode === "reading_typing" ? (
                    <p className="mb-2 text-center text-xs text-gray-500">
                      <span className="inline sm:whitespace-nowrap">Kana is best; </span>
                      <span className="inline sm:whitespace-nowrap">Hepburn romaji also works</span>
                    </p>
                  ) : null}

                  <input
                    ref={typingInputRef}
                    value={typingInput}
                    onChange={(e) => setTypingInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;

                      e.preventDefault();
                      e.stopPropagation();

                      if (!checked || !checked.ok) {
                        checkTypingSingle();
                      }
                    }}
                    placeholder={
                      activeStudyMode === "reading_typing"
                        ? "Type kana or Hepburn romaji"
                        : "Type the meaning"
                    }
                    inputMode="text"
                    autoCorrect="off"
                    autoCapitalize="none"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded border px-4 py-3 text-base"
                    disabled={!!checked && checked.ok}
                  />

                  {currentInstructionText ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-center text-sm font-semibold text-stone-700">
                      {currentInstructionText}
                    </div>
                  ) : null}

                  {!checked ? (
                    <div className="mt-3 flex flex-col justify-center gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={checkTypingSingle}
                        className="rounded bg-gray-700 px-4 py-2 text-white"
                      >
                        Check
                      </button>

                      {canComeBackLater(currentCard) ? (
                        <button
                          type="button"
                          onClick={() => void comeBackLaterForCurrentCard("hard")}
                          className="rounded border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Send back to Red support
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              {checked ? (
                <div className="mt-2 w-full max-w-sm text-center text-sm">
                  {checked.ok && activeStudyMode === "meaning_typing" ? (
                    <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-950 shadow-sm">
                      <span className="pointer-events-none absolute left-5 top-4 h-2 w-2 animate-[purpleBurst_900ms_ease-out_forwards] rounded-full bg-violet-400 shadow-[0_0_0_0_rgba(139,92,246,0.6)]" />
                      <span className="pointer-events-none absolute right-8 top-5 h-1.5 w-1.5 animate-[purpleBurst_1000ms_ease-out_120ms_forwards] rounded-full bg-fuchsia-300 shadow-[0_0_0_0_rgba(217,70,239,0.55)]" />
                      <span className="pointer-events-none absolute bottom-5 left-1/2 h-1.5 w-1.5 animate-[purpleBurst_950ms_ease-out_220ms_forwards] rounded-full bg-amber-200 shadow-[0_0_0_0_rgba(251,191,36,0.5)]" />
                      <div className="text-lg font-black">This word became Purple!</div>
                      <div className="mt-1 text-xs text-violet-700">
                        Mastered words leave normal Ability Check.
                      </div>
                      <style jsx>{`
                        @keyframes purpleBurst {
                          0% {
                            opacity: 0;
                            transform: scale(0.2);
                            box-shadow:
                              0 0 0 0 currentColor,
                              0 0 0 0 currentColor,
                              0 0 0 0 currentColor;
                          }
                          35% {
                            opacity: 1;
                          }
                          100% {
                            opacity: 0;
                            transform: scale(1.2);
                            box-shadow:
                              18px -10px 0 -1px currentColor,
                              -16px -8px 0 -1px currentColor,
                              2px 18px 0 -1px currentColor;
                          }
                        }
                      `}</style>
                    </div>
                  ) : checked.ok ? (
                    <p className="text-green-700">Correct!</p>
                  ) : (
                    <>
                      <p className="text-red-700">Not quite.</p>
                      <p className="mt-1 text-gray-600">Correct answer: {checked.correct}</p>
                    </>
                  )}

                  <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
                    <div className="text-lg font-semibold">{currentCard?.surface}</div>
                    <div className="mt-1 text-sm text-slate-500">{currentCard?.reading}</div>
                    <div className="mt-1 text-sm text-slate-700">{currentCard?.meaning}</div>
                    <div className="mt-2 text-xs text-slate-500">From: {currentCard?.bookTitle}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2 w-full max-w-2xl space-y-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:justify-between">
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Check Mode
                    </div>

                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {checkModeLabel(currentCard)}
                    </div>

                    <p className="mt-1 truncate text-xs text-gray-600">
                      {checkModeDescription(currentCard)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 md:w-[180px]">
                  <button
                    type="button"
                    onClick={finishForToday}
                    className="min-h-[74px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <div className="leading-tight">Finish early</div>
                    <div className="text-[10px] font-normal text-slate-500">
                      {meaningReviewItems.length > 0
                        ? "Review meaning answers"
                        : "Save your place"}
                    </div>
                  </button>

                  {canComeBackLater(currentCard) ? (
                    <button
                      type="button"
                      onClick={() => void comeBackLaterForCurrentCard("hard")}
                      className="min-h-[74px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <div className="leading-tight">Too hard for now</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        Red support · 90 days
                      </div>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={flagCurrentCard}
                    className="min-h-[74px] w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                  >
                    <div className="leading-tight">Flag</div>
                    <div className="text-[10px] font-normal text-amber-700">
                      Problem card
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
