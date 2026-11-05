// Curiosity Reading / Listening word timer experience
//
"use client";
import { useListeningCapture } from "@/lib/listening/useListeningCapture";
import { ListeningSessionWords } from "@/components/listening/ListeningSessionWords";
import VocabularyProgressPrompt from "@/components/books/VocabularyProgressPrompt";
import BookProgressSummaryBar from "@/components/books/BookProgressSummaryBar";
import ResumeBookmarkSection, { ResumeBookmarkFeedback } from "@/components/books/ResumeBookmarkSection";
import ResumeBookmarkSummary from "@/components/books/ResumeBookmarkSummary";
import { useSessionEndingPhrase, SessionEndingPhraseField, LatestEndingPhrase } from "@/components/books/SessionEndingPhrase";
import WordContextFields from "@/components/vocabulary/WordContextFields";
import { wordContextPayload, type WordContext } from "@/lib/vocabulary/wordContext";
import { useBookProgress } from "@/components/books/BookProgressProvider";
import { nextProgressStart, matchingTotal, progressLabels, parseProgressRange, parseProgressPosition, sessionEnd } from "@/lib/books/readingProgress";
import { useResumeBookmark } from "@/lib/books/useResumeBookmark";
import { nextSessionStartPage } from "@/lib/books/resumeBookmark.mjs";


import { isReadyForFlashcards } from "@/lib/wordSupportEligibility";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { displayBookTitle } from "@/lib/books/bookIdentity";
import KanjiComponentLookup from "@/components/KanjiComponentLookup";
import LibraryColorBadge from "@/components/LibraryColorBadge";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
  canUseFullAccessFeature,
  getFullAccessRequiredCopy,
} from "@/lib/access/requireFullAccess";
import {
  fetchLibraryStudyColorInfoByWord,
  makeLibraryStudyColorKey,
  type LibraryStudyWordColorInfo,
} from "@/lib/libraryStudyColorLookup";
import {
  addChapterNameOption,
  normalizeChapterNameOptions,
  sortChapterNameOptionsByNumber,
} from "@/lib/chapterNameOptions";
import { parseWordPosition, wordPosition, wordPositionInput, wordPositionPayload, stickyWordPosition, positionLabel } from "@/lib/vocabulary/wordPosition";
import type { ProgressTrackingMethod } from "@/lib/books/readingProgress";
import { todayYmdAppTimeZone } from "@/lib/timeZone";
import CuriosityPageHeader from "./components/CuriosityPageHeader";
import CuriosityStatusMessage from "./components/CuriosityStatusMessage";
import CuriosityBookContextCard from "./components/CuriosityBookContextCard";
import CuriosityDictionaryChoices from "./components/CuriosityDictionaryChoices";
import { rememberedCaptureContext, vocabularyCaptureContext, restoreCaptureContext } from "@/lib/vocabulary/curiosityCaptureContext";
import WordPositionField from "@/components/vocabulary/WordPositionField";
import ChapterNameCombobox from "@/components/ChapterNameCombobox";
import PersonalVocabularyResults from "@/components/vocabulary/PersonalVocabularyResults";
import {
  searchPersonalVocabulary,
  personalVocabularyEntryKey,
  type PersonalVocabularyMatch,
} from "@/lib/personalVocabularySearch";
import CuriosityRecentSessionWordCard from "./components/CuriosityRecentSessionWordCard";
import CuriosityRecentSessionWords from "./components/CuriosityRecentSessionWords";
import CuriosityFullAccessRequired from "./components/CuriosityFullAccessRequired";
import CuriosityTimerPanel from "./components/CuriosityTimerPanel";
import CuriosityQuickSearchRow from "./components/CuriosityQuickSearchRow";
import CuriosityWordHelpPanel from "./components/CuriosityWordHelpPanel";
import CuriosityQuickErrorMessage from "./components/CuriosityQuickErrorMessage";
import CuriosityWordDetailFields from "./components/CuriosityWordDetailFields";
import CuriosityAddEditWordFormShell from "./components/CuriosityAddEditWordFormShell";
import CuriosityAddEditWordCard from "./components/CuriosityAddEditWordCard";
import MobileQuickCapture from "./components/MobileQuickCapture";
import AddEnglishWordFields from "../add-word/components/AddEnglishWordFields";
import {
  clearPersistedTimedSession,
  elapsedMsForPersistedTimedSession,
  readPersistedTimedSession,
  writePersistedTimedSession,
} from "../_shared/timed-session/timedSessionPersistence";

type EnglishItemType = "word" | "phrase";

type QuickPreview = WordContext & {
  id: string | null;
  surface: string;
  cacheSurface: string;
  reading: string;
  meanings: string[];
  selectedMeaningIndex: number;
  meaning: string;
  isCustomMeaning: boolean;

  alternateSurface: string;
  positionUnit?: ProgressTrackingMethod;
  page: string;
  chapterNumber: string;
  chapterName: string;
  pageOrder: number | null;
};

type QuickSessionWord = WordContext & {
  id: string;
  surface: string;
  reading: string;
  meaning: string;
  positionUnit?: ProgressTrackingMethod;
  page: string;
  chapterNumber: string;
  chapterName: string;
  meanings: string[];
  selectedMeaningIndex: number | null;
  isCustomMeaning: boolean;
  cacheSurface: string;

  alternateSurface: string;
  hideKanjiInReadingSupport: boolean;
  pageOrder: number | null;
  itemType?: EnglishItemType;
};

type QuickLookupCandidate = {
  id: string;
  surface: string;
  cacheSurface: string;
  reading: string;
  meanings: string[];
  selectedMeaningIndex: number;
  meaning: string;
  isCustomMeaning: boolean;
};

type LastSavedWordContext = {
  positionUnit?: ProgressTrackingMethod;
  surface: string;
  page: string;
};

type WordTimerExperienceMode = "curiosity" | "listening";

export type CuriosityReadingJournalContext = {
  currentPageNumber: number | null;
  selectedChapterLabel: string | null;
  selectedChapterNumber: number | null;
};

function makeBlankQuickPreview(meta: { page: string; positionUnit?: ProgressTrackingMethod; chapterNumber: string; chapterName: string } = { page: "", chapterNumber: "", chapterName: "" }): QuickPreview {
  return {
    id: null,
    surface: "",
    cacheSurface: "",
    reading: "",
    meanings: [],
    selectedMeaningIndex: 0,
    meaning: "",
    isCustomMeaning: true,

    alternateSurface: "",
    page: meta.page,
    positionUnit: meta.positionUnit,
    chapterNumber: meta.chapterNumber,
    chapterName: meta.chapterName,
    pageOrder: null,
  };
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toNullableInt(value: string): number | null {
  const t = (value ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}



function sortQuickSessionWords(words: QuickSessionWord[]) {
  return [...words].sort((a, b) => {
    const aChapter = toNullableInt(a.chapterNumber) ?? Number.MAX_SAFE_INTEGER;
    const bChapter = toNullableInt(b.chapterNumber) ?? Number.MAX_SAFE_INTEGER;
    if (aChapter !== bChapter) return aChapter - bChapter;

    const aPage = toNullableInt(a.page) ?? Number.MAX_SAFE_INTEGER;
    const bPage = toNullableInt(b.page) ?? Number.MAX_SAFE_INTEGER;
    if (aPage !== bPage) return aPage - bPage;

    const aOrder = a.pageOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.pageOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;

    return a.surface.localeCompare(b.surface);
  });
}

function upsertAndSortQuickSessionWords(
  words: QuickSessionWord[],
  nextItem: QuickSessionWord
) {
  const existingIndex = words.findIndex((item) => item.id === nextItem.id);

  if (existingIndex < 0) {
    return [nextItem, ...words];
  }

  const nextWords = [...words];
  nextWords[existingIndex] = nextItem;
  return nextWords;
}

function extractQuickMeanings(entry: any): string[] {
  return (entry?.senses ?? [])
    .map((sense: any) => (sense?.english_definitions ?? []).join("; ").trim())
    .filter(Boolean);
}

function isExactQuickLookupMatch(entry: any, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return false;

  if ((entry?.slug ?? "") === cleanQuery) return true;

  const japaneseForms = entry?.japanese ?? [];
  return japaneseForms.some(
    (form: any) => (form?.word ?? "") === cleanQuery || (form?.reading ?? "") === cleanQuery
  );
}

function buildQuickLookupCandidates(entries: any[], fallbackWord: string): QuickLookupCandidate[] {
  const exactEntries = entries.filter((entry) => isExactQuickLookupMatch(entry, fallbackWord));
  const sourceEntries = exactEntries.length > 0 ? exactEntries : entries;
  const candidates: QuickLookupCandidate[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < sourceEntries.length; index += 1) {
    const entry = sourceEntries[index];
    const japaneseForms = entry?.japanese ?? [];
    const primaryForm =
      japaneseForms.find((j: any) => j?.word || j?.reading) ?? japaneseForms[0] ?? {};

    const surface = primaryForm?.word || entry?.slug || fallbackWord;
    const reading = primaryForm?.reading || "";
    const meanings = extractQuickMeanings(entry);
    const candidate: QuickLookupCandidate = {
      id: `${surface}__${reading || "no-reading"}__${index}`,
      surface,
      cacheSurface: surface,
      reading,
      meanings: meanings.length ? meanings : [""],
      selectedMeaningIndex: 0,
      meaning: meanings[0] || "",
      isCustomMeaning: false,
    };

    const dedupeKey = [
      candidate.surface,
      candidate.reading,
      candidate.meanings.join("||"),
    ].join("___");

    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    candidates.push(candidate);
  }

  return candidates;
}

function isSmallViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 640px)").matches;
}

function hasKanji(text: string) {
  return /[\p{Script=Han}]/u.test(text);
}

function readableSupabaseError(error: any) {
  if (!error) return "Unknown Supabase error.";

  const parts = [
    error.message,
    error.details,
    error.hint ? `Hint: ${error.hint}` : null,
    error.code ? `Code: ${error.code}` : null,
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  if (parts.length > 0) return parts.join(" ");

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    // Fall through to String(error).
  }

  return String(error) || "Unknown Supabase error.";
}

function focusResetCuriositySearch(input: HTMLInputElement | null, origin: Element | null) {
  if (!input?.isConnected || !input.getClientRects().length || input.matches(":disabled") || input.value) return;
  const active = document.activeElement;
  if (active !== document.body && active !== origin && active !== input) return;
  input.focus({ preventScroll: true });
  const header = document.querySelector<HTMLElement>("[data-mekuru-header]");
  const viewportTop = window.visualViewport?.offsetTop ?? 0;
  const visibleTop = Math.max(viewportTop, header?.getBoundingClientRect().bottom ?? 0) + 16;
  const visibleBottom = viewportTop + (window.visualViewport?.height ?? window.innerHeight) - 16;
  const bounds = input.getBoundingClientRect();
  if (bounds.top < visibleTop || bounds.bottom > visibleBottom) {
    window.scrollTo({ top: Math.max(0, window.scrollY + bounds.top - visibleTop), behavior: "instant" });
  }
}

async function generateVocabularyKanjiMap(vocabularyCacheId: number) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch("/api/vocabulary-kanji-map/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ vocabulary_cache_id: vocabularyCacheId }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    console.error("Could not generate vocabulary kanji map:", data?.error ?? response.status);
  }
}

import { saveStudentWord, type StudentWordContext } from "@/lib/teacher/saveStudentWord";

export function CuriosityReadingExperience(props: Parameters<typeof CuriosityReadingContent>[0]) {
  const params = useParams<{ userBookId: string }>();
  return <CuriosityReadingContent key={`${props.targetUserBookId ?? params.userBookId}:${props.studentContext?.studentId ?? ""}`} {...props} />;
}

