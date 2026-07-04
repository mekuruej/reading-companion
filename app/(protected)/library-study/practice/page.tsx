// Library Study
// 

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  computeLibraryStudyColorStatus,
  type LibraryStudyGateStatus,
  type LibraryStudyColorStatus,
} from "@/lib/libraryStudyColor";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
  canUseFullAccessFeature,
  getFullAccessRequiredCopy,
} from "@/lib/access/requireFullAccess";
import { supabase } from "@/lib/supabaseClient";
import LibraryReviewProgressCard from "./components/LibraryReviewProgressCard";
import LibraryPracticeFilterPanel from "./components/LibraryPracticeFilterPanel";
import LibraryPracticeCompleteCard from "./components/LibraryPracticeCompleteCard";
import LibraryReviewEmptyState from "./components/LibraryReviewEmptyState";
import LibraryReviewLoadingState from "./components/LibraryReviewLoadingState";
import LibraryReviewNeedsSignInState from "./components/LibraryReviewNeedsSignInState";
import LibraryReviewErrorState from "./components/LibraryReviewErrorState";
import LibraryReviewFullAccessLockedState from "./components/LibraryReviewFullAccessLockedState";
import LibraryReviewPageHeader from "./components/LibraryReviewPageHeader";
import PracticeMeaningReviewScreen from "./components/PracticeMeaningReviewScreen";
import LibraryPracticeCardBadges from "./components/LibraryPracticeCardBadges";
import LibraryPracticeNoCardsState from "./components/LibraryPracticeNoCardsState";
import LibraryPracticeModeSelector from "./components/LibraryPracticeModeSelector";

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
  library_check_daily_limit?: number | null;
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
  hidden_encounter_count: number | null;
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

type LibraryCheckGate = "reading" | "meaning";

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

type ProfileRole = "teacher" | "super_teacher" | "member" | "student";
type PracticeRevealStep = "word" | "reading" | "meaning";
type PracticeStudyMode = "reveal" | "typing";
type PracticeTypingStep = "reading" | "meaning";
type PracticeTypingAdvance = "meaning" | "next";
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

const LIBRARY_PRACTICE_LAST_FIRST_CARD_KEY = "library-practice-last-first-card";
const LIBRARY_PROGRESS_KEY_BATCH_SIZE = 75;
const LIBRARY_REVIEW_AUTO_ADVANCE_MS = 3000;
const LIBRARY_CHECK_WORD_PAGE_SIZE = 1000;

function nextPracticeStudyMode(mode: PracticeStudyMode): PracticeStudyMode {
  return mode === "reveal" ? "typing" : "reveal";
}

function practiceStudyModeLabel(mode: PracticeStudyMode) {
  return mode === "reveal" ? "Reveal" : "Typing";
}

const DEFAULT_LEARNING_SETTINGS: LearningSettingsRow = {
  red_stages: 1,
  orange_stages: 1,
  yellow_stages: 1,
  show_badge_numbers: true,
  skip_katakana_library_check: true,
  library_check_daily_limit: 20,
};

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rememberFirstPracticeCard(cards: StudyCard[]) {
  if (typeof window === "undefined" || !cards[0]) return;

  try {
    window.localStorage.setItem(
      LIBRARY_PRACTICE_LAST_FIRST_CARD_KEY,
      cards[0].id
    );
  } catch {
    // ignore localStorage failures
  }
}

function avoidRepeatingFirstPracticeCard(cards: StudyCard[]) {
  if (typeof window === "undefined" || cards.length <= 1) return cards;

  try {
    const lastFirstCardId = window.localStorage.getItem(
      LIBRARY_PRACTICE_LAST_FIRST_CARD_KEY
    );

    if (!lastFirstCardId || cards[0]?.id !== lastFirstCardId) {
      return cards;
    }

    const replacementIndex = cards.findIndex(
      (card, index) => index > 0 && card.id !== lastFirstCardId
    );

    if (replacementIndex <= 0) return cards;

    const nextCards = [...cards];
    const [replacementCard] = nextCards.splice(replacementIndex, 1);
    nextCards.unshift(replacementCard);
    return nextCards;
  } catch {
    return cards;
  }
}

function buildShuffledPracticeDeck(cards: StudyCard[]) {
  const deck = avoidRepeatingFirstPracticeCard(shuffleArray(cards));
  rememberFirstPracticeCard(deck);
  return deck;
}

function normalizeText(value: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeKana(value: string) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
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
  if (progressDefinition) {
    return progressDefinition === "1"
      ? "Primary definition"
      : `Definition ${progressDefinition}`;
  }
  if (card?.definitionNumber != null) {
    return card.definitionNumber === 1
      ? "Primary definition"
      : `Definition ${card.definitionNumber}`;
  }
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

async function loadAllLibraryWordSummaries(userId: string) {
  const allRows: LibraryWordSummaryRow[] = [];
  let from = 0;

  while (true) {
    const to = from + LIBRARY_CHECK_WORD_PAGE_SIZE - 1;
    const { data, error } = await supabase
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
          hidden_encounter_count,
          sample_user_book_word_id,
          sample_user_book_id,
          sample_book_title,
          sample_book_cover_url
        `
      )
      .eq("user_id", userId)
      .order("total_encounter_count", { ascending: false })
      .range(from, to)
      .returns<LibraryWordSummaryRow[]>();

    if (error) throw error;

    allRows.push(...(data ?? []));

    if (!data || data.length < LIBRARY_CHECK_WORD_PAGE_SIZE) {
      break;
    }

    from += LIBRARY_CHECK_WORD_PAGE_SIZE;
  }

  return allRows;
}

async function loadDefinitionNumbersByWordId(wordIds: string[], userBookIds: string[]) {
  const definitionNumberByWordId = new Map<string, number>();
  const uniqueWordIds = uniqueStrings(wordIds);

  for (let i = 0; i < uniqueWordIds.length; i += LIBRARY_PROGRESS_KEY_BATCH_SIZE) {
    const batch = uniqueWordIds.slice(i, i + LIBRARY_PROGRESS_KEY_BATCH_SIZE);
    const { data: sampleWords, error: sampleWordsErr } = await supabase
      .from("user_book_words")
      .select("id, meaning_choice_index")
      .in("id", batch)
      .in("user_book_id", userBookIds);

    if (sampleWordsErr) throw sampleWordsErr;

    for (const word of sampleWords ?? []) {
      const definitionNumber = definitionNumberFromIndex((word as any).meaning_choice_index);
      if (definitionNumber != null) {
        definitionNumberByWordId.set((word as any).id, definitionNumber);
      }
    }
  }

  return definitionNumberByWordId;
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
    console.warn("Word Sky claims did not load for Library Practice:", error);
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

function libraryStudyChipClass(status: LibraryStudyColorStatus | undefined) {
  const color = status?.color ?? "yellow";
  const base = "rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm";

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

function pickLibraryCheckGate(status: LibraryStudyColorStatus, _seed: string): LibraryCheckGate {
  if (status.nextGate === "reading") return "reading";
  if (status.nextGate === "meaning") return "meaning";
  return "reading";
}

function isCardAvailableForLibraryPractice(
  card: StudyCard,
  selectedJlptLevels: string[],
  colorFilter: PracticeColorFilter
) {
  const allLevelsSelected =
    selectedJlptLevels.length === 0 ||
    selectedJlptLevels.length === LIBRARY_PRACTICE_JLPT_LEVELS.length;

  const jlptMatch =
    allLevelsSelected || selectedJlptLevels.includes(normalizeJlpt(card.jlpt));

  if (!jlptMatch) return false;

  if (colorFilter === "all") return true;
  if (colorFilter === "katakana") return isKatakanaOnly(card.surface);

  return card.colorStatus.color === colorFilter;
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
  onFlagCard,
  onMeaningAnswered,
  onTypingMissed,
  meaningReviewCount,
  onReviewMeanings,
  onOpenWordSky,
}: {
  card: StudyCard | undefined;
  total: number;
  revealStep: PracticeRevealStep;
  practiceMode: PracticeStudyMode;
  onAdvance: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onFlagCard: () => Promise<boolean> | boolean;
  onMeaningAnswered: (
    card: StudyCard,
    userAnswer: string,
    correctAnswer: string,
    ok: boolean
  ) => void;
  onTypingMissed: (card: StudyCard, gate: "reading" | "meaning") => void;
  meaningReviewCount: number;
  onReviewMeanings: () => void;
  onOpenWordSky: () => void;
}) {
  const [typingStep, setTypingStep] = useState<PracticeTypingStep>("reading");
  const [typingInput, setTypingInput] = useState("");
  const [typingFeedback, setTypingFeedback] = useState<null | {
    ok: boolean;
    answer: string;
    label: string;
  }>(null);
  const [typingMissedStep, setTypingMissedStep] = useState<PracticeTypingStep | null>(null);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  const [pendingTypingAdvance, setPendingTypingAdvance] =
    useState<PracticeTypingAdvance | null>(null);
  const typingPracticeInputRef = useRef<HTMLInputElement | null>(null);
  const [flaggedCardKeys, setFlaggedCardKeys] = useState<Set<string>>(() => new Set());
  const [flaggingCard, setFlaggingCard] = useState(false);

  function focusTypingPracticeInput() {
    for (const delay of [0, 80, 220]) {
      window.setTimeout(() => {
        typingPracticeInputRef.current?.focus({ preventScroll: true });
        typingPracticeInputRef.current?.select();
      }, delay);
    }
  }

  useEffect(() => {
    setTypingStep("reading");
    setTypingInput("");
    setTypingFeedback(null);
    setTypingMissedStep(null);
    setAutoAdvancePaused(false);
    setPendingTypingAdvance(null);
  }, [card?.id, practiceMode]);

  useEffect(() => {
    if (practiceMode !== "typing") return;
    if (typingFeedback) return;

    const timer = window.setTimeout(focusTypingPracticeInput, 40);

    return () => window.clearTimeout(timer);
  }, [card?.id, practiceMode, typingFeedback, typingStep]);

  useEffect(() => {
    if (!pendingTypingAdvance) return;
    if (autoAdvancePaused) return;

    const timer = window.setTimeout(() => {
      if (pendingTypingAdvance === "meaning") {
        setTypingStep("meaning");
        setTypingInput("");
        setTypingFeedback(null);
        setTypingMissedStep(null);
        setPendingTypingAdvance(null);
        focusTypingPracticeInput();
        return;
      }

      setTypingStep("reading");
      setTypingInput("");
      setTypingFeedback(null);
      setTypingMissedStep(null);
      setPendingTypingAdvance(null);
      onNext();
      focusTypingPracticeInput();
    }, LIBRARY_REVIEW_AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [pendingTypingAdvance, autoAdvancePaused, onNext]);

  if (!card) {
    return <LibraryPracticeNoCardsState />;
  }

  const showReading = revealStep === "reading" || revealStep === "meaning";
  const showMeaning = revealStep === "meaning";
  const typingLabel = typingStep === "reading" ? "Reading" : "Meaning";

  const currentCardWasFlagged = flaggedCardKeys.has(card.studyIdentityKey);

  async function handleFlagCardClick() {
    if (currentCardWasFlagged || flaggingCard) return;

    setFlaggingCard(true);

    try {
      const ok = await onFlagCard();

      if (ok) {
        setFlaggedCardKeys((current) => {
          const next = new Set(current);
          next.add(card.studyIdentityKey);
          return next;
        });
      }
    } finally {
      setFlaggingCard(false);
    }
  }

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
        focusTypingPracticeInput();
        return;
      }

      setTypingFeedback({ ok, answer: correctAnswer || "—", label: typingLabel });
      setPendingTypingAdvance("meaning");
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
      focusTypingPracticeInput();
      return;
    }

    if (typingMissedStep !== "meaning") {
      onMeaningAnswered(card, userAnswer, correctAnswer, true);
    }
    setTypingFeedback({ ok, answer: correctAnswer || "—", label: typingLabel });
    setPendingTypingAdvance("next");
  }

  return (
    <div className="w-full max-w-3xl space-y-2">
      {practiceMode === "reveal" ? (
        <button
          type="button"
          onClick={onAdvance}
          className="relative flex min-h-[24rem] w-full max-w-3xl cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl transition hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-sky-300 sm:min-h-[28rem]"
        >
          <LibraryPracticeCardBadges
            modeLabel="Review"
            jlpt={card.jlpt}
            colorDotClassName={libraryStudyDotClass(card.colorStatus)}
            colorName={libraryStudyColorName(card.colorStatus)}
            showKatakanaBadge={isKatakanaOnly(card.surface)}
            definitionText={definitionLabel(card)}
            definitionChipClassName={libraryStudyChipClass(card.colorStatus)}
            readChipClassName={libraryStudyChipClass(card.colorStatus)}
            encounterCount={card.encounterCount}
          />

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

        <div className="relative flex min-h-[24rem] w-full max-w-3xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl sm:min-h-[28rem]">
          <LibraryPracticeCardBadges
            modeLabel="Typing Practice"
            jlpt={card.jlpt}
            colorDotClassName={libraryStudyDotClass(card.colorStatus)}
            colorName={libraryStudyColorName(card.colorStatus)}
            showKatakanaBadge={isKatakanaOnly(card.surface)}
            definitionText={definitionLabel(card)}
            definitionChipClassName={libraryStudyChipClass(card.colorStatus)}
            readChipClassName={libraryStudyChipClass(card.colorStatus)}
            encounterCount={card.encounterCount}
          />

          <div className="flex w-full flex-col items-center gap-5 pt-12 pb-10">
            <div className="text-base font-black uppercase tracking-[0.16em] text-slate-600">
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

                  {pendingTypingAdvance ? (
                    <div className="mt-2 flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAutoAdvancePaused((current) => !current)}
                        className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        {autoAdvancePaused ? "Resume" : "Pause"}
                      </button>
                      <p className="text-xs text-slate-400">
                        {autoAdvancePaused
                          ? "Paused. Take your time with this card."
                          : "Next step comes automatically."}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {typingFeedback.ok
                        ? pendingTypingAdvance === "meaning"
                          ? "Meaning check comes automatically."
                          : "Next card comes automatically."
                        : typingStep === "reading"
                          ? "Retype the reading once to continue."
                          : "Type one meaning word once to continue."}
                    </p>
                  )}
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

      <section className="mt-4 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={onPrevious}
            disabled={total <= 1}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${total > 1
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
              }`}
          >
            ← Previous
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={total <= 1}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${total > 1
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
              }`}
          >
            Skip
          </button>

          <button
            type="button"
            onClick={onShuffle}
            disabled={total <= 1}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${total > 1
              ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
              : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
              }`}
          >
            Shuffle
          </button>

          <button
            type="button"
            onClick={handleFlagCardClick}
            disabled={currentCardWasFlagged || flaggingCard}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${currentCardWasFlagged
              ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              } disabled:opacity-80`}
          >
            {currentCardWasFlagged ? "Flagged ✓" : flaggingCard ? "Flagging..." : "Flag card"}
          </button>
        </div>

        {practiceMode === "typing" ? (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={onReviewMeanings}
              disabled={meaningReviewCount === 0}
              className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-950 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Review meanings and finish{meaningReviewCount ? ` (${meaningReviewCount})` : ""}
            </button>
          </div>
        ) : null}
      </section>
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

function uniqueByNormalized(
  values: string[],
  normalize: (value: string) => string,
  exclude: string
) {
  const seen = new Set<string>();
  const out: string[] = [];
  const excludeNorm = normalize(exclude);

  for (const value of values) {
    const norm = normalize(value);
    if (!norm || norm === excludeNorm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(value);
  }

  return out;
}

function matchesAnyMeaning(input: string, fullMeaning: string) {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) return false;

  const semicolonParts = fullMeaning
    .split(";")
    .map((part) => normalizeText(part))
    .filter(Boolean);

  for (const part of semicolonParts) {
    if (part === normalizedInput) return true;

    const commaParts = part
      .split(",")
      .map((piece) => normalizeText(piece))
      .filter(Boolean);

    for (const piece of commaParts) {
      if (piece === normalizedInput) return true;

      const words = piece
        .replace(/[()]/g, " ")
        .split(/\s+/)
        .map((word) => normalizeText(word))
        .filter(Boolean);

      if (words.includes(normalizedInput)) {
        return true;
      }
    }
  }

  return false;
}

function practiceColorFilterLabel(filter: PracticeColorFilter) {
  if (filter === "all") return "All Colors";
  if (filter === "grey") return "Limbo words";
  if (filter === "katakana") return "Katakana words";

  return `${filter.charAt(0).toUpperCase() + filter.slice(1)} words`;
}

function jlptFilterLabel(levels: string[]) {
  if (
    levels.length === 0 ||
    levels.length === LIBRARY_PRACTICE_JLPT_LEVELS.length
  ) {
    return "All levels";
  }

  const orderedLevels = LIBRARY_PRACTICE_JLPT_LEVELS.filter((level) =>
    levels.includes(level)
  );

  return orderedLevels
    .map((level) => (level === "NON-JLPT" ? "Unlabeled" : level))
    .join(" + ");
}

const LIBRARY_PRACTICE_JLPT_LEVELS = [
  "N5",
  "N4",
  "N3",
  "N2",
  "N1",
  "NON-JLPT",
] as const;

function libraryReviewStudyingNowLabel({
  colorFilter,
  jlptLevels,
  mode,
}: {
  colorFilter: PracticeColorFilter;
  jlptLevels: string[];
  mode: PracticeStudyMode;
}) {
  const colorLabel = practiceColorFilterLabel(colorFilter);
  const levelLabel = jlptFilterLabel(jlptLevels);
  const modeLabel = practiceStudyModeLabel(mode);

  if (colorFilter === "all" && levelLabel === "All levels") {
    return `${colorLabel} • ${modeLabel}`;
  }

  return `${colorLabel} • ${levelLabel} • ${modeLabel}`;
}

export default function LibraryStudyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ownedUserBookIds, setOwnedUserBookIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canUseLibraryReview, setCanUseLibraryReview] = useState(false);
  const [fullAccessLocked, setFullAccessLocked] = useState(false);

  const [libraryReviewCards, setLibraryReviewCards] = useState<StudyCard[]>([]);
  const [practiceDeck, setPracticeDeck] = useState<StudyCard[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceRevealStep, setPracticeRevealStep] = useState<PracticeRevealStep>("word");
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [practiceStudyMode, setPracticeStudyMode] = useState<PracticeStudyMode>("reveal");

  const [selectedJlptLevels, setSelectedJlptLevels] = useState<string[]>([]);
  const [practiceColorFilter, setPracticeColorFilter] =
    useState<PracticeColorFilter>("all");
  const [, setNotice] = useState<string | null>(null);
  const [meaningReviewItems, setMeaningReviewItems] = useState<MeaningReviewItem[]>([]);
  const [showPracticeMeaningReview, setShowPracticeMeaningReview] = useState(false);

  const libraryReviewStudyingNowLabelText = libraryReviewStudyingNowLabel({
    colorFilter: practiceColorFilter,
    jlptLevels: selectedJlptLevels,
    mode: practiceStudyMode,
  });

  useEffect(() => {
    const requestedColor = searchParams.get("color");
    const allowedColors: PracticeColorFilter[] = [
      "all",
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple",
      "grey",
      "katakana",
    ];

    if (requestedColor && allowedColors.includes(requestedColor as PracticeColorFilter)) {
      setPracticeColorFilter(requestedColor as PracticeColorFilter);
    }
  }, [searchParams]);

  const practiceCard = practiceDeck[practiceIndex];

  const practiceFilteredCards = useMemo(() => {
    return libraryReviewCards.filter((card) =>
      isCardAvailableForLibraryPractice(
        card,
        selectedJlptLevels,
        practiceColorFilter
      )
    );
  }, [libraryReviewCards, selectedJlptLevels, practiceColorFilter]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNeedsSignIn(false);
      setErrorMsg(null);
      setCanUseLibraryReview(false);
      setFullAccessLocked(false);

      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
          setCurrentUserId(null);
          setOwnedUserBookIds([]);
          setNeedsSignIn(true);
          setLoading(false);
          return;
        }

        setCurrentUserId(user.id);

        const { data: profileRow, error: profileErr } = await supabase
          .from("profiles")
          .select("role, is_super_teacher, app_access_type, app_access_expires_at")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) {
          console.warn("Could not load profile role for Library Study:", profileErr);
        }

        const role = ((profileRow as any)?.role ?? "member") as ProfileRole;
        const superTeacherFlag = Boolean((profileRow as any)?.is_super_teacher);

        const appAccessStatus = profileRow
          ? getAppAccessStatus(profileRow)
          : { hasAccess: false, hasFullAccess: false, reason: "missing_profile" };

        const featureAccess = getFeatureAccess({
          role: superTeacherFlag ? "super_teacher" : role,

          // First pass: Library Review uses the same full-access bucket as Ability Check
          // because both are saved-vocabulary study features.
          hasFullAccess: appAccessStatus.hasFullAccess,
        });

        const canUseLibraryReviewNow = canUseFullAccessFeature(
          featureAccess,
          "library_review"
        );

        setCanUseLibraryReview(canUseLibraryReviewNow);

        if (!canUseLibraryReviewNow) {
          setOwnedUserBookIds([]);
          setLibraryReviewCards([]);
          setPracticeDeck([]);
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
        setOwnedUserBookIds(userBookIds);

        if (userBookIds.length === 0) {
          setOwnedUserBookIds([]);
          setLibraryReviewCards([]);
          setPracticeDeck([]);
          setLoading(false);
          return;
        }

        let learningSettings: LearningSettingsRow | null = null;
        const { data: learningSettingsWithLimit, error: settingsErr } = await supabase
          .from("user_learning_settings")
          .select("red_stages, orange_stages, yellow_stages, show_badge_numbers, skip_katakana_library_check, library_check_daily_limit")
          .eq("user_id", user.id)
          .maybeSingle<LearningSettingsRow>();

        if (settingsErr) {
          const { data: fallbackSettings, error: fallbackSettingsErr } = await supabase
            .from("user_learning_settings")
            .select("red_stages, orange_stages, yellow_stages, show_badge_numbers, skip_katakana_library_check")
            .eq("user_id", user.id)
            .maybeSingle<LearningSettingsRow>();

          if (fallbackSettingsErr) throw fallbackSettingsErr;
          learningSettings = fallbackSettings;
        } else {
          learningSettings = learningSettingsWithLimit;
        }

        const colorSettings = {
          ...DEFAULT_LEARNING_SETTINGS,
          ...(learningSettings ?? {}),
        };

        const metaById = new Map<string, { title: string; cover_url: string | null }>();
        for (const row of userBooks ?? []) {
          metaById.set(row.id, getBookMeta(row));
        }

        let allSummaryRows: LibraryWordSummaryRow[] = [];
        let summaryLoadError: unknown = null;

        try {
          allSummaryRows = await loadAllLibraryWordSummaries(user.id);
        } catch (summaryErr) {
          summaryLoadError = summaryErr;
          console.warn("Library word summaries are not available yet:", summaryErr);
        }

        const claimRows = await loadLibraryWordClaims(user.id);
        const claimByKey = new Map<string, LibraryWordClaimRow>();
        for (const claim of claimRows) {
          if (claim.study_identity_key) claimByKey.set(claim.study_identity_key, claim);
        }

        if (allSummaryRows.length > 0) {
          const visibleSummaryRows = allSummaryRows
            .filter((row) => (row.total_encounter_count ?? 0) > (row.hidden_encounter_count ?? 0));
          let definitionNumberByWordId = new Map<string, number>();
          const sampleWordIds = uniqueStrings(
            visibleSummaryRows.map((row) => row.sample_user_book_word_id).filter(Boolean)
          );

          if (sampleWordIds.length > 0) {
            try {
              definitionNumberByWordId = await loadDefinitionNumbersByWordId(
                sampleWordIds,
                userBookIds
              );
            } catch (sampleWordsErr) {
              console.warn("Could not load definition numbers for Library Practice:", sampleWordsErr);
            }
          }

          const studyKeys = uniqueStrings([
            ...allSummaryRows.map((row) => row.study_identity_key).filter(Boolean),
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

          const reviewCards: StudyCard[] = visibleSummaryRows
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

          const reviewCardKeys = new Set(reviewCards.map((card) => card.studyIdentityKey));
          const reviewClaimCards = claimRows
            .filter((claim) => !reviewCardKeys.has(claim.study_identity_key))
            .map((claim) => makeClaimStudyCard(user.id, claim, colorSettings, progressByKey))
            .filter((card): card is StudyCard => Boolean(card));
          const allReviewCards = [...reviewCards, ...reviewClaimCards];

          setLibraryReviewCards(allReviewCards);
          return;
        }

        if (summaryLoadError) {
          console.warn("Falling back to saved-word rows for Library Practice:", summaryLoadError);
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

        setLibraryReviewCards(allStudyCards);
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
    setPracticeDeck(buildShuffledPracticeDeck(practiceFilteredCards));
    setPracticeIndex(0);
    setPracticeRevealStep("word");
    setPracticeFinished(false);
  }, [practiceFilteredCards]);

  function resetPracticeReveal() {
    setPracticeRevealStep("word");
  }

  function goToNextPracticeCard() {
    if (practiceDeck.length === 0) return;

    setPracticeIndex((prev) => {
      if (prev + 1 >= practiceDeck.length) {
        setPracticeFinished(true);
        return prev;
      }
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

    setPracticeIndex((prev) => {
      if (prev + 1 >= practiceDeck.length) {
        setPracticeFinished(true);
        return prev;
      }
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
    setPracticeDeck(buildShuffledPracticeDeck(practiceFilteredCards));
    setPracticeIndex(0);
    setPracticeFinished(false);
    resetPracticeReveal();
  }

  function movePracticeDeckToNextMode() {
    setPracticeStudyMode(nextPracticeStudyMode(practiceStudyMode));
    setPracticeIndex(0);
    setPracticeFinished(false);
    resetPracticeReveal();
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

  async function saveTypedGateProgress(
    gate: "reading" | "meaning",
    ok: boolean,
    options: { forceMeaning?: boolean; card?: StudyCard } = {}
  ) {
    const activeCard = options.card;
    if (!canUseLibraryReview) return;
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
      }
    } else {
      nextProgress.meaning_gate_status = ok ? "passed" : "failed";
      nextProgress.held_before_meaning_gate = false;
      nextProgress.meaning_gate_attempts += 1;
      if (ok) {
        nextProgress.meaning_gate_passed_at = now;
      } else {
        nextProgress.meaning_gate_failed_at = now;
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

  async function flagPracticeCard(cardToFlag: StudyCard) {
    if (!canUseLibraryReview || !currentUserId || ownedUserBookIds.length === 0) {
      return false;
    }

    if (isClaimCardId(cardToFlag.id)) {
      setNotice("Thanks — Word Sky claim flagging is not wired yet.");
      return false;
    }

    const idsToFlag =
      cardToFlag.encounterIds.length > 0 ? cardToFlag.encounterIds : [cardToFlag.id];

    const { error } = await supabase
      .from("user_book_words")
      .update({
        flagged_for_review: true,
        flagged_by_user_id: currentUserId,
        flagged_at: new Date().toISOString(),
      })
      .in("id", idsToFlag)
      .in("user_book_id", ownedUserBookIds);

    if (error) {
      console.error("Error flagging Library Review card:", error);
      alert(`Could not flag card.\n${error.message}`);
      return false;
    }

    setNotice("Thanks — this card was flagged for review.");
    return true;
  }

  if (loading) {
    return <LibraryReviewLoadingState />;
  }

  if (needsSignIn) {
    return (
      <LibraryReviewNeedsSignInState
        onGoToLogin={() => router.push("/login")}
      />
    );
  }

  if (fullAccessLocked) {
    const copy = getFullAccessRequiredCopy("library_review");

    return (
      <LibraryReviewFullAccessLockedState
        message={copy.message}
        onBackToLibrary={() => router.push("/books")}
        onViewReadingStats={() => router.push("/community/stats")}
      />
    );
  }

  if (errorMsg) {
    return (
      <LibraryReviewErrorState
        message={errorMsg}
        onBackToLibrary={() => router.push("/books")}
      />
    );
  }

  if (libraryReviewCards.length === 0) {
    return (
      <LibraryReviewEmptyState
        onOpenWordSky={() => router.push("/library-study/word-sky")}
        onBackToLibrary={() => router.push("/books")}
      />
    );
  }

  if (showPracticeMeaningReview && meaningReviewItems.length > 0) {
    return (
      <PracticeMeaningReviewScreen
        items={meaningReviewItems}
        onFinishReview={finishPracticeMeaningReview}
        onBackToPractice={() => setShowPracticeMeaningReview(false)}
        onCountPassed={countMeaningReviewAsPassed}
        onCountMissed={countMeaningReviewAsMissed}
        onKeepMissed={keepMeaningReviewMissed}
      />
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-100 px-4 py-4 sm:px-6">
      <LibraryReviewPageHeader onOpenLibrary={() => router.push("/library")} />

      <div className="mb-3 w-full max-w-3xl space-y-0">
        <LibraryPracticeFilterPanel
          jlptLevels={LIBRARY_PRACTICE_JLPT_LEVELS}
          selectedJlptLevels={selectedJlptLevels}
          practiceColorFilter={practiceColorFilter}
          onToggleJlpt={(level) =>
            setSelectedJlptLevels((current) =>
              current.includes(level)
                ? current.filter((selectedLevel) => selectedLevel !== level)
                : [...current, level]
            )
          }
          onSelectAllJlpt={() => setSelectedJlptLevels([...LIBRARY_PRACTICE_JLPT_LEVELS])}
          onClearJlpt={() => setSelectedJlptLevels([])}
          onColorFilterChange={(value) =>
            setPracticeColorFilter(value as PracticeColorFilter)
          }
        />

        <LibraryPracticeModeSelector
          value={practiceStudyMode}
          onChange={setPracticeStudyMode}
        />
      </div>

      <div className="mb-7 w-full max-w-3xl">
        <LibraryReviewProgressCard
          current={practiceDeck.length > 0 ? practiceIndex + 1 : 0}
          total={practiceDeck.length}
          studyingNowLabel={libraryReviewStudyingNowLabelText}
        />
      </div>

      {practiceFinished ? (
        <LibraryPracticeCompleteCard
          nextModeLabel={practiceStudyModeLabel(nextPracticeStudyMode(practiceStudyMode))}
          onNextMode={movePracticeDeckToNextMode}
          onReviewAgain={shufflePracticeDeck}
          onOpenWordSky={() => router.push("/library-study/word-sky")}
        />
      ) : (
        <LibraryPracticePanel
          card={practiceCard}
          total={practiceDeck.length}
          revealStep={practiceRevealStep}
          practiceMode={practiceStudyMode}
          onAdvance={advancePracticeCard}
          onNext={goToNextPracticeCard}
          onPrevious={goToPreviousPracticeCard}
          onShuffle={shufflePracticeDeck}
          onFlagCard={() => {
            if (!practiceCard) return false;
            return flagPracticeCard(practiceCard);
          }}
          onMeaningAnswered={queuePracticeMeaningReview}
          onTypingMissed={handlePracticeTypingMiss}
          meaningReviewCount={meaningReviewItems.length}
          onReviewMeanings={() => setShowPracticeMeaningReview(true)}
          onOpenWordSky={() => router.push("/library-study/word-sky")}
        />
      )}
    </main>
  );
}