function CuriosityReadingContent({
  studentContext,
  targetUserBookId,
  wordCaptureOnly = false,
  experienceMode = "curiosity",
  nativeListeningPosition = false,
  embedded = false,
  workspaceCompact = false,
  workspaceAside,
  onCloseWorkspaceAside,
  modeSwitchSlot,
  showProgressSummaryBar = true,
  timerReminder,
  onActiveTimerChange,
  onReadingJournalContextChange,
}: {
  studentContext?: StudentWordContext;
  targetUserBookId?: string;
  wordCaptureOnly?: boolean;
  experienceMode?: WordTimerExperienceMode;
  nativeListeningPosition?: boolean;
  embedded?: boolean;
  workspaceCompact?: boolean;
  workspaceAside?: ReactNode;
  onCloseWorkspaceAside?: () => void;
  modeSwitchSlot?: ReactNode;
  showProgressSummaryBar?: boolean;
  timerReminder?: ReactNode;
  onActiveTimerChange?: (active: boolean) => void;
  onReadingJournalContextChange?: (context: CuriosityReadingJournalContext) => void;
}) {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const routeUserBookId = targetUserBookId ?? params.userBookId ?? "";
  const isListeningMode = experienceMode === "listening";
  const timedSessionMode = isListeningMode ? "listening" : "curiosity";
  const pageTitle = isListeningMode ? "Listening" : "Curiosity Reading";
  const pageDescription = isListeningMode
    ? "Listen to this book or audiobook, track your time, and save words you catch by ear without leaving the session."
    : "Look up and save words from this book while you read. Add words when you want to check or remember them, then keep reading.";
  const timerTitle = isListeningMode ? "Log your listening session" : "Log your reading session";
  const timerDescription = isListeningMode
    ? "Use the timer to track listening while you add words you heard in this book."
    : "Use the timer to track a curiosity reading session where you stop, check, and save new words.";
  const saveSessionTitle = isListeningMode
    ? "Save this listening session"
    : "Save this reading session";
  const addWordTitle = isListeningMode ? "Add Heard Word" : "Add / Edit Word";
  const tracking = useBookProgress();
  const addWordDescription = isListeningMode
    ? "Search, adjust, and save a word you heard while listening to this book."
    : `Search, adjust, and save from one place. ${positionLabel(tracking.method ?? "page")} and chapter stay ready for the next word.`;
  const fullAccessFeature = isListeningMode ? "add_word" : "curiosity_reading";
  const [userBookId, setUserBookId] = useState(routeUserBookId);
  const { sessionEndingPhrase, setSessionEndingPhrase, latestEndingPhrase, markPhraseSaved } = useSessionEndingPhrase(userBookId, timedSessionMode);

  const capture = useListeningCapture(userBookId, isListeningMode);

  const progressTotal = matchingTotal(tracking.method, tracking.totals);
  const labels = progressLabels(tracking.method);
  const [username, setUsername] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");
  const [bookLanguageCode, setBookLanguageCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccessBook, setCanAccessBook] = useState(false);
  const [canTeachWordForms, setCanTeachWordForms] = useState(false);
  const [canUseCuriosityReading, setCanUseCuriosityReading] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [quickLoading, setQuickLoading] = useState(false);
  const quickSaveInFlight = useRef(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [englishItemType, setEnglishItemType] = useState<EnglishItemType>("word");
  const [hideKanjiInReadingSupport, setHideKanjiInReadingSupport] = useState(false);
  const [isWordHelpOpen, setIsWordHelpOpen] = useState(false);
  const [scratchWord, setScratchWord] = useState("");
  const [kanjiLookupResetKey, setKanjiLookupResetKey] = useState(0);

  const quickLookupVersion = useRef(0);
  useEffect(() => () => { quickLookupVersion.current += 1; }, [userBookId, studentContext?.studentId, isListeningMode]);
  const [quickPreview, setQuickPreview] = useState<QuickPreview>(() => makeBlankQuickPreview());
  const captureContextEdited = useRef(false);
  const [captureContextReady, setCaptureContextReady] = useState(false);
  function editQuickContext(update: Parameters<typeof setQuickPreview>[0]) {
    captureContextEdited.current = true;
    setQuickPreview(update);
  }
  const positionUnit = quickPreview.id ? quickPreview.positionUnit ?? "page" : tracking.method ?? "page";
  useEffect(() => {
    if (!tracking.loaded) return;
    setQuickPreview(prev => {
      const unit = tracking.method ?? "page";
      if (prev.id || prev.positionUnit === unit) return prev;
      if (!isListeningMode && !prev.positionUnit && captureContextEdited.current) return { ...prev, positionUnit: unit };
      return { ...prev, page: "", positionUnit: unit, ...(!isListeningMode ? { chapterNumber: "", chapterName: "" } : {}) };
    });
  }, [tracking.loaded, tracking.method, tracking.timersEnabled, isListeningMode]);
  const [quickSessionWords, setQuickSessionWords] = useState<QuickSessionWord[]>([]);
  const [chapterNameOptions, setChapterNameOptions] = useState<string[]>([]);
  const [chapterNumberByName, setChapterNumberByName] = useState<Record<string, string>>({});
  const [libraryColorByWordKey, setLibraryColorByWordKey] = useState<
    Record<string, LibraryStudyWordColorInfo>
  >({});
  const [quickLookupCandidates, setQuickLookupCandidates] = useState<QuickLookupCandidate[]>([]);
  const [selectedQuickLookupCandidateId, setSelectedQuickLookupCandidateId] =
    useState<string | null>(null);
  const [personalVocabularyMatches, setPersonalVocabularyMatches] = useState<PersonalVocabularyMatch[]>([]);
  const [personalVocabularyLoading, setPersonalVocabularyLoading] = useState(false);
  const [personalVocabularySearched, setPersonalVocabularySearched] = useState(false);
  const [personalVocabularyError, setPersonalVocabularyError] = useState<string | null>(null);
  const [dismissedPersonalEntries, setDismissedPersonalEntries] = useState<string[]>([]);
  const [selectedPersonalEntryKey, setSelectedPersonalEntryKey] = useState<string | null>(null);
  const [savedQuickNotice, setSavedQuickNotice] = useState("");
  const [lastSavedWordContext, setLastSavedWordContext] =
    useState<LastSavedWordContext | null>(null);

  const sortedChapterNameOptions = useMemo(
    () => sortChapterNameOptionsByNumber(chapterNameOptions, chapterNumberByName),
    [chapterNameOptions, chapterNumberByName]
  );

  const curiosityProgressLine = useMemo(() => {
    // Capture-only workspaces do not render the shared Your Progress bar.
    if (!wordCaptureOnly) return "";
    const parts = [];
    const currentPage = quickPreview.page.trim() || (lastSavedWordContext?.positionUnit === positionUnit ? lastSavedWordContext.page : "") || "";

    if (currentPage) parts.push(`${positionLabel(positionUnit)} ${currentPage}`);
    if (lastSavedWordContext?.surface) {
      parts.push(`Last saved word: ${lastSavedWordContext.surface}`);
    }

    return parts.join(" · ");
  }, [wordCaptureOnly, quickPreview.page, lastSavedWordContext, positionUnit]);

  const quickWordInputRef = useRef<HTMLInputElement | null>(null);
  const mobileQuickWordInputRef = useRef<HTMLInputElement | null>(null);
  const quickSaveFocus = useRef<{ input: HTMLInputElement | null; origin: Element | null } | null>(null);
  const [quickFocusRequest, setQuickFocusRequest] = useState(0);
  const quickFocusPending = useRef(false);
  useLayoutEffect(() => {
    if (isListeningMode || quickSaving || !quickFocusRequest || !quickFocusPending.current) return;
    const request = quickSaveFocus.current;
    quickSaveFocus.current = null;
    quickFocusPending.current = false;
    if (request) focusResetCuriositySearch(request.input, request.origin);
  }, [isListeningMode, quickSaving, quickFocusRequest]);

  function currentQuickSearchFocus() {
    const input = [mobileQuickWordInputRef.current, quickWordInputRef.current]
      .find(candidate => candidate?.isConnected && candidate.getClientRects().length) ?? null;
    return { input, origin: document.activeElement };
  }
  const quickWordFieldsRef = useRef<HTMLDivElement | null>(null);
  const isEnglishBook = bookLanguageCode === "en";

  function closeAndClearWordHelp() {
    setIsWordHelpOpen(false);
    setScratchWord("");
    setKanjiLookupResetKey((key) => key + 1);
  }

  // Timer
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [accumulatedElapsedMs, setAccumulatedElapsedMs] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showTimedSessionForm, setShowTimedSessionForm] = useState(false);
  const canCaptureListeningWord = Boolean(
    capture.identity && !capture.completed && (isRunning || isPaused || showTimedSessionForm)
  );
  const [timerSaveMessage, setTimerSaveMessage] = useState("");
  const [hasFinishedTimer, setHasFinishedTimer] = useState(false);
  const [sessionStartPage, setSessionStartPage] = useState("");
  const [sessionEndPage, setSessionEndPage] = useState("");
  const resumeBookmark = useResumeBookmark(userBookId, tracking.method === "page" && tracking.canChoose);
  const bookmarkEndingPage = tracking.method === "page"
    ? parseProgressPosition(sessionEndPage, "page", progressTotal).value
    : null;
  const [sessionDate, setSessionDate] = useState("");
  const [timerPersistenceReady, setTimerPersistenceReady] = useState(false);
  const skippedInitialPersistenceWriteRef = useRef(false);

  useEffect(() => {
    if (!isListeningMode || !capture.completed) return;
    setIsRunning(false); setIsPaused(false); setShowTimedSessionForm(false);
    setStartTime(null); setAccumulatedElapsedMs(0); setElapsed(0);
    clearPersistedTimedSession("listening", userBookId);
  }, [isListeningMode, capture.completed, userBookId]);

  const quickMetaStorageKey = `${experienceMode}-add-meta:${userBookId}`;
  const getSavedQuickMeta = useCallback(() => {
    if (typeof window === "undefined") {
      return { page: "", positionUnit: tracking.method ?? "page", chapterNumber: "", chapterName: "" };
    }

    try {
      const raw = window.localStorage.getItem(quickMetaStorageKey);
      if (!raw) {
        return { page: "", positionUnit: tracking.method ?? "page", chapterNumber: "", chapterName: "" };
      }

      const parsed = JSON.parse(raw);
      if (!isListeningMode) return rememberedCaptureContext(parsed, tracking.method ?? "page") ?? { page: "", positionUnit: tracking.method ?? "page", chapterNumber: "", chapterName: "" };
      return {
        page: stickyWordPosition(parsed.page, parsed.positionUnit, tracking.method ?? "page"),
        positionUnit: tracking.method ?? "page",
        chapterNumber: typeof parsed.chapterNumber === "string" ? parsed.chapterNumber : "",
        chapterName: typeof parsed.chapterName === "string" ? parsed.chapterName : "",
      };
    } catch {
      return { page: "", positionUnit: tracking.method ?? "page", chapterNumber: "", chapterName: "" };
    }
  }, [quickMetaStorageKey, tracking.method, isListeningMode]);

  const saveQuickMeta = useCallback((meta: { positionUnit?: ProgressTrackingMethod; page: string; chapterNumber: string; chapterName: string }) => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(quickMetaStorageKey, JSON.stringify(meta));
    } catch {
      // ignore
    }
  }, [quickMetaStorageKey]);



  async function canAccessUserBook(
    authedUserId: string,
    ownerUserId: string,
    profile: { role?: string | null; is_super_teacher?: boolean | null } | null
  ) {
    if (ownerUserId === authedUserId) return true;
    if (profile?.role === "super_teacher" || profile?.is_super_teacher) return true;
    if (profile?.role !== "teacher") return false;

    const { data: teacherStudentRow, error: teacherStudentErr } = await supabase
      .from("teacher_students")
      .select("teacher_id")
      .eq("teacher_id", authedUserId)
      .eq("student_id", ownerUserId)
      .is("archived_at", null)
      .maybeSingle();

    if (teacherStudentErr) {
      console.error("Error checking teacher/student access:", teacherStudentErr);
    }

    return Boolean(teacherStudentRow);
  }

  useEffect(() => {
    setUserBookId(routeUserBookId);
  }, [routeUserBookId]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsername() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled || userError || !user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled || error) return;
      setUsername(data?.username ?? "");
    }

    loadUsername();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userBookId) return;

    (async () => {
      setAccessChecked(false);
      setCanAccessBook(false);
      setCanUseCuriosityReading(false);
      setAccessMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setAccessMessage("Please sign in.");
        setAccessChecked(true);
        setCanAccessBook(false);
        setCanUseCuriosityReading(false);
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role, is_super_teacher, app_access_type, app_access_expires_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr) {
        console.error("Error loading profile role:", profileErr);
      }

      const appAccessStatus = profile
        ? getAppAccessStatus(profile)
        : { hasAccess: false, hasFullAccess: false, reason: "missing_profile" };

      const featureAccess = getFeatureAccess({
        role: profile?.role ?? null,
        isSuperTeacher: profile?.is_super_teacher,
        hasFullAccess: appAccessStatus.hasFullAccess,
        isTrialActive: appAccessStatus.reason === "trial",
      });

      setCanTeachWordForms(featureAccess.isTeacher);
      setCanUseCuriosityReading(canUseFullAccessFeature(featureAccess, fullAccessFeature));

      const { data: userBook, error: userBookError } = await supabase
        .from("user_books")
        .select("id, user_id, book_id")
        .eq("id", userBookId)
        .maybeSingle();

      if (userBookError) {
        setMessage(`❌ Could not load book info: ${userBookError.message}`);
        setAccessMessage("You do not have access to this book.");
        setAccessChecked(true);
        setCanAccessBook(false);
        return;
      }

      if (!userBook) {
        setAccessMessage("You do not have access to this book.");
        setAccessChecked(true);
        setCanAccessBook(false);
        setBookTitle("");
        setBookCover("");
        return;
      }

      const ownerUserId = (userBook as any)?.user_id ?? "";
      const allowed = isListeningMode ? user.id === ownerUserId : await canAccessUserBook(user.id, ownerUserId, profile ?? null);

      if (!allowed) {
        setAccessMessage("You do not have access to this book.");
        setAccessChecked(true);
        setCanAccessBook(false);
        setBookTitle("");
        setBookCover("");
        return;
      }

      setCanAccessBook(true);
      setAccessChecked(true);

      const { data: book, error: bookError } = await supabase
        .from("books")
        .select("title, cover_url, language_code, page_count")
        .eq("id", userBook.book_id)
        .maybeSingle();

      if (bookError) {
        setMessage(`❌ Could not load book details: ${bookError.message}`);
        return;
      }

      if (!book) {
        setMessage("❌ Book record not found.");
        setBookTitle("");
        setBookCover("");
        return;
      }

      setBookTitle(displayBookTitle(book, ""));
      setBookCover(book.cover_url ?? "");
      setBookLanguageCode(book.language_code ?? null);
      setMessage("");
    })();
  }, [fullAccessFeature, userBookId]);

  useEffect(() => {
    if (!tracking.loaded || quickPreview.positionUnit !== positionUnit || (!isListeningMode && !captureContextReady)) return;

    const meta = {
      page: positionUnit === (tracking.method ?? "page") ? quickPreview.page : "",
      positionUnit: tracking.method ?? "page",
      chapterNumber: quickPreview.chapterNumber,
      chapterName: quickPreview.chapterName,
    };

    const hasAnyLocation =
      meta.page.trim() || meta.chapterNumber.trim() || meta.chapterName.trim();

    if (!hasAnyLocation && isListeningMode) return;

    saveQuickMeta(meta);
  }, [quickPreview, positionUnit, tracking.loaded, tracking.method, saveQuickMeta, isListeningMode, captureContextReady]);

  useEffect(() => {
    onReadingJournalContextChange?.({
      currentPageNumber: positionUnit === "page" ? parseWordPosition(quickPreview.page, "page").value : null,
      selectedChapterLabel: quickPreview.chapterName.trim() || null,
      selectedChapterNumber: toNullableInt(quickPreview.chapterNumber),
    });
  }, [
    onReadingJournalContextChange,
    positionUnit,
    quickPreview.page,
    quickPreview.chapterName,
    quickPreview.chapterNumber,
  ]);

  useEffect(() => {
    if (!isListeningMode || !tracking.loaded || quickPreview.id) return;

    const savedMeta = getSavedQuickMeta();
    if (savedMeta.chapterName) {
      setChapterNameOptions((current) =>
        normalizeChapterNameOptions([...current, savedMeta.chapterName])
      );
    }
    if (savedMeta.chapterName && savedMeta.chapterNumber) {
      setChapterNumberByName((current) => ({
        ...current,
        [savedMeta.chapterName.trim()]: savedMeta.chapterNumber,
      }));
    }

    setQuickPreview((prev) => {
      if (!prev) return prev;

      const shouldFillPage = !prev.page.trim() && !!savedMeta.page;
      const shouldFillChapterNumber = !prev.chapterNumber.trim() && !!savedMeta.chapterNumber;
      const shouldFillChapterName = !prev.chapterName.trim() && !!savedMeta.chapterName;

      if (!shouldFillPage && !shouldFillChapterNumber && !shouldFillChapterName) {
        return prev;
      }

      return {
        ...prev,
        page: shouldFillPage && !prev.id ? savedMeta.page : prev.page,
        positionUnit: prev.id ? prev.positionUnit : tracking.method ?? "page",
        chapterNumber: shouldFillChapterNumber ? savedMeta.chapterNumber : prev.chapterNumber,
        chapterName: shouldFillChapterName ? savedMeta.chapterName : prev.chapterName,
      };
    });
  }, [quickPreview, getSavedQuickMeta, tracking.loaded, tracking.method, isListeningMode]);

  useEffect(() => {
    if (isListeningMode || !tracking.loaded || !userBookId || !canAccessBook) return;
    let cancelled = false;
    setCaptureContextReady(false);
    async function restoreRememberedCapture() {
      const unit = tracking.method ?? "page";
      let remembered = rememberedCaptureContext(getSavedQuickMeta(), unit);
      try {
        // Explicit browser-local capture state wins over unrelated progress/history.
        if (!remembered && !studentContext && !captureContextEdited.current) {
          const { data: { user } } = await supabase.auth.getUser();
          if (cancelled || captureContextEdited.current) return;
          if (user) {
            const { data, error } = await supabase.from("finalized_user_book_words")
              .select("position_unit, position_value, page_number, percent_location, chapter_number, chapter_name, user_books!inner(user_id)")
              .eq("user_book_id", userBookId).eq("user_books.user_id", user.id)
              .order("created_at", { ascending: false, nullsFirst: false })
              .order("id", { ascending: true }).limit(1);
            if (!error) remembered = vocabularyCaptureContext(data?.[0] ?? null, unit);
          }
        }
        if (!cancelled) setQuickPreview(current => restoreCaptureContext(current, remembered, captureContextEdited.current));
      } catch {
        // Restoration is optional. Never guess a location after a failed lookup.
      } finally {
        if (!cancelled) setCaptureContextReady(true);
      }
    }
    void restoreRememberedCapture();
    return () => { cancelled = true; };
  }, [isListeningMode, tracking.loaded, tracking.method, userBookId, canAccessBook, getSavedQuickMeta, studentContext]);

  useEffect(() => {
    if (!userBookId || !canAccessBook) {
      setChapterNameOptions([]);
      setChapterNumberByName({});
      return;
    }

    let cancelled = false;

    async function loadChapterNameOptions() {
      const { data, error } = await supabase
        .from("user_book_words")
        .select("chapter_name, chapter_number, created_at")
        .eq("user_book_id", userBookId)
        .not("chapter_name", "is", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading chapter name options:", error);
        return;
      }

      if (!cancelled) {
        const numberMap: Record<string, string> = {};
        for (const row of data ?? []) {
          const name = String(row.chapter_name ?? "").trim();
          if (!name || numberMap[name] || row.chapter_number == null) continue;
          numberMap[name] = String(row.chapter_number);
        }

        setChapterNameOptions(
          normalizeChapterNameOptions((data ?? []).map((row) => row.chapter_name))
        );
        setChapterNumberByName(numberMap);
      }
    }

    void loadChapterNameOptions();

    return () => {
      cancelled = true;
    };
  }, [userBookId, canAccessBook]);

  useEffect(() => {
    if (!userBookId || !canAccessBook) {
      setLastSavedWordContext(null);
      return;
    }

    void loadLastSavedWordContext();
  }, [userBookId, canAccessBook]);

  useEffect(() => {
    quickWordInputRef.current?.focus();
  }, []);

  useEffect(() => {
    onActiveTimerChange?.(isRunning || isPaused || showTimedSessionForm);
  }, [isRunning, isPaused, showTimedSessionForm, onActiveTimerChange]);

  useEffect(() => {
    if (wordCaptureOnly || !userBookId || !tracking.loaded || (isListeningMode && (!capture.ready || !canAccessBook))) return;
    if (!tracking.timersEnabled) {
      setIsRunning(false);
      setIsPaused(false);
      setStartTime(null);
      setShowTimedSessionForm(false);
      clearPersistedTimedSession(timedSessionMode, userBookId);
      return;
    }

    skippedInitialPersistenceWriteRef.current = false;
    const persisted = readPersistedTimedSession(timedSessionMode, userBookId);
    if (persisted && (!isListeningMode || (persisted.captureOwnerId === capture.owner && !capture.completed))) {
      const restoredElapsedMs = elapsedMsForPersistedTimedSession(persisted);
      const restoredRunning =
        !persisted.isPaused &&
        !persisted.showTimedSessionForm &&
        typeof persisted.startedAt === "number";

      setAccumulatedElapsedMs(Math.max(0, persisted.accumulatedElapsedMs));
      setStartTime(restoredRunning ? persisted.startedAt : null);
      setElapsed(Math.floor(restoredElapsedMs / 1000));
      setIsRunning(restoredRunning);
      setIsPaused(persisted.isPaused && !persisted.showTimedSessionForm);
      setShowTimedSessionForm(persisted.showTimedSessionForm);
      setHasFinishedTimer(persisted.showTimedSessionForm);
      setSessionDate(persisted.sessionDate);
      setSessionStartPage(persisted.trackingUnit === tracking.method ? persisted.sessionStartPage : "");
      setSessionEndPage(persisted.trackingUnit === tracking.method ? persisted.sessionEndPage : "");
      setSessionEndingPhrase(typeof persisted.sessionEndingPhrase === "string" ? persisted.sessionEndingPhrase.slice(0, 500) : "");
    }

    setTimerPersistenceReady(true);
  }, [timedSessionMode, userBookId, tracking.loaded, tracking.method, wordCaptureOnly, isListeningMode, capture.ready, capture.owner, capture.completed, canAccessBook]);

  useEffect(() => {
    if (isRunning && startTime) {
      setElapsed(
        Math.floor((accumulatedElapsedMs + Math.max(0, Date.now() - startTime)) / 1000)
      );
    }

    const interval =
      isRunning && startTime
        ? setInterval(() => {
          setElapsed(
            Math.floor(
              (accumulatedElapsedMs + Math.max(0, Date.now() - startTime)) / 1000
            )
          );
        }, 1000)
        : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [accumulatedElapsedMs, isRunning, startTime]);

  useEffect(() => {
    if (!timerPersistenceReady || !userBookId || !tracking.timersEnabled || (isListeningMode && (!capture.ready || !capture.identity || !canAccessBook))) return;

    if (!skippedInitialPersistenceWriteRef.current) {
      skippedInitialPersistenceWriteRef.current = true;
      return;
    }

    if (!isRunning && !isPaused && !showTimedSessionForm && accumulatedElapsedMs <= 0) {
      clearPersistedTimedSession(timedSessionMode, userBookId);
      return;
    }

    writePersistedTimedSession({
      version: 1,
      ...(isListeningMode && capture.identity ? { captureSessionId: capture.identity.id, captureOwnerId: capture.identity.owner, captureStartedAt: capture.identity.startedAt } : {}),
      sessionMode: timedSessionMode,
      trackingUnit: tracking.method,
      userBookId,
      startedAt: isRunning ? startTime : null,
      accumulatedElapsedMs,
      isPaused,
      sessionDate,
      sessionStartPage,
      sessionEndPage,
      sessionEndingPhrase,
      showTimedSessionForm,
      savedAt: Date.now(),
    });
  }, [
    accumulatedElapsedMs,
    isPaused,
    isRunning,
    sessionDate,
    sessionEndPage,
    sessionEndingPhrase,
    sessionStartPage,
    showTimedSessionForm,
    startTime,
    timedSessionMode,
    tracking.method,
    tracking.timersEnabled,
    capture.identity,
    capture.ready,
    canAccessBook,
    isListeningMode,
    timerPersistenceReady,
    userBookId,
  ]);

  useEffect(() => {
    if (!timerPersistenceReady || !userBookId || !tracking.timersEnabled || (isListeningMode && (!capture.ready || !capture.identity || !canAccessBook))) return;

    const persistCurrentTimer = () => {
      if (!isRunning && !isPaused && !showTimedSessionForm && accumulatedElapsedMs <= 0) return;

      writePersistedTimedSession({
        version: 1,
        ...(isListeningMode && capture.identity ? { captureSessionId: capture.identity.id, captureOwnerId: capture.identity.owner, captureStartedAt: capture.identity.startedAt } : {}),
        sessionMode: timedSessionMode,
        trackingUnit: tracking.method,
        userBookId,
        startedAt: isRunning ? startTime : null,
        accumulatedElapsedMs,
        isPaused,
        sessionDate,
        sessionStartPage,
        sessionEndPage,
        sessionEndingPhrase,
        showTimedSessionForm,
        savedAt: Date.now(),
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistCurrentTimer();
    };

    window.addEventListener("pagehide", persistCurrentTimer);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", persistCurrentTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    accumulatedElapsedMs,
    isPaused,
    isRunning,
    sessionDate,
    sessionEndPage,
    sessionEndingPhrase,
    sessionStartPage,
    showTimedSessionForm,
    startTime,
    timedSessionMode,
    tracking.method,
    tracking.timersEnabled,
    capture.identity,
    capture.ready,
    canAccessBook,
    isListeningMode,
    timerPersistenceReady,
    userBookId,
  ]);

  useEffect(() => {
    const shouldWarn = isRunning || isPaused;
    if (!shouldWarn) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning, isPaused]);

  useEffect(() => {
    let cancelled = false;

    async function loadLibraryColors() {
      if (isListeningMode || isEnglishBook) {
        setLibraryColorByWordKey({});
        return;
      }

      const wordsToCheck = [
        ...quickSessionWords.map((item) => ({
          surface: item.surface,
          reading: item.reading,
        })),
        {
          surface: quickPreview.surface,
          reading: quickPreview.reading,
        },
      ];

      const hasAnyLookupWord = wordsToCheck.some(
        (item) => item.surface?.trim() && item.reading?.trim()
      );

      if (!hasAnyLookupWord) {
        setLibraryColorByWordKey({});
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      const next = await fetchLibraryStudyColorInfoByWord(
        supabase,
        user.id,
        wordsToCheck,
        {
          includeMissingAsFirstEncounter: true,
        }
      );

      if (!cancelled) {
        setLibraryColorByWordKey(next);
      }
    }

    void loadLibraryColors();

    return () => {
      cancelled = true;
    };
  }, [quickSessionWords, quickPreview.surface, quickPreview.reading, quickPreview.id, isEnglishBook, isListeningMode]);

  function prepareForNextQuickWord() {
    if (!isListeningMode) {
      if (!quickSaveInFlight.current) quickSaveFocus.current = currentQuickSearchFocus();
      quickFocusPending.current = true;
      setQuickFocusRequest(request => request + 1);
      return;
    }
    window.setTimeout(() => {
      const input = quickWordInputRef.current;
      if (!input) return;

      input.focus({ preventScroll: true });
      const header = document.querySelector<HTMLElement>("[data-mekuru-header]");
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const visibleTop = Math.max(viewportTop, header?.getBoundingClientRect().bottom ?? 0) + 16;
      const visibleBottom = viewportTop + (window.visualViewport?.height ?? window.innerHeight) - 16;
      const bounds = input.getBoundingClientRect();
      if (bounds.top < visibleTop || bounds.bottom > visibleBottom) {
        window.scrollTo({
          top: Math.max(0, window.scrollY + bounds.top - visibleTop),
          behavior: "instant",
        });
      }
    }, 0);
  }

  function jumpToQuickWordFields() {
    window.setTimeout(() => {
      const target = quickWordFieldsRef.current;
      if (!target) return;

      const top = window.scrollY + target.getBoundingClientRect().top - (isSmallViewport() ? 18 : 96);
      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    }, 0);
  }

  async function loadLastSavedWordContext() {
    if (!userBookId) {
      setLastSavedWordContext(null);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_words")
      .select("surface, page_number, position_unit, position_value, percent_location, created_at")
      .eq("user_book_id", userBookId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error loading latest curiosity saved word:", error);
      return;
    }

    const latest = data?.[0] ?? null;
    setLastSavedWordContext(
      latest?.surface
        ? {
          surface: latest.surface,
          page: wordPositionInput(latest),
          positionUnit: wordPosition(latest).unit,
        }
        : null
    );
  }

  function invalidateQuickLookup() {
    quickLookupVersion.current += 1;
    setQuickLoading(false);
    setPersonalVocabularyLoading(false);
  }

  function clearQuickWordFields(options: { preserveSavedNotice?: boolean } = {}) {
    invalidateQuickLookup();
    setDismissedPersonalEntries([]);
    const meta = {
      page: positionUnit === (tracking.method ?? "page") ? quickPreview.page : "",
      positionUnit: tracking.method ?? "page",
      chapterNumber: quickPreview.chapterNumber,
      chapterName: quickPreview.chapterName,
    };
    setQuickPreview(current => makeBlankQuickPreview(isListeningMode || current.id ? meta : {
      page: current.page, positionUnit: current.positionUnit,
      chapterNumber: current.chapterNumber, chapterName: current.chapterName,
    }));
    setEnglishItemType("word");
    setHideKanjiInReadingSupport(false);
    setQuickError(null);
    setQuickLookupCandidates([]);
    setSelectedQuickLookupCandidateId(null);
    setPersonalVocabularyMatches([]);
    setPersonalVocabularyLoading(false);
    setPersonalVocabularySearched(false);
    setPersonalVocabularyError(null);
    setSelectedPersonalEntryKey(null);
    setMessage("");
    if (!options.preserveSavedNotice) {
      setSavedQuickNotice("");
    }
    prepareForNextQuickWord();
  }

  async function getNextPageOrder(
    userBookIdValue: string,
    chapterNum: number | null,
    pageNum: number | null
  ) {
    let query = supabase
      .from("user_book_words")
      .select("page_order")
      .eq("user_book_id", userBookIdValue);

    if (chapterNum == null) query = query.is("chapter_number", null);
    else query = query.eq("chapter_number", chapterNum);

    if (pageNum == null) query = query.eq("position_unit", positionUnit).is("position_value", null);
    else query = query.eq("position_unit", positionUnit).eq("position_value", pageNum);

    const { data, error } = await query;
    if (error) throw error;

    const maxPageOrder = Math.max(
      0,
      ...((data ?? []).map((r: any) => Number(r.page_order) || 0))
    );

    return maxPageOrder + 1;
  }

  function loadQuickSessionWordIntoPreview(item: QuickSessionWord) {
    invalidateQuickLookup();
    setQuickPreview({
      id: item.id,
      surface: item.surface,
      cacheSurface: item.cacheSurface,
      reading: item.reading,
      meanings: item.meanings,
      selectedMeaningIndex:
        item.selectedMeaningIndex == null ? 0 : item.selectedMeaningIndex,
      meaning: item.meaning,
      isCustomMeaning: item.isCustomMeaning,
      ...wordContextPayload(item),

      alternateSurface: item.alternateSurface,
      page: item.page,
      positionUnit: item.positionUnit ?? "page",
      chapterNumber: item.chapterNumber,
      chapterName: item.chapterName,
      pageOrder: item.pageOrder,
    });
    setEnglishItemType(item.itemType ?? "word");
    setHideKanjiInReadingSupport(item.hideKanjiInReadingSupport);
    setQuickLookupCandidates([]);
    setQuickError(null);
    setMessage(`Editing "${item.surface}"`);

    jumpToQuickWordFields();

    window.setTimeout(() => {
      quickWordInputRef.current?.focus({ preventScroll: true });
    }, 150);
  }

  async function pullQuickWord(wordOverride?: string) {
    if (isEnglishBook) return;

    const word = (wordOverride ?? quickPreview.surface).trim();
    if (!word) return;

    const lookupVersion = ++quickLookupVersion.current;
    setQuickLoading(true);
    setQuickError(null);
    setSavedQuickNotice("");
    setPersonalVocabularyMatches([]);
    setPersonalVocabularyLoading(false);
    setPersonalVocabularySearched(false);
    setPersonalVocabularyError(null);
    setSelectedPersonalEntryKey(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (lookupVersion !== quickLookupVersion.current) return;
      if (!isListeningMode && !studentContext) {
        setPersonalVocabularyLoading(true);
        setPersonalVocabularySearched(true);
        void searchPersonalVocabulary(word, session?.access_token, userBookId, true)
          .then((matches) => {
            if (lookupVersion !== quickLookupVersion.current) return;
            setPersonalVocabularyMatches(matches);
          })
          .catch((searchError) => {
            if (lookupVersion !== quickLookupVersion.current) return;
            setPersonalVocabularyError(
              searchError instanceof Error
                ? searchError.message
                : "Could not search your saved entries."
            );
          })
          .finally(() => {
            if (lookupVersion === quickLookupVersion.current) setPersonalVocabularyLoading(false);
          });
      } else {
        setPersonalVocabularyLoading(false);
      }
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(word)}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      const json = await res.json();
      if (lookupVersion !== quickLookupVersion.current) return;

      const candidates = buildQuickLookupCandidates(json?.data ?? [], word);
      const first = candidates[0];
      if (!first) {
        setQuickPreview((prev) => ({
          ...prev,
          cacheSurface: "",
          reading: "",
          meanings: [],
          selectedMeaningIndex: 0,
          meaning: "",
          isCustomMeaning: true,

          alternateSurface: "",
          pageOrder: null,
        }));
        setQuickLookupCandidates([]);
        setSelectedQuickLookupCandidateId(null);
        setQuickError("No result found.");
        return;
      }

      const savedMeta = getSavedQuickMeta();

      setQuickPreview((current) => ({
        ...current,
        id: null,
        surface: first.surface,
        cacheSurface: first.cacheSurface,
        reading: first.reading,
        meanings: first.meanings,
        selectedMeaningIndex: first.selectedMeaningIndex,
        meaning: first.meaning,
        isCustomMeaning: first.isCustomMeaning,

        alternateSurface: "",
        page: isListeningMode ? savedMeta.page : current.page,
        positionUnit: isListeningMode ? savedMeta.positionUnit : current.positionUnit,
        chapterNumber: isListeningMode ? savedMeta.chapterNumber : current.chapterNumber,
        chapterName: isListeningMode ? savedMeta.chapterName : current.chapterName,
        pageOrder: null,
      }));
      setQuickLookupCandidates(candidates);
      setSelectedQuickLookupCandidateId(null);
      setMessage(
        candidates.length > 1
          ? "Loaded the first result. If your book uses a different reading, choose it below."
          : ""
      );

    } catch (err) {
      if (lookupVersion !== quickLookupVersion.current) return;
      console.error(err);
      setQuickPreview((prev) => ({
        ...prev,
        cacheSurface: "",
        reading: "",
        meanings: [],
        selectedMeaningIndex: 0,
        meaning: "",
        isCustomMeaning: true,

        alternateSurface: "",
        pageOrder: null,
      }));
      setQuickLookupCandidates([]);
      setSelectedQuickLookupCandidateId(null);
      setQuickError("Could not pull word data.");
    } finally {
      if (lookupVersion === quickLookupVersion.current) setQuickLoading(false);
    }
  }

  async function savePersonalQuickWord(entry: PersonalVocabularyMatch) {
    if (quickSaveInFlight.current) return;
    invalidateQuickLookup();
    const draft: QuickPreview = {
      ...quickPreview,
      id: null,
      surface: entry.surface,
      cacheSurface: "",
      reading: entry.reading,
      meanings: [],
      selectedMeaningIndex: 0,
      meaning: entry.meaning,
      isCustomMeaning: true,
      alternateSurface: entry.alternativeSurface,
    };
    setQuickPreview(draft);
    setSelectedQuickLookupCandidateId(null);
    setSelectedPersonalEntryKey(JSON.stringify([entry.surface, entry.reading, entry.meaning]));
    setQuickError(null);
    await saveQuickWord({}, draft);
  }

  async function saveQuickWord(options: { requireSelectedLookup?: boolean } = {}, draft = quickPreview) {
    if (quickSaveInFlight.current) return;
    if (!isListeningMode) {
      quickSaveFocus.current = currentQuickSearchFocus();
      quickFocusPending.current = false;
    }
    quickSaveInFlight.current = true;
    setQuickSaving(true);
    try {
      await persistQuickWord(draft, options);
    } catch (error) {
      setQuickError(error instanceof Error ? error.message : "Could not save this word.");
    } finally {
      quickSaveInFlight.current = false;
      setQuickSaving(false);
    }
  }

  async function persistQuickWord(quickPreview: QuickPreview, options: { requireSelectedLookup?: boolean }) {
    if (isListeningMode) {
      if (!capture.identity || capture.completed || !(isRunning || isPaused || showTimedSessionForm)) return;
      if (!quickPreview.surface.trim()) return;
      const saved = await capture.save({ surface: quickPreview.surface.trim(), reading: quickPreview.reading.trim(), meaning: quickPreview.meaning, alternative_surface: quickPreview.alternateSurface.trim() });
      if (saved) clearQuickWordFields({ preserveSavedNotice: false });
      return;
    }
    if (isEnglishBook) {
      await saveEnglishQuickWord();
      return;
    }

    if (options.requireSelectedLookup && !selectedQuickLookupCandidateId && !selectedPersonalEntryKey) {
      setQuickError("Search and choose a result before saving.");
      return;
    }

    if (!userBookId || !quickPreview.surface.trim()) return;

    if (!canAccessBook) {
      setMessage("❌ You do not have access to save words to this book.");
      return;
    }

    if (!canUseCuriosityReading) {
      const copy = getFullAccessRequiredCopy(fullAccessFeature);
      setMessage(`❌ ${copy.message}`);
      return;
    }

    const selectedMeaning = quickPreview.meaning ?? "";
    const normalizedSurface = (
      quickPreview.surface
    )?.trim() ?? "";
    const normalizedCacheSurface = quickPreview.cacheSurface?.trim() || normalizedSurface;
    const normalizedReading = quickPreview.reading?.trim() ?? "";
    if (!normalizedReading) {
      setMessage("The reading cannot be left blank.");
      return;
    }
    const isManualEntry = quickPreview.isCustomMeaning && quickPreview.meanings.length === 0;

    const chapterNum = quickPreview.chapterNumber ? Number(quickPreview.chapterNumber) : null;
    const parsedPage = parseWordPosition(quickPreview.page, positionUnit);
    if (parsedPage.error) {
      setQuickError(parsedPage.error);
      return;
    }
    const pageNum = parsedPage.value;
    const chapterNameTrimmed = quickPreview.chapterName?.trim() || null;

    let vocabularyCacheId: number | null = null;

    if (normalizedCacheSurface && !isManualEntry) {
      const { data: existingCache, error: cacheLookupError } = await supabase
        .from("vocabulary_cache")
        .select("id")
        .eq("surface", normalizedCacheSurface)
        .eq("reading", normalizedReading || "")
        .maybeSingle();

      if (cacheLookupError) {
        console.error("Error looking up vocabulary cache:", {
          message: cacheLookupError.message,
          details: cacheLookupError.details,
          hint: cacheLookupError.hint,
          code: cacheLookupError.code,
          table: "vocabulary_cache",
          select: "id",
          surface: normalizedCacheSurface,
          reading: normalizedReading || "",
        });
        setMessage(`❌ Could not save word: ${cacheLookupError.message}`);
        return;
      }

      if (existingCache?.id) {
        vocabularyCacheId = existingCache.id;
      } else {
        const { data: createdCache, error: cacheInsertError } = await supabase
          .from("vocabulary_cache")
          .insert({
            surface: normalizedCacheSurface,
            reading: normalizedReading || "",
          })
          .select("id")
          .single();

        if (cacheInsertError) {
          console.error("Error creating vocabulary cache row:", {
            message: cacheInsertError.message,
            details: cacheInsertError.details,
            hint: cacheInsertError.hint,
            code: cacheInsertError.code,
          });
          setMessage(cacheInsertError.message.includes("vocabulary_cache_reading_not_blank")
            ? "The reading cannot be left blank."
            : `❌ Could not save word: ${cacheInsertError.message}`);
          return;
        }

        vocabularyCacheId = createdCache.id;
      }
    }

    const editingExisting =
      quickPreview.id != null
        ? quickSessionWords.find((w) => w.id === quickPreview.id) ?? null
        : null;

    const basePayload = {
      user_book_id: userBookId,
      vocabulary_cache_id: vocabularyCacheId,
      surface: normalizedSurface || null,
      base_form: quickPreview.cacheSurface || quickPreview.surface,
      ...wordContextPayload(quickPreview),
      alternative_surface: quickPreview.alternateSurface.trim() || null,
      reading: quickPreview.reading || null,
      meaning: selectedMeaning || null,
      meaning_choices: quickPreview.meanings,
      meaning_choice_index: quickPreview.isCustomMeaning
        ? null
        : quickPreview.selectedMeaningIndex,
      ...wordPositionPayload(pageNum, positionUnit),
      chapter_number: chapterNum,
      chapter_name: chapterNameTrimmed,
      hide_kanji_in_reading_support: hideKanjiInReadingSupport,
      excluded_from_flashcards: !isReadyForFlashcards({
        surface: normalizedSurface,
        reading: quickPreview.reading,
        meaning: selectedMeaning,
      }),
    };

    if (!editingExisting) {
      const payload = {
        ...basePayload,
        page_order: await getNextPageOrder(userBookId, chapterNum, pageNum),
      };

      const { data, error } = studentContext ? await saveStudentWord(studentContext, payload) : await supabase
        .from("user_book_words")
        .insert(payload)
        .select(
          "id, surface, reading, meaning, meaning_choices, meaning_choice_index, position_unit, position_value, percent_location, page_number, page_order, chapter_number, chapter_name, hide_kanji_in_reading_support, alternative_surface, book_form, book_form_description, follow_along_support_note"
        )
        .single();

      if (error) {
        console.error("Error saving quick word:", error);
        setMessage(`❌ Could not save word: ${error.message}`);
        return;
      }

      const newItem: QuickSessionWord = {
        ...wordContextPayload(data),
        id: String(data.id),
        surface: data.surface ?? "",
        reading: data.reading ?? "",
        meaning: data.meaning ?? "",
        page: wordPositionInput(data),
        positionUnit: wordPosition(data).unit,
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: data.meaning_choices ?? quickPreview.meanings,
        selectedMeaningIndex:
          data.meaning_choice_index == null ? null : Number(data.meaning_choice_index),
        isCustomMeaning: data.meaning_choice_index == null,
        cacheSurface: normalizedCacheSurface,

        alternateSurface: quickPreview.alternateSurface,
        hideKanjiInReadingSupport: !!data.hide_kanji_in_reading_support,
        pageOrder: data.page_order ?? null,
      };

      setQuickSessionWords((prev) => upsertAndSortQuickSessionWords(prev, newItem));
      void tracking.refreshSummary();
      setChapterNameOptions((current) => addChapterNameOption(current, data.chapter_name));
      if (data.chapter_name && data.chapter_number != null) {
        setChapterNumberByName((current) => ({
          ...current,
          [String(data.chapter_name).trim()]: String(data.chapter_number),
        }));
      }
      setSavedQuickNotice(`Saved: ${newItem.surface}`);
      setLastSavedWordContext({
        surface: newItem.surface,
        page: newItem.page, positionUnit: newItem.positionUnit,
      });
      setMessage("");
    } else {
      const { data, error } = studentContext ? await saveStudentWord(studentContext, basePayload, editingExisting.id) : await supabase
        .from("user_book_words")
        .update(basePayload)
        .eq("id", editingExisting.id)
        .eq("user_book_id", userBookId)
        .select(
          "id, surface, reading, meaning, meaning_choices, meaning_choice_index, position_unit, position_value, percent_location, page_number, page_order, chapter_number, chapter_name, hide_kanji_in_reading_support, alternative_surface, book_form, book_form_description, follow_along_support_note"
        )
        .single();

      if (error) {
        console.error("Error updating quick word:", error);
        setMessage(`❌ Could not update word: ${error.message}`);
        return;
      }

      const updatedItem: QuickSessionWord = {
        ...wordContextPayload(data),
        id: String(data.id),
        surface: data.surface ?? "",
        reading: data.reading ?? "",
        meaning: data.meaning ?? "",
        page: wordPositionInput(data),
        positionUnit: wordPosition(data).unit,
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: data.meaning_choices ?? quickPreview.meanings,
        selectedMeaningIndex:
          data.meaning_choice_index == null ? null : Number(data.meaning_choice_index),
        isCustomMeaning: data.meaning_choice_index == null,
        cacheSurface: normalizedCacheSurface,

        alternateSurface: quickPreview.alternateSurface,
        hideKanjiInReadingSupport: !!data.hide_kanji_in_reading_support,
        pageOrder: data.page_order ?? null,
      };

      setQuickSessionWords((prev) => upsertAndSortQuickSessionWords(prev, updatedItem));
      void tracking.refreshSummary();
      setChapterNameOptions((current) => addChapterNameOption(current, data.chapter_name));
      if (data.chapter_name && data.chapter_number != null) {
        setChapterNumberByName((current) => ({
          ...current,
          [String(data.chapter_name).trim()]: String(data.chapter_number),
        }));
      }
      setSavedQuickNotice(`Saved: ${updatedItem.surface}`);
      setLastSavedWordContext({
        surface: updatedItem.surface,
        page: updatedItem.page, positionUnit: updatedItem.positionUnit,
      });
      setMessage("");
    }

    if (vocabularyCacheId && hasKanji(normalizedCacheSurface)) {
      await generateVocabularyKanjiMap(vocabularyCacheId);
    }

    clearQuickWordFields({ preserveSavedNotice: true });
  }

  async function saveEnglishQuickWord() {
    const cleanSource = quickPreview.surface.trim();
    const cleanSupport = quickPreview.meaning.trim();

    if (!userBookId || !cleanSource) return;

    if (!cleanSupport) {
      setMessage("❌ Add Japanese meaning/support.");
      return;
    }

    if (!canAccessBook) {
      setMessage("❌ You do not have access to save words to this book.");
      return;
    }

    if (!canUseCuriosityReading) {
      const copy = getFullAccessRequiredCopy(fullAccessFeature);
      setMessage(`❌ ${copy.message}`);
      return;
    }

    const chapterNum = quickPreview.chapterNumber ? Number(quickPreview.chapterNumber) : null;
    const parsedPage = parseWordPosition(quickPreview.page, positionUnit);
    if (parsedPage.error) {
      setQuickError(parsedPage.error);
      return;
    }
    const pageNum = parsedPage.value;
    const chapterNameTrimmed = quickPreview.chapterName?.trim() || null;

    const editingExisting =
      quickPreview.id != null
        ? quickSessionWords.find((w) => w.id === quickPreview.id) ?? null
        : null;

    const basePayload = {
      user_book_id: userBookId,
      vocabulary_cache_id: null,
      surface: cleanSource,
      encountered_surface: cleanSource,
      base_form: cleanSource,
      lookup_surface: cleanSource,
      target_language_code: "en",
      support_language_code: "ja",
      item_type: englishItemType,
      reading: null,
      meaning: cleanSupport,
      other_definition: cleanSupport,
      meaning_choices: [],
      meaning_choice_index: null,
      jlpt: null,
      is_common: null,
      ...wordPositionPayload(pageNum, positionUnit),
      chapter_number: chapterNum,
      chapter_name: chapterNameTrimmed,
      hide_kanji_in_reading_support: false,
      seen_on: todayYmdAppTimeZone(),
      excluded_from_flashcards: false,
    };

    if (!editingExisting) {
      const payload = {
        ...basePayload,
        page_order: await getNextPageOrder(userBookId, chapterNum, pageNum),
      };

      const { data, error } = studentContext ? await saveStudentWord(studentContext, payload) : await supabase
        .from("user_book_words")
        .insert(payload)
        .select(
          "id, surface, reading, meaning, position_unit, position_value, percent_location, page_number, page_order, chapter_number, chapter_name, item_type"
        )
        .single();

      if (error) {
        const readableError = readableSupabaseError(error);
        console.error("Error saving English quick word:", readableError, error);
        setMessage(`❌ Could not save item: ${readableError}`);
        return;
      }

      const newItem: QuickSessionWord = {
        ...wordContextPayload(data),
        id: String(data.id),
        surface: data.surface ?? cleanSource,
        reading: data.reading ?? "",
        meaning: data.meaning ?? cleanSupport,
        page: wordPositionInput(data),
        positionUnit: wordPosition(data).unit,
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: [],
        selectedMeaningIndex: null,
        isCustomMeaning: true,
        cacheSurface: "",

        alternateSurface: "",
        hideKanjiInReadingSupport: false,
        pageOrder: data.page_order ?? null,
        itemType: data.item_type === "phrase" ? "phrase" : "word",
      };

      setQuickSessionWords((prev) => upsertAndSortQuickSessionWords(prev, newItem));
      void tracking.refreshSummary();
      setChapterNameOptions((current) => addChapterNameOption(current, data.chapter_name));
      if (data.chapter_name && data.chapter_number != null) {
        setChapterNumberByName((current) => ({
          ...current,
          [String(data.chapter_name).trim()]: String(data.chapter_number),
        }));
      }
      setSavedQuickNotice(`Saved: ${newItem.surface}`);
      setLastSavedWordContext({
        surface: newItem.surface,
        page: newItem.page, positionUnit: newItem.positionUnit,
      });
      setMessage("");
    } else {
      const { data, error } = studentContext ? await saveStudentWord(studentContext, basePayload, editingExisting.id) : await supabase
        .from("user_book_words")
        .update(basePayload)
        .eq("id", editingExisting.id)
        .eq("user_book_id", userBookId)
        .select(
          "id, surface, reading, meaning, position_unit, position_value, percent_location, page_number, page_order, chapter_number, chapter_name, item_type"
        )
        .single();

      if (error) {
        const readableError = readableSupabaseError(error);
        console.error("Error updating English quick word:", readableError, error);
        setMessage(`❌ Could not update item: ${readableError}`);
        return;
      }

      const updatedItem: QuickSessionWord = {
        ...wordContextPayload(data),
        id: String(data.id),
        surface: data.surface ?? cleanSource,
        reading: data.reading ?? "",
        meaning: data.meaning ?? cleanSupport,
        page: wordPositionInput(data),
        positionUnit: wordPosition(data).unit,
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: [],
        selectedMeaningIndex: null,
        isCustomMeaning: true,
        cacheSurface: "",

        alternateSurface: "",
        hideKanjiInReadingSupport: false,
        pageOrder: data.page_order ?? null,
        itemType: data.item_type === "phrase" ? "phrase" : "word",
      };

      setQuickSessionWords((prev) => upsertAndSortQuickSessionWords(prev, updatedItem));
      void tracking.refreshSummary();
      setChapterNameOptions((current) => addChapterNameOption(current, data.chapter_name));
      if (data.chapter_name && data.chapter_number != null) {
        setChapterNumberByName((current) => ({
          ...current,
          [String(data.chapter_name).trim()]: String(data.chapter_number),
        }));
      }
      setSavedQuickNotice(`Saved: ${updatedItem.surface}`);
      setLastSavedWordContext({
        surface: updatedItem.surface,
        page: updatedItem.page, positionUnit: updatedItem.positionUnit,
      });
      setMessage("");
    }

    clearQuickWordFields({ preserveSavedNotice: true });
  }

  async function deleteQuickWordById(id: string) {
    if (!userBookId) return;

    const { error } = studentContext ? await saveStudentWord(studentContext, {}, id, true) : await supabase
      .from("user_book_words")
      .delete()
      .eq("id", id)
      .eq("user_book_id", userBookId);

    if (error) {
      console.error("Error deleting quick word:", error);
      setMessage(`❌ Could not delete word: ${error.message}`);
      return;
    }

    setQuickSessionWords((prev) => prev.filter((item) => item.id !== id));
    void tracking.refreshSummary();
    void loadLastSavedWordContext();

    if (quickPreview.id === id) {
      clearQuickWordFields();
    }

    setMessage("✅ Word deleted from Vocab List.");
  }

  async function openTimedSessionFormWithDefaults() {
    if (showTimedSessionForm) return; // Preserve edits if the existing form is reopened.
    if (!userBookId) {
      setShowTimedSessionForm(true);
      return;
    }

    const bookmarkStart = tracking.method === "page" && resumeBookmark.available && resumeBookmark.eligible
        ? nextSessionStartPage(resumeBookmark.bookmark, progressTotal) : null;
    if (!isListeningMode && bookmarkStart !== null) {
        setSessionStartPage(bookmarkStart);
        setSessionEndPage("");
        setShowTimedSessionForm(true);
        return;
    }

    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("end_page, end_position, tracking_unit, read_on, created_at")
      .eq("tracking_unit", tracking.method ?? "page")
      .eq("user_book_id", userBookId)
      .order("read_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error loading latest reading session:", error);
      setShowTimedSessionForm(true);
      return;
    }

    const latest = data?.[0];
    const latestPosition = latest ? sessionEnd(latest) : null;
    setSessionStartPage(isListeningMode ? "" : nextProgressStart(latestPosition, tracking.method, progressTotal));
    setSessionEndPage("");
    setShowTimedSessionForm(true);
  }

  async function saveReadingSession() {
    if (!tracking.timersEnabled) return;
    if (!userBookId) return;

    if (!tracking.requireMethod() || !tracking.method) return;
    const parsed = parseProgressRange(isListeningMode ? "" : sessionStartPage, sessionEndPage, tracking.method, progressTotal);
    if (parsed.error) { setMessage(parsed.error); return; }
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const readOn = isListeningMode ? sessionDate || todayYmdAppTimeZone() : todayYmdAppTimeZone();

    const historyPayload = {
      user_book_id: userBookId, read_on: readOn, ...parsed.payload,
      minutes_read: minutes, session_mode: isListeningMode ? "listening" : "curiosity",
      ...(sessionEndingPhrase.trim() ? { ending_phrase: sessionEndingPhrase.trim() } : {}),
    };
    if (isListeningMode) {
      if (!await capture.finish(historyPayload)) return;
    } else {
      const { error } = await supabase.from("user_book_reading_sessions").insert(historyPayload);
      if (error) { setMessage(`❌ Could not save reading session: ${error.message}`); return; }
    }

    if (isListeningMode && nativeListeningPosition && tracking.method !== "audiobook_time" && tracking.method !== "percent") {
      const { data: currentBookStatus, error: currentBookStatusError } = await supabase
        .from("user_books")
        .select("started_at")
        .eq("id", userBookId)
        .maybeSingle();

      if (currentBookStatusError) {
        console.error("Error loading user_books status after listening session:", currentBookStatusError);
      }

      const bookStatusUpdate: {
        status: "reading";
        personal_tracking_status: "reading";
        started_at?: string;
        current_location: string | null;
      } = {
        status: "reading",
        personal_tracking_status: "reading",
        current_location: sessionEndPage.trim() || null,
      };
      if (!currentBookStatus?.started_at) bookStatusUpdate.started_at = readOn;

      const { error: updateError } = await supabase
        .from("user_books")
        .update(bookStatusUpdate)
        .eq("id", userBookId);
      if (updateError) {
        console.error("Error updating user_books after listening session:", updateError);
      }
    }

    if (!isListeningMode) {
      const { data: currentBookStatus, error: currentBookStatusError } = await supabase
        .from("user_books")
        .select("started_at")
        .eq("id", userBookId)
        .maybeSingle();

      if (currentBookStatusError) {
        console.error("Error loading user_books status after reading session:", currentBookStatusError);
      }

      const bookStatusUpdate: {
        status: "reading";
        personal_tracking_status: "reading";
        started_at?: string;
      } = {
        status: "reading",
        personal_tracking_status: "reading",
      };

      // Logging a reading session should only backfill the book's start date.
      // It should not overwrite an existing Started date in the Book Status box.
      if (!currentBookStatus?.started_at) {
        bookStatusUpdate.started_at = readOn;
      }

      const { error: updateError } = await supabase
        .from("user_books")
        .update(bookStatusUpdate)
        .eq("id", userBookId);

      if (updateError) {
        console.error("Error updating user_books after reading session:", updateError);
      }
    }

    const bookmarkSave = tracking.method === "page"
      ? await resumeBookmark.save(sessionEndPage)
      : { saved: false, skipped: true as const };

    setTimerSaveMessage(
      `${isListeningMode
        ? "Your listening session has been saved in Reading History."
        : "Your curiosity session has been saved in Reading History."}${bookmarkSave.error ? " The session was saved, but the resume bookmark could not be updated." : ""}`
    );
    window.setTimeout(() => setTimerSaveMessage(""), 4000);

    void tracking.refreshSummary();
    markPhraseSaved();
    setSessionStartPage("");
    setSessionEndPage("");
    setShowTimedSessionForm(false);
    setElapsed(0);
    setAccumulatedElapsedMs(0);
    setStartTime(null);
    setIsRunning(false);
    setIsPaused(false);
    clearPersistedTimedSession(timedSessionMode, userBookId);
    setMessage("");
  }

  const quickPreviewLibraryColorInfo =
    libraryColorByWordKey[
    makeLibraryStudyColorKey(quickPreview.surface, quickPreview.reading)
    ] ?? null;

  if (!accessChecked) {
    const loadingState = (
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-gray-500">Loading book info…</p>
      </div>
    );

    return embedded ? (
      loadingState
    ) : (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        {loadingState}
      </main>
    );
  }

  if (!canAccessBook) {
    return (
      <AccessDeniedMessage message={accessMessage || "You do not have access to this book."} />
    );
  }

  if (!canUseCuriosityReading) {
    const copy = getFullAccessRequiredCopy(fullAccessFeature);

    return (
      <CuriosityFullAccessRequired
        title={copy.title}
        message={copy.message}
        bookTitle={bookTitle}
        onBackToBookHub={() => {
          router.push(`/books/${encodeURIComponent(userBookId)}`);
        }}
        onUseJustReadingTimer={() => {
          router.push(`/books/${encodeURIComponent(userBookId)}/just-reading`);
        }}
      />
    );
  }

  function searchScratchWord() {
    if (isEnglishBook) return;

    const nextWord = scratchWord.trim();

    if (!nextWord) {
      return;
    }

    setDismissedPersonalEntries([]);
    setQuickPreview((prev) => ({
      ...prev,
      surface: nextWord,
      cacheSurface: "",
    }));

    closeAndClearWordHelp();
    setSavedQuickNotice("");
    if (quickLookupCandidates.length > 0) setQuickLookupCandidates([]);

    void pullQuickWord(nextWord);

    window.requestAnimationFrame(() => quickWordInputRef.current?.focus());
  }

  const useCompactSessionBar = !isListeningMode;

  const timerPanel = tracking.timersEnabled ? (
    <CuriosityTimerPanel
      timerReminder={timerReminder}
      title={timerTitle}
      description={timerDescription}
      saveTitle={saveSessionTitle}
      startPageLabel={`Start ${labels.unit.toLowerCase()}`}
      endPageLabel={`End ${labels.unit.toLowerCase()}`}
      listeningProgressOnly={isListeningMode}
      startDisabled={isListeningMode && (!capture.ready || !capture.owner)}
      sessionSaving={isListeningMode && capture.isFinalizing}
      isRunning={isRunning}
      isPaused={isPaused}
      elapsed={elapsed}
      showTimedSessionForm={showTimedSessionForm}
      sessionStartPage={sessionStartPage}
      sessionEndPage={sessionEndPage}
      endingPhraseField={!(resumeBookmark.available && resumeBookmark.eligible) ? <SessionEndingPhraseField value={sessionEndingPhrase} onChange={setSessionEndingPhrase} listening={isListeningMode} /> : null}
      resumeBookmarkFeedback={<ResumeBookmarkFeedback bookmark={resumeBookmark} />}
      resumeBookmarkSection={tracking.method === "page" && tracking.canChoose ? (
        <ResumeBookmarkSection
          available={resumeBookmark.available && resumeBookmark.eligible}
          endingPage={bookmarkEndingPage}
          kind={resumeBookmark.choice}
          phrase={resumeBookmark.phrase}
          onKindChange={resumeBookmark.setChoice}
          onPhraseChange={resumeBookmark.setPhrase}
        />
      ) : null}
      latestEndingPhrase={isListeningMode || resumeBookmark.bookmark ? null : wordCaptureOnly ? <LatestEndingPhrase phrase={latestEndingPhrase} /> : null}
      timerSaveMessage={timerSaveMessage}
      formatTimer={formatTimer}
      compact={workspaceCompact || useCompactSessionBar}
      onStart={() => {
        if (isListeningMode && (showTimedSessionForm || (capture.identity && !capture.completed))) return;
        if (!tracking.timersEnabled) return;
        if (!tracking.requireMethod()) return;
        resumeBookmark.skip();
        const startedAt = Date.now();
        if (isListeningMode) {
          const identity = capture.start(identity => writePersistedTimedSession({version:1, sessionMode:"listening", userBookId, captureSessionId:identity.id, captureOwnerId:identity.owner, captureStartedAt:identity.startedAt, startedAt, accumulatedElapsedMs:0, isPaused:false, sessionDate:todayYmdAppTimeZone(), sessionStartPage:"", sessionEndPage:"", showTimedSessionForm:false, savedAt:startedAt, trackingUnit:tracking.method}));
          if (!identity) return;
          clearQuickWordFields();
          void capture.ensure(identity).catch((error) => {
            const details = error instanceof Error ? error.message : String(error);
            const migrationHint = /PGRST202|PGRST205|42883|42P01|schema cache|does not exist/i.test(details)
              ? " The listening-capture migration may be missing from this database."
              : "";
            setMessage(`❌ Listening capture could not connect. Your timer is running and recoverable.${migrationHint} ${details}`);
          });
        }
        setSessionDate(todayYmdAppTimeZone());
        setStartTime(startedAt);
        setAccumulatedElapsedMs(0);
        setElapsed(0);
        setIsRunning(true);
        setIsPaused(false);
        setHasFinishedTimer(false);
        setShowTimedSessionForm(false);
      }}
      onPause={() => {
        const nextElapsedMs =
          accumulatedElapsedMs + (startTime ? Math.max(0, Date.now() - startTime) : 0);

        if (startTime) {
          setElapsed(Math.floor(nextElapsedMs / 1000));
        }
        setAccumulatedElapsedMs(nextElapsedMs);
        setStartTime(null);
        setIsRunning(false);
        setIsPaused(true);
      }}
      onFinish={() => {
        const nextElapsedMs =
          accumulatedElapsedMs + (startTime ? Math.max(0, Date.now() - startTime) : 0);

        setAccumulatedElapsedMs(nextElapsedMs);
        setElapsed(Math.floor(nextElapsedMs / 1000));
        setStartTime(null);
        setIsRunning(false);
        setIsPaused(false);
        setHasFinishedTimer(true);
        void openTimedSessionFormWithDefaults();
      }}
      onResume={() => {
        if (!tracking.timersEnabled) return;
        setStartTime(Date.now());
        setIsPaused(false);
        setIsRunning(true);
      }}
      onSaveSession={() => void saveReadingSession()}
      onCancelSession={() => {
        if (isListeningMode) {
          resumeBookmark.skip();
          setShowTimedSessionForm(false); setHasFinishedTimer(false); setIsPaused(true);
          return;
        }
        resumeBookmark.skip();
        setSessionEndingPhrase("");
        setShowTimedSessionForm(false);
        setElapsed(0);
        setAccumulatedElapsedMs(0);
        setStartTime(null);
        setIsPaused(false);
        setIsRunning(false);
        if (userBookId) {
          clearPersistedTimedSession(timedSessionMode, userBookId);
        }
      }}
      onSessionStartPageChange={setSessionStartPage}
      onSessionEndPageChange={setSessionEndPage}
    />
  ) : null;

  const sessionBar = (
    <>
      {!embedded && tracking.method === "page" && tracking.canChoose ? <ResumeBookmarkSummary userBookId={userBookId} /> : null}
      {bookTitle && (!workspaceCompact || wordCaptureOnly) ? (
        <Link
          href={`/books/${encodeURIComponent(userBookId)}`}
          className="mb-2 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Book Hub
        </Link>
      ) : null}

      <section className="rounded-xl border border-stone-200 bg-white p-2.5 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[minmax(16rem,1fr)_auto_minmax(8rem,1fr)] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            {bookTitle ? (
              <Link
                href={`/books/${encodeURIComponent(userBookId)}`}
                className="shrink-0 rounded-lg text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400"
                title={`Go to ${bookTitle} Book Hub`}
              >
                {bookCover ? (
                  <img
                    src={bookCover}
                    alt={`Go to ${bookTitle} Book Hub`}
                    className="h-14 w-10 rounded-md object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-14 w-10 items-center justify-center rounded-md bg-stone-100 px-1 text-center text-[10px] text-stone-400">
                    No cover
                  </div>
                )}
              </Link>
            ) : null}

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">
                Current book
              </p>
              {bookTitle ? (
                <div className="mt-0.5 truncate text-sm font-black text-stone-900">
                  {bookTitle}
                </div>
              ) : null}
              {curiosityProgressLine ? (
                <p className="mt-0.5 truncate text-xs font-medium text-stone-500">
                  {curiosityProgressLine}
                </p>
              ) : null}
              <CuriosityStatusMessage message={message} />
            </div>
          </div>

          <div className="min-w-0 lg:justify-self-center">
            {timerPanel}
          </div>

          {bookTitle ? (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link
                href={`/books/${encodeURIComponent(userBookId)}/words`}
                className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                Vocab List
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );

  const content = (
    <>
      {!isListeningMode && quickSessionWords.length > 0 && !isRunning && !isPaused && !showTimedSessionForm && !hasFinishedTimer && elapsed === 0 ?
        <VocabularyProgressPrompt userBookId={userBookId} studentId={studentContext?.studentId} sourceUserBookId={studentContext?.sourceUserBookId}
          positions={quickSessionWords.map(word => ({ value: word.page, unit: word.positionUnit }))} /> : null}
      {!wordCaptureOnly && showProgressSummaryBar ? <BookProgressSummaryBar userBookId={userBookId} listening={isListeningMode} showBackLink={workspaceCompact} /> : null}
      {useCompactSessionBar ? (
        <>
          <CuriosityPageHeader title={pageTitle} description={pageDescription} />
          {modeSwitchSlot}
          {sessionBar}
        </>
      ) : (
        <>
          <CuriosityPageHeader title={pageTitle} description={pageDescription} />
          {userBookId ? (
            bookTitle ? (
              <CuriosityBookContextCard
                showBackLink={!workspaceCompact || wordCaptureOnly}
                bookTitle={bookTitle}
                bookCover={bookCover}
                contextLine={
                  wordCaptureOnly
                    ? curiosityProgressLine
                    : isListeningMode ? "Listening timer + heard words" : undefined
                }
                bookHubHref={`/books/${encodeURIComponent(userBookId)}`}
                vocabListHref={`/books/${encodeURIComponent(userBookId)}/words`}
              />
            ) : null
          ) : (
            <p className="mb-6 text-sm text-gray-500">
              Open with <code className="rounded bg-gray-100 px-1 py-0.5">?userBookId=...</code>
            </p>
          )}

          <CuriosityStatusMessage message={message} />

          {timerPanel}
        </>
      )}

      {!isListeningMode && <div className={workspaceCompact ? "hidden" : "md:hidden"}>
        {isEnglishBook ? (
          <CuriosityAddEditWordCard
            title="Save English Word / Phrase"
            description="Add English from this book with Japanese support."
          >
            <CuriosityAddEditWordFormShell
              editingSurface={quickPreview.id ? quickPreview.surface : null}
            >
              <AddEnglishWordFields
                itemType={englishItemType}
                source={quickPreview.surface}
                support={quickPreview.meaning}
                positionUnit={positionUnit}
                onPositionUnitChange={(unit) => editQuickContext(prev => ({ ...prev, positionUnit: unit }))}
                pageNumber={quickPreview.page}
                chapterNumber={quickPreview.chapterNumber}
                chapterName={quickPreview.chapterName}
                chapterNameOptions={sortedChapterNameOptions}
                saving={quickLoading || quickSaving}
                isEditing={quickPreview.id != null}
                savedNotice={savedQuickNotice}
                onItemTypeChange={setEnglishItemType}
                onSourceChange={(value) => {
                  setQuickPreview((prev) => ({
                    ...prev,
                    surface: value,
                    cacheSurface: "",
                    reading: "",
                    meanings: [],
                    selectedMeaningIndex: 0,
                    isCustomMeaning: true,

                    alternateSurface: "",
                    pageOrder: null,
                  }));
                  setSavedQuickNotice("");
                }}
                onSupportChange={(value) => {
                  setQuickPreview((prev) => ({
                    ...prev,
                    meaning: value,
                    meanings: [],
                    selectedMeaningIndex: 0,
                    isCustomMeaning: true,
                  }));
                  setSavedQuickNotice("");
                }}
                onPageNumberChange={(value) =>
                  editQuickContext((prev) => ({ ...prev, page: value }))
                }
                onChapterNumberChange={(value) =>
                  editQuickContext((prev) => ({ ...prev, chapterNumber: value }))
                }
                onChapterNameChange={(value) =>
                  editQuickContext((prev) => {
                    const knownChapterNumber = chapterNumberByName[value.trim()];
                    return {
                      ...prev,
                      chapterName: value,
                      chapterNumber: knownChapterNumber || prev.chapterNumber,
                    };
                  })
                }
                onSaveWord={() => void saveQuickWord()}
                onClearWordFields={() => clearQuickWordFields()}
              />
            </CuriosityAddEditWordFormShell>
          </CuriosityAddEditWordCard>
        ) : (
          <>
          <MobileQuickCapture
            title={isListeningMode ? "Save a heard word" : "Save a word"}
            description={
              isListeningMode
                ? "Type a word you heard, search it, and save it without leaving your listening timer."
                : "Type a word from your book, search it, and save it without leaving your reading timer."
            }
            surface={quickPreview.surface}
            reading={quickPreview.reading}
            meaning={quickPreview.meaning}
            isPersonalEntry={Boolean(selectedPersonalEntryKey)}
            meanings={quickPreview.meanings}
            selectedMeaningIndex={quickPreview.selectedMeaningIndex}
            positionLabel={positionLabel(positionUnit)}
            position={quickPreview.page}
            quickLoading={quickLoading || quickSaving}
            quickError={quickError}
            savedNotice={savedQuickNotice}
            canSaveWord={Boolean(
              (selectedPersonalEntryKey && quickPreview.surface.trim() && quickPreview.reading.trim() && quickPreview.meaning.trim()) ||
              (quickPreview.cacheSurface.trim() && quickPreview.meaning.trim() && !quickPreview.isCustomMeaning)
            )}
            selectedCandidateId={selectedQuickLookupCandidateId ?? selectedPersonalEntryKey}
            recognition={!isListeningMode && !studentContext && personalVocabularyMatches.some(entry => !dismissedPersonalEntries.includes(personalVocabularyEntryKey(entry))) ? (
              <PersonalVocabularyResults
                dismissedKeys={dismissedPersonalEntries}
                onDismiss={(entry) => setDismissedPersonalEntries(current => [...new Set([...current, personalVocabularyEntryKey(entry)])])}
                entries={personalVocabularyMatches}
                searched={personalVocabularySearched}
                loading={personalVocabularyLoading}
                error={personalVocabularyError}
                saving={quickSaving}
                onSelect={(entry) => void savePersonalQuickWord(entry)}
              />
            ) : null}
            captureLocationFields={!isListeningMode ? (
              <div className="mt-3 grid gap-3 rounded-2xl border border-stone-200 bg-white p-3">
                <WordPositionField value={quickPreview.page} unit={positionUnit} onChange={value => editQuickContext(current => ({ ...current, page: value }))} />
                <ChapterNameCombobox value={quickPreview.chapterName} chapterOptions={sortedChapterNameOptions} onChange={value => editQuickContext(current => ({
                  ...current, chapterName: value, chapterNumber: chapterNumberByName[value.trim()] || current.chapterNumber,
                }))} />
                <label className="block text-sm font-medium text-stone-700">
                  Chapter number
                  <input value={quickPreview.chapterNumber} onChange={event => editQuickContext(current => ({ ...current, chapterNumber: event.target.value }))} placeholder="Chapter #" className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm" />
                </label>
              </div>
            ) : undefined}
            candidates={quickLookupCandidates}
            lastAddedWord={quickSessionWords[0] ?? null}
            inputRef={isListeningMode ? quickWordInputRef : mobileQuickWordInputRef}
            onSurfaceChange={(value) => {
              invalidateQuickLookup();
              setDismissedPersonalEntries([]);
              setQuickPreview((prev) => ({
                ...prev,
                surface: value,
                cacheSurface: "",
                reading: "",
                meanings: [],
                selectedMeaningIndex: 0,
                meaning: "",
                isCustomMeaning: true,

                alternateSurface: "",
                pageOrder: null,
              }));
              setSavedQuickNotice("");
              setSelectedQuickLookupCandidateId(null);
              setSelectedPersonalEntryKey(null);
              setPersonalVocabularyMatches([]);
              setPersonalVocabularyLoading(false);
              setPersonalVocabularySearched(false);
              setPersonalVocabularyError(null);
              if (quickLookupCandidates.length > 0) setQuickLookupCandidates([]);
            }}
            onReadingChange={(value) => setQuickPreview((prev) => ({ ...prev, reading: value }))}
            onMeaningChange={(value) => setQuickPreview((prev) => ({ ...prev, meaning: value }))}
            onClearWordFields={() => clearQuickWordFields()}
            isEditing={quickPreview.id != null}
            clearDisabled={quickSaving}
            onSearch={() => void pullQuickWord()}
            onSearchKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void pullQuickWord();
              }
            }}
            onSelectCandidate={(candidate) => {
              invalidateQuickLookup();
              setQuickPreview((prev) => ({
                ...prev,
                surface: candidate.surface,
                cacheSurface: candidate.cacheSurface,
                reading: candidate.reading,
                meanings: candidate.meanings,
                selectedMeaningIndex: candidate.selectedMeaningIndex,
                meaning: candidate.meaning,
                isCustomMeaning: candidate.isCustomMeaning,
              }));
              setSelectedQuickLookupCandidateId(candidate.id);
              setSelectedPersonalEntryKey(null);
              setQuickError(null);
            }}
            onMeaningChoiceChange={(index, meaning) =>
              setQuickPreview((prev) => ({
                ...prev,
                selectedMeaningIndex: index,
                meaning,
                isCustomMeaning: false,
              }))
            }
            onPositionChange={(value) =>
              editQuickContext((prev) => ({
                ...prev,
                page: value,
              }))
            }
            onSaveWord={() => void saveQuickWord({ requireSelectedLookup: true })}
            onDeleteLastWord={(id) => void deleteQuickWordById(id)}
          />

          </>
        )}
      </div>

      }
      {isListeningMode && capture.error && <p role="alert" className="my-3 text-sm text-red-700">{capture.error}<button type="button" className="ml-2 underline" disabled={capture.busy} onClick={() => void capture.recover()}>Retry recovery</button></p>}
      {isListeningMode && !capture.completed && !canCaptureListeningWord && <p className="my-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">Start the listening timer to enable word capture. Your words will be saved per listening session in Reading History, separate from your reading vocabulary.</p>}
      {(!isListeningMode || !capture.completed) && <fieldset disabled={quickSaving || (isListeningMode && (capture.busy || capture.isFinalizing || !canCaptureListeningWord))} className="min-w-0">
      <div
        className={
          isListeningMode ? "block" : workspaceCompact && workspaceAside
            ? onCloseWorkspaceAside
              ? "grid min-w-0 md:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] md:items-start md:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,32rem)]"
              : "hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] md:items-start md:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,32rem)]"
            : workspaceCompact ? "block" : "hidden md:block"
        }
      >
        <div className="min-w-0">
          <CuriosityAddEditWordCard
            title={isEnglishBook ? "Save English Word / Phrase" : addWordTitle}
            description={
              isEnglishBook
                ? `Add English from this book with Japanese support. ${positionLabel(positionUnit)} and chapter stay ready for the next item.`
                : addWordDescription
            }
          >
            <CuriosityAddEditWordFormShell
              editingSurface={quickPreview.id ? quickPreview.surface : null}
            >
              {isEnglishBook ? (
                <AddEnglishWordFields
                  itemType={englishItemType}
                  source={quickPreview.surface}
                  support={quickPreview.meaning}
                  positionUnit={positionUnit}
                  onPositionUnitChange={(unit) => editQuickContext(prev => ({ ...prev, positionUnit: unit }))}
                  pageNumber={quickPreview.page}
                  chapterNumber={quickPreview.chapterNumber}
                  chapterName={quickPreview.chapterName}
                  chapterNameOptions={sortedChapterNameOptions}
                  saving={quickLoading || quickSaving}
                  isEditing={quickPreview.id != null}
                  savedNotice={savedQuickNotice}
                  onItemTypeChange={setEnglishItemType}
                  onSourceChange={(value) => {
                    setQuickPreview((prev) => ({
                      ...prev,
                      surface: value,
                      cacheSurface: "",
                      reading: "",
                      meanings: [],
                      selectedMeaningIndex: 0,
                      isCustomMeaning: true,

                      alternateSurface: "",
                      pageOrder: null,
                    }));
                    setSavedQuickNotice("");
                  }}
                  onSupportChange={(value) => {
                    setQuickPreview((prev) => ({
                      ...prev,
                      meaning: value,
                      meanings: [],
                      selectedMeaningIndex: 0,
                      isCustomMeaning: true,
                    }));
                    setSavedQuickNotice("");
                  }}
                  onPageNumberChange={(value) =>
                    editQuickContext((prev) => ({ ...prev, page: value }))
                  }
                  onChapterNumberChange={(value) =>
                    editQuickContext((prev) => ({ ...prev, chapterNumber: value }))
                  }
                  onChapterNameChange={(value) =>
                    editQuickContext((prev) => {
                      const knownChapterNumber = chapterNumberByName[value.trim()];
                      return {
                        ...prev,
                        chapterName: value,
                        chapterNumber: knownChapterNumber || prev.chapterNumber,
                      };
                    })
                  }
                  onSaveWord={() => void saveQuickWord()}
                  onClearWordFields={() => clearQuickWordFields()}
                />
              ) : (
                <>
                  <CuriosityQuickSearchRow
                    listening={isListeningMode}
                    surface={quickPreview.surface}
                    reading={quickPreview.reading}
                    quickLoading={quickLoading || quickSaving}
                    quickPreviewLibraryColorInfo={quickPreviewLibraryColorInfo}
                    quickWordInputRef={quickWordInputRef}
                    onSurfaceChange={(value) => {
                      invalidateQuickLookup();
                      setDismissedPersonalEntries([]);
                      setSelectedPersonalEntryKey(null);
                      setPersonalVocabularyMatches([]);
                      setPersonalVocabularyLoading(false);
                      setPersonalVocabularySearched(false);
                      setPersonalVocabularyError(null);
                      setQuickPreview((prev) => ({
                        ...prev,
                        surface: value,
                        cacheSurface: value.trim() ? prev.cacheSurface : "",
                      }));
                      setSavedQuickNotice("");
                      if (quickLookupCandidates.length > 0) setQuickLookupCandidates([]);
                    }}
                    onClearWordFields={isListeningMode ? undefined : () => clearQuickWordFields()}
                    isEditing={quickPreview.id != null}
                    clearDisabled={quickSaving}
                    onSearch={() => void pullQuickWord()}
                    onSearchKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void pullQuickWord();
                      }
                    }}
                  />

                  <CuriosityWordHelpPanel
                    isOpen={isWordHelpOpen}
                    scratchWord={scratchWord}
                    kanjiLookupResetKey={kanjiLookupResetKey}
                    onToggleOpen={setIsWordHelpOpen}
                    onScratchWordChange={setScratchWord}
                    onScratchWordKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.stopPropagation();
                      }
                    }}
                    onUseScratchWord={searchScratchWord}
                    onPickKanji={(kanji) => {
                      setScratchWord((prev) => `${prev}${kanji}`);
                    }}
                  />

                  <CuriosityQuickErrorMessage message={quickError} />
                  {!isListeningMode && !studentContext && personalVocabularyMatches.some(entry => !dismissedPersonalEntries.includes(personalVocabularyEntryKey(entry))) ? (
                    <PersonalVocabularyResults
                      dismissedKeys={dismissedPersonalEntries}
                      onDismiss={(entry) => setDismissedPersonalEntries(current => [...new Set([...current, personalVocabularyEntryKey(entry)])])}
                      entries={personalVocabularyMatches}
                      searched={personalVocabularySearched}
                      loading={personalVocabularyLoading}
                      error={personalVocabularyError}
                      saving={quickSaving}
                      onSelect={(entry) => void savePersonalQuickWord(entry)}
                    />
                  ) : null}
                  <CuriosityDictionaryChoices
                    surface={quickPreview.surface}
                    candidates={quickLookupCandidates}
                    selectedSurface={quickPreview.surface}
                    selectedReading={quickPreview.reading}
                    selectedMeaning={quickPreview.meaning}
                    onSelectCandidate={(candidate) => {
                      invalidateQuickLookup();
                      setSelectedPersonalEntryKey(null);
                      setQuickPreview((prev) => ({
                        ...prev,
                        surface: candidate.surface,
                        cacheSurface: candidate.cacheSurface,
                        reading: candidate.reading,
                        meanings: candidate.meanings,
                        selectedMeaningIndex: candidate.selectedMeaningIndex,
                        meaning: candidate.meaning,
                        isCustomMeaning: candidate.isCustomMeaning,
                      }));
                      setQuickError(null);
                      jumpToQuickWordFields();
                    }}
                  />


                  <CuriosityWordDetailFields
                    listening={isListeningMode}
                    quickPreview={quickPreview}
                    chapterNameOptions={sortedChapterNameOptions}
                    isEditing={quickPreview.id != null}
                    savedQuickNotice={savedQuickNotice}
                    quickWordFieldsRef={quickWordFieldsRef}
                    onReadingChange={(value) =>
                      setQuickPreview((prev) => ({ ...prev, reading: value }))
                    }
                    contextFields={<WordContextFields value={quickPreview} onChange={value => setQuickPreview(current => ({ ...current, ...value }))} teacher={canTeachWordForms} />}
                    onPromoteAlternative={() => {
                      invalidateQuickLookup();
                      setDismissedPersonalEntries([]);
                      setQuickPreview(current => ({ ...current, cacheSurface: current.cacheSurface || current.surface, surface: current.alternateSurface.trim(), alternateSurface: current.surface }));
                    }}
                    onAlternateSurfaceChange={(value) =>
                      setQuickPreview((prev) => ({
                        ...prev,
                        alternateSurface: value,

                      }))
                    }
                    onMeaningChoiceChange={(index, meaning) =>
                      setQuickPreview((prev) => ({
                        ...prev,
                        selectedMeaningIndex: index,
                        meaning,
                        isCustomMeaning: false,
                      }))
                    }
                    onCustomMeaningChange={(value) =>
                      setQuickPreview((prev) => ({
                        ...prev,
                        meaning: value,
                        isCustomMeaning: true,
                      }))
                    }
                    onPageChange={(value) =>
                      editQuickContext((prev) => ({ ...prev, page: value }))
                    }
                    onChapterNumberChange={(value) =>
                      editQuickContext((prev) => ({ ...prev, chapterNumber: value }))
                    }
                    onChapterNameChange={(value) =>
                      editQuickContext((prev) => {
                        const knownChapterNumber = chapterNumberByName[value.trim()];
                        return {
                          ...prev,
                          chapterName: value,
                          chapterNumber: knownChapterNumber || prev.chapterNumber,
                        };
                      })
                    }
                    onSaveWord={() => void saveQuickWord()}
                    onClearWordFields={() => clearQuickWordFields()}
                    positionUnit={positionUnit}
                    onPositionUnitChange={(unit) => editQuickContext(prev => ({ ...prev, positionUnit: unit }))}
                    saveAreaWarning={
                      isRunning || isPaused
                        ? "Timer is active. If you leave or refresh the page, you may lose your session."
                        : undefined
                    }
                  />
                </>
              )}
            </CuriosityAddEditWordFormShell>
            {!isListeningMode && <CuriosityRecentSessionWords wordCount={quickSessionWords.length}>

              <div className="mt-3 space-y-3">
                {quickSessionWords.slice(0, 2).map((item, index) => {
                  const colorInfo =
                    libraryColorByWordKey[makeLibraryStudyColorKey(item.surface, item.reading)] ?? null;

                  return (
                    <CuriosityRecentSessionWordCard
                      key={item.id}
                      word={item}
                      colorInfo={colorInfo}
                      className={`rounded-lg border bg-white p-3 ${index === 1 ? "hidden sm:block" : ""
                        }`}
                      showLocation
                      onEdit={() => loadQuickSessionWordIntoPreview(item)}
                      onDelete={() => void deleteQuickWordById(item.id)}
                    />
                  );
                })}
              </div>

              {quickSessionWords.length > 1 ? (
                <details className="mt-3 rounded-lg border border-stone-200 bg-white sm:hidden">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-stone-700">
                    Saved words from this session
                  </summary>

                  <div className="space-y-3 border-t border-stone-200 p-3">
                    {quickSessionWords.slice(1).map((item) => {
                      const colorInfo =
                        libraryColorByWordKey[makeLibraryStudyColorKey(item.surface, item.reading)] ?? null;

                      return (
                        <CuriosityRecentSessionWordCard
                          key={item.id}
                          word={item}
                          colorInfo={colorInfo}
                          className="rounded-lg border bg-stone-50 p-3"
                          showLocation={false}
                          onEdit={() => loadQuickSessionWordIntoPreview(item)}
                          onDelete={() => void deleteQuickWordById(item.id)}
                        />
                      );
                    })}
                  </div>

                </details>
              ) : null}

              {quickSessionWords.length > 2 ? (
                <details className="mt-3 hidden rounded-lg border border-stone-200 bg-white sm:block">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-stone-700">
                    Saved words from this session
                  </summary>

                  <div className="space-y-3 border-t border-stone-200 p-3">
                    {quickSessionWords.slice(2).map((item) => {
                      const colorInfo =
                        libraryColorByWordKey[makeLibraryStudyColorKey(item.surface, item.reading)] ?? null;

                      return (
                        <CuriosityRecentSessionWordCard
                          key={item.id}
                          word={item}
                          colorInfo={colorInfo}
                          className="rounded-lg border bg-stone-50 p-3"
                          showLocation={false}
                          onEdit={() => loadQuickSessionWordIntoPreview(item)}
                          onDelete={() => void deleteQuickWordById(item.id)}
                        />
                      );
                    })}
                  </div>
                </details>
              ) : null}
            </CuriosityRecentSessionWords>}
          </CuriosityAddEditWordCard>
        </div>
        {workspaceCompact && workspaceAside ? (
          <div className={onCloseWorkspaceAside
            ? "fixed inset-0 z-50 overflow-y-auto bg-stone-50 p-4 md:static md:z-auto md:min-w-0 md:overflow-visible md:bg-transparent md:p-0"
            : "min-w-0"}
          >
            {onCloseWorkspaceAside ? (
              <button
                type="button"
                onClick={onCloseWorkspaceAside}
                className="mb-3 rounded-xl bg-stone-900 px-4 py-2 text-sm font-bold text-white md:hidden"
              >
                ← Back to reading
              </button>
            ) : null}
            {workspaceAside}
          </div>
        ) : null}
      </div>
      </fieldset>}
      {isListeningMode && capture.identity && <ListeningSessionWords words={capture.words} />}

    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        {content}
      </div>
    </main>
  );
}
