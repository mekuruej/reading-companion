// Curiosity Reading / Listening word timer experience
//
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
import { todayYmdAppTimeZone } from "@/lib/timeZone";
import CuriosityPageHeader from "./components/CuriosityPageHeader";
import CuriosityStatusMessage from "./components/CuriosityStatusMessage";
import CuriosityBookContextCard from "./components/CuriosityBookContextCard";
import CuriosityDictionaryChoices from "./components/CuriosityDictionaryChoices";
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

type QuickPreview = {
  id: string | null;
  surface: string;
  cacheSurface: string;
  reading: string;
  meanings: string[];
  selectedMeaningIndex: number;
  meaning: string;
  isCustomMeaning: boolean;
  useAlternateSurface: boolean;
  alternateSurface: string;
  page: string;
  chapterNumber: string;
  chapterName: string;
  pageOrder: number | null;
};

type QuickSessionWord = {
  id: string;
  surface: string;
  reading: string;
  meaning: string;
  page: string;
  chapterNumber: string;
  chapterName: string;
  meanings: string[];
  selectedMeaningIndex: number | null;
  isCustomMeaning: boolean;
  cacheSurface: string;
  useAlternateSurface: boolean;
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
  surface: string;
  page: string;
};

type WordTimerExperienceMode = "curiosity" | "listening";

function makeBlankQuickPreview(meta = { page: "", chapterNumber: "", chapterName: "" }): QuickPreview {
  return {
    id: null,
    surface: "",
    cacheSurface: "",
    reading: "",
    meanings: [],
    selectedMeaningIndex: 0,
    meaning: "",
    isCustomMeaning: true,
    useAlternateSurface: false,
    alternateSurface: "",
    page: meta.page,
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

function pageNumberForSavedWordLocation(value: string, allowPercent: boolean): number | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  if (allowPercent && trimmed.includes("%")) return null;
  return toNullableInt(trimmed);
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

export function CuriosityReadingExperience({
  experienceMode = "curiosity",
}: {
  experienceMode?: WordTimerExperienceMode;
}) {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const routeUserBookId = params.userBookId ?? "";
  const isListeningMode = experienceMode === "listening";
  const timedSessionMode = isListeningMode ? "listening" : "curiosity";
  const pageTitle = isListeningMode ? "Listening" : "Curiosity Reading";
  const pageDescription = isListeningMode
    ? "Listen to this book or audiobook, track your time, and save words you catch by ear without leaving the session."
    : "Use this for a slower, exploratory reading experience. This is where you stop, investigate, save new words, and let lookup time count as part of the reading session.";
  const timerTitle = isListeningMode ? "Log your listening session" : "Log your reading session";
  const timerDescription = isListeningMode
    ? "Use the timer to track listening while you add words you heard in this book."
    : "Use the timer to track a curiosity reading session where you stop, check, and save new words.";
  const saveSessionTitle = isListeningMode
    ? "Save this listening session"
    : "Save this reading session";
  const addWordTitle = isListeningMode ? "Add Heard Word" : "Add / Edit Word";
  const addWordDescription = isListeningMode
    ? "Search, adjust, and save a word you heard while listening to this book."
    : "Search, adjust, and save from one place. Page and chapter stay ready for the next word.";
  const fullAccessFeature = isListeningMode ? "add_word" : "curiosity_reading";
  const [userBookId, setUserBookId] = useState(routeUserBookId);
  const [username, setUsername] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");
  const [bookLanguageCode, setBookLanguageCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccessBook, setCanAccessBook] = useState(false);
  const [canUseCuriosityReading, setCanUseCuriosityReading] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [englishItemType, setEnglishItemType] = useState<EnglishItemType>("word");
  const [hideKanjiInReadingSupport, setHideKanjiInReadingSupport] = useState(false);
  const [isWordHelpOpen, setIsWordHelpOpen] = useState(false);
  const [scratchWord, setScratchWord] = useState("");
  const [kanjiLookupResetKey, setKanjiLookupResetKey] = useState(0);

  const [quickPreview, setQuickPreview] = useState<QuickPreview>(() => makeBlankQuickPreview());
  const [quickSessionWords, setQuickSessionWords] = useState<QuickSessionWord[]>([]);
  const [chapterNameOptions, setChapterNameOptions] = useState<string[]>([]);
  const [chapterNumberByName, setChapterNumberByName] = useState<Record<string, string>>({});
  const [libraryColorByWordKey, setLibraryColorByWordKey] = useState<
    Record<string, LibraryStudyWordColorInfo>
  >({});
  const [quickLookupCandidates, setQuickLookupCandidates] = useState<QuickLookupCandidate[]>([]);
  const [selectedQuickLookupCandidateId, setSelectedQuickLookupCandidateId] =
    useState<string | null>(null);
  const [savedQuickNotice, setSavedQuickNotice] = useState("");
  const [lastSavedWordContext, setLastSavedWordContext] =
    useState<LastSavedWordContext | null>(null);

  const sortedChapterNameOptions = useMemo(
    () => sortChapterNameOptionsByNumber(chapterNameOptions, chapterNumberByName),
    [chapterNameOptions, chapterNumberByName]
  );

  const curiosityProgressLine = useMemo(() => {
    const parts = [];
    const currentPage = quickPreview.page.trim() || lastSavedWordContext?.page || "";

    if (currentPage) parts.push(`On page ${currentPage}`);
    if (lastSavedWordContext?.surface) {
      parts.push(`Last saved word: ${lastSavedWordContext.surface}`);
    }

    return parts.join(" · ");
  }, [quickPreview.page, lastSavedWordContext]);

  const quickWordInputRef = useRef<HTMLInputElement | null>(null);
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
  const [timerSaveMessage, setTimerSaveMessage] = useState("");
  const [hasFinishedTimer, setHasFinishedTimer] = useState(false);
  const [sessionStartPage, setSessionStartPage] = useState("");
  const [sessionEndPage, setSessionEndPage] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [timerPersistenceReady, setTimerPersistenceReady] = useState(false);
  const skippedInitialPersistenceWriteRef = useRef(false);

  const quickMetaStorageKey = `${experienceMode}-add-meta:${userBookId}`;

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
        role: profile?.is_super_teacher ? "super_teacher" : profile?.role ?? null,

        // For this first pass, anyone who currently has app access keeps
        // full learning access. Later, when expired trials become free users,
        // we can separate "can enter app" from "has full learning access."
        hasFullAccess: appAccessStatus.hasFullAccess,
      });

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
      const allowed = await canAccessUserBook(user.id, ownerUserId, profile ?? null);

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
        .select("title, cover_url, language_code")
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

      setBookTitle(book.title ?? "");
      setBookCover(book.cover_url ?? "");
      setBookLanguageCode(book.language_code ?? null);
      setMessage("");
    })();
  }, [fullAccessFeature, userBookId]);

  useEffect(() => {
    if (!quickPreview) return;

    const meta = {
      page: quickPreview.page,
      chapterNumber: quickPreview.chapterNumber,
      chapterName: quickPreview.chapterName,
    };

    const hasAnyLocation =
      meta.page.trim() || meta.chapterNumber.trim() || meta.chapterName.trim();

    if (!hasAnyLocation) return;

    saveQuickMeta(meta);
  }, [quickPreview?.page, quickPreview?.chapterNumber, quickPreview?.chapterName]);

  useEffect(() => {
    if (!quickPreview) return;
    if (quickPreview.id) return;

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

      const shouldFillPage = !prev.page.trim();
      const shouldFillChapterNumber = !prev.chapterNumber.trim();
      const shouldFillChapterName = !prev.chapterName.trim();

      if (!shouldFillPage && !shouldFillChapterNumber && !shouldFillChapterName) {
        return prev;
      }

      return {
        ...prev,
        page: shouldFillPage ? savedMeta.page : prev.page,
        chapterNumber: shouldFillChapterNumber ? savedMeta.chapterNumber : prev.chapterNumber,
        chapterName: shouldFillChapterName ? savedMeta.chapterName : prev.chapterName,
      };
    });
  }, [quickPreview?.surface, userBookId]);

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
    if (!userBookId) return;

    skippedInitialPersistenceWriteRef.current = false;
    const persisted = readPersistedTimedSession(timedSessionMode, userBookId);
    if (persisted) {
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
      setSessionStartPage(persisted.sessionStartPage);
      setSessionEndPage(persisted.sessionEndPage);
    }

    setTimerPersistenceReady(true);
  }, [timedSessionMode, userBookId]);

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
    if (!timerPersistenceReady || !userBookId) return;

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
      sessionMode: timedSessionMode,
      userBookId,
      startedAt: isRunning ? startTime : null,
      accumulatedElapsedMs,
      isPaused,
      sessionDate,
      sessionStartPage,
      sessionEndPage,
      showTimedSessionForm,
      savedAt: Date.now(),
    });
  }, [
    accumulatedElapsedMs,
    isPaused,
    isRunning,
    sessionDate,
    sessionEndPage,
    sessionStartPage,
    showTimedSessionForm,
    startTime,
    timedSessionMode,
    timerPersistenceReady,
    userBookId,
  ]);

  useEffect(() => {
    if (!timerPersistenceReady || !userBookId) return;

    const persistCurrentTimer = () => {
      if (!isRunning && !isPaused && !showTimedSessionForm && accumulatedElapsedMs <= 0) return;

      writePersistedTimedSession({
        version: 1,
        sessionMode: timedSessionMode,
        userBookId,
        startedAt: isRunning ? startTime : null,
        accumulatedElapsedMs,
        isPaused,
        sessionDate,
        sessionStartPage,
        sessionEndPage,
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
    sessionStartPage,
    showTimedSessionForm,
    startTime,
    timedSessionMode,
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
      if (isEnglishBook) {
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
  }, [quickSessionWords, quickPreview.surface, quickPreview.reading, quickPreview.id, isEnglishBook]);

  function prepareForNextQuickWord() {
    window.setTimeout(() => {
      const input = quickWordInputRef.current;
      if (!input) return;

      if (isSmallViewport()) {
        input.focus({ preventScroll: true });
        return;
      }

      input.focus();
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

  function getSavedQuickMeta() {
    if (typeof window === "undefined") {
      return { page: "", chapterNumber: "", chapterName: "" };
    }

    try {
      const raw = window.localStorage.getItem(quickMetaStorageKey);
      if (!raw) {
        return { page: "", chapterNumber: "", chapterName: "" };
      }

      const parsed = JSON.parse(raw);
      return {
        page: typeof parsed.page === "string" ? parsed.page : "",
        chapterNumber: typeof parsed.chapterNumber === "string" ? parsed.chapterNumber : "",
        chapterName: typeof parsed.chapterName === "string" ? parsed.chapterName : "",
      };
    } catch {
      return { page: "", chapterNumber: "", chapterName: "" };
    }
  }

  function saveQuickMeta(meta: { page: string; chapterNumber: string; chapterName: string }) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(quickMetaStorageKey, JSON.stringify(meta));
    } catch {
      // ignore
    }
  }

  async function loadLastSavedWordContext() {
    if (!userBookId) {
      setLastSavedWordContext(null);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_words")
      .select("surface, page_number, created_at")
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
            page: latest.page_number != null ? String(latest.page_number) : "",
          }
        : null
    );
  }

  function clearQuickWordFields(options: { preserveSavedNotice?: boolean } = {}) {
    const meta = {
      page: quickPreview.page,
      chapterNumber: quickPreview.chapterNumber,
      chapterName: quickPreview.chapterName,
    };
    setQuickPreview(makeBlankQuickPreview(meta));
    setEnglishItemType("word");
    setHideKanjiInReadingSupport(false);
    setQuickError(null);
    setQuickLookupCandidates([]);
    setSelectedQuickLookupCandidateId(null);
    setMessage("");
    if (!options.preserveSavedNotice) {
      setSavedQuickNotice("");
    }
    window.setTimeout(() => quickWordInputRef.current?.focus({ preventScroll: true }), 0);
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

    if (pageNum == null) query = query.is("page_number", null);
    else query = query.eq("page_number", pageNum);

    const { data, error } = await query;
    if (error) throw error;

    const maxPageOrder = Math.max(
      0,
      ...((data ?? []).map((r: any) => Number(r.page_order) || 0))
    );

    return maxPageOrder + 1;
  }

  function loadQuickSessionWordIntoPreview(item: QuickSessionWord) {
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
      useAlternateSurface: item.useAlternateSurface,
      alternateSurface: item.alternateSurface,
      page: item.page,
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

    setQuickLoading(true);
    setQuickError(null);
    setSavedQuickNotice("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(word)}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      const json = await res.json();

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
          useAlternateSurface: false,
          alternateSurface: "",
          pageOrder: null,
        }));
        setQuickLookupCandidates([]);
        setSelectedQuickLookupCandidateId(null);
        setQuickError("No result found.");
        return;
      }

      const savedMeta = getSavedQuickMeta();

      setQuickPreview({
        id: null,
        surface: first.surface,
        cacheSurface: first.cacheSurface,
        reading: first.reading,
        meanings: first.meanings,
        selectedMeaningIndex: first.selectedMeaningIndex,
        meaning: first.meaning,
        isCustomMeaning: first.isCustomMeaning,
        useAlternateSurface: false,
        alternateSurface: "",
        page: savedMeta.page,
        chapterNumber: savedMeta.chapterNumber,
        chapterName: savedMeta.chapterName,
        pageOrder: null,
      });
      setQuickLookupCandidates(candidates);
      setSelectedQuickLookupCandidateId(null);
      setMessage(
        candidates.length > 1
          ? "Loaded the first result. If your book uses a different reading, choose it below."
          : ""
      );

    } catch (err) {
      console.error(err);
      setQuickPreview((prev) => ({
        ...prev,
        cacheSurface: "",
        reading: "",
        meanings: [],
        selectedMeaningIndex: 0,
        meaning: "",
        isCustomMeaning: true,
        useAlternateSurface: false,
        alternateSurface: "",
        pageOrder: null,
      }));
      setQuickLookupCandidates([]);
      setSelectedQuickLookupCandidateId(null);
      setQuickError("Could not pull word data.");
    } finally {
      setQuickLoading(false);
    }
  }

  async function saveQuickWord(options: { requireSelectedLookup?: boolean } = {}) {
    if (isEnglishBook) {
      await saveEnglishQuickWord();
      return;
    }

    if (options.requireSelectedLookup && !selectedQuickLookupCandidateId) {
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
      quickPreview.useAlternateSurface ? quickPreview.alternateSurface : quickPreview.surface
    )?.trim() ?? "";
    const normalizedCacheSurface = quickPreview.cacheSurface?.trim() || normalizedSurface;
    const normalizedReading = quickPreview.reading?.trim() ?? "";
    const isManualEntry = quickPreview.isCustomMeaning && quickPreview.meanings.length === 0;

    const chapterNum = quickPreview.chapterNumber ? Number(quickPreview.chapterNumber) : null;
    const pageNum = pageNumberForSavedWordLocation(quickPreview.page, isListeningMode);
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
        console.error("Error looking up vocabulary cache:", cacheLookupError);
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
          console.error("Error creating vocabulary cache row:", cacheInsertError);
          setMessage(`❌ Could not save word: ${cacheInsertError.message}`);
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
      reading: quickPreview.reading || null,
      meaning: selectedMeaning || null,
      meaning_choices: quickPreview.meanings,
      meaning_choice_index: quickPreview.isCustomMeaning
        ? null
        : quickPreview.selectedMeaningIndex,
      page_number: pageNum,
      chapter_number: chapterNum,
      chapter_name: chapterNameTrimmed,
      hide_kanji_in_reading_support: hideKanjiInReadingSupport,
    };

    if (!editingExisting) {
      const payload = {
        ...basePayload,
        page_order: await getNextPageOrder(userBookId, chapterNum, pageNum),
      };

      const { data, error } = await supabase
        .from("user_book_words")
        .insert(payload)
        .select(
          "id, surface, reading, meaning, meaning_choices, meaning_choice_index, page_number, page_order, chapter_number, chapter_name, hide_kanji_in_reading_support"
        )
        .single();

      if (error) {
        console.error("Error saving quick word:", error);
        setMessage(`❌ Could not save word: ${error.message}`);
        return;
      }

      const newItem: QuickSessionWord = {
        id: String(data.id),
        surface: data.surface ?? "",
        reading: data.reading ?? "",
        meaning: data.meaning ?? "",
        page: data.page_number != null ? String(data.page_number) : "",
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: data.meaning_choices ?? quickPreview.meanings,
        selectedMeaningIndex:
          data.meaning_choice_index == null ? null : Number(data.meaning_choice_index),
        isCustomMeaning: data.meaning_choice_index == null,
        cacheSurface: normalizedCacheSurface,
        useAlternateSurface: quickPreview.useAlternateSurface,
        alternateSurface: quickPreview.alternateSurface,
        hideKanjiInReadingSupport: !!data.hide_kanji_in_reading_support,
        pageOrder: data.page_order ?? null,
      };

      setQuickSessionWords((prev) => upsertAndSortQuickSessionWords(prev, newItem));
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
        page: newItem.page,
      });
      setMessage("");
    } else {
      const { data, error } = await supabase
        .from("user_book_words")
        .update(basePayload)
        .eq("id", editingExisting.id)
        .eq("user_book_id", userBookId)
        .select(
          "id, surface, reading, meaning, meaning_choices, meaning_choice_index, page_number, page_order, chapter_number, chapter_name, hide_kanji_in_reading_support"
        )
        .single();

      if (error) {
        console.error("Error updating quick word:", error);
        setMessage(`❌ Could not update word: ${error.message}`);
        return;
      }

      const updatedItem: QuickSessionWord = {
        id: String(data.id),
        surface: data.surface ?? "",
        reading: data.reading ?? "",
        meaning: data.meaning ?? "",
        page: data.page_number != null ? String(data.page_number) : "",
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: data.meaning_choices ?? quickPreview.meanings,
        selectedMeaningIndex:
          data.meaning_choice_index == null ? null : Number(data.meaning_choice_index),
        isCustomMeaning: data.meaning_choice_index == null,
        cacheSurface: normalizedCacheSurface,
        useAlternateSurface: quickPreview.useAlternateSurface,
        alternateSurface: quickPreview.alternateSurface,
        hideKanjiInReadingSupport: !!data.hide_kanji_in_reading_support,
        pageOrder: data.page_order ?? null,
      };

      setQuickSessionWords((prev) => upsertAndSortQuickSessionWords(prev, updatedItem));
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
        page: updatedItem.page,
      });
      setMessage("");
    }

    if (vocabularyCacheId && hasKanji(normalizedCacheSurface)) {
      await generateVocabularyKanjiMap(vocabularyCacheId);
    }

    clearQuickWordFields({ preserveSavedNotice: true });
    prepareForNextQuickWord();
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
    const pageNum = pageNumberForSavedWordLocation(quickPreview.page, isListeningMode);
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
      page_number: pageNum,
      chapter_number: chapterNum,
      chapter_name: chapterNameTrimmed,
      hide_kanji_in_reading_support: false,
      seen_on: todayYmdAppTimeZone(),
    };

    if (!editingExisting) {
      const payload = {
        ...basePayload,
        page_order: await getNextPageOrder(userBookId, chapterNum, pageNum),
      };

      const { data, error } = await supabase
        .from("user_book_words")
        .insert(payload)
        .select(
          "id, surface, reading, meaning, page_number, page_order, chapter_number, chapter_name, item_type"
        )
        .single();

      if (error) {
        const readableError = readableSupabaseError(error);
        console.error("Error saving English quick word:", readableError, error);
        setMessage(`❌ Could not save item: ${readableError}`);
        return;
      }

      const newItem: QuickSessionWord = {
        id: String(data.id),
        surface: data.surface ?? cleanSource,
        reading: data.reading ?? "",
        meaning: data.meaning ?? cleanSupport,
        page: data.page_number != null ? String(data.page_number) : "",
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: [],
        selectedMeaningIndex: null,
        isCustomMeaning: true,
        cacheSurface: "",
        useAlternateSurface: false,
        alternateSurface: "",
        hideKanjiInReadingSupport: false,
        pageOrder: data.page_order ?? null,
        itemType: data.item_type === "phrase" ? "phrase" : "word",
      };

      setQuickSessionWords((prev) => upsertAndSortQuickSessionWords(prev, newItem));
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
        page: newItem.page,
      });
      setMessage("");
    } else {
      const { data, error } = await supabase
        .from("user_book_words")
        .update(basePayload)
        .eq("id", editingExisting.id)
        .eq("user_book_id", userBookId)
        .select(
          "id, surface, reading, meaning, page_number, page_order, chapter_number, chapter_name, item_type"
        )
        .single();

      if (error) {
        const readableError = readableSupabaseError(error);
        console.error("Error updating English quick word:", readableError, error);
        setMessage(`❌ Could not update item: ${readableError}`);
        return;
      }

      const updatedItem: QuickSessionWord = {
        id: String(data.id),
        surface: data.surface ?? cleanSource,
        reading: data.reading ?? "",
        meaning: data.meaning ?? cleanSupport,
        page: data.page_number != null ? String(data.page_number) : "",
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: [],
        selectedMeaningIndex: null,
        isCustomMeaning: true,
        cacheSurface: "",
        useAlternateSurface: false,
        alternateSurface: "",
        hideKanjiInReadingSupport: false,
        pageOrder: data.page_order ?? null,
        itemType: data.item_type === "phrase" ? "phrase" : "word",
      };

      setQuickSessionWords((prev) => upsertAndSortQuickSessionWords(prev, updatedItem));
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
        page: updatedItem.page,
      });
      setMessage("");
    }

    clearQuickWordFields({ preserveSavedNotice: true });
    prepareForNextQuickWord();
  }

  async function deleteQuickWordById(id: string) {
    if (!userBookId) return;

    const { error } = await supabase
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
    void loadLastSavedWordContext();

    if (quickPreview.id === id) {
      clearQuickWordFields();
    }

    setMessage("✅ Word deleted from Vocab List.");
  }

  async function openTimedSessionFormWithDefaults() {
    if (!userBookId) {
      setShowTimedSessionForm(true);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("end_page, read_on, created_at")
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
    const nextStart =
      latest?.end_page != null && Number.isFinite(Number(latest.end_page))
        ? String(Number(latest.end_page) + 1)
        : "";

    setSessionStartPage(nextStart);
    setShowTimedSessionForm(true);
  }

  async function saveReadingSession() {
    if (!userBookId) return;

    const startPageText = sessionStartPage.trim();
    const endPageText = sessionEndPage.trim();
    const hasPageInput = Boolean(startPageText || endPageText);
    const start = Number(startPageText);
    const end = Number(endPageText);
    let startPage: number | null = null;
    let endPage: number | null = null;
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const readOn = isListeningMode ? sessionDate || todayYmdAppTimeZone() : todayYmdAppTimeZone();

    if (!isListeningMode && (!Number.isFinite(start) || !Number.isFinite(end))) {
      setMessage("❌ Please fill in start page and end page.");
      return;
    }

    if (isListeningMode && hasPageInput && (!Number.isFinite(start) || !Number.isFinite(end))) {
      setMessage("❌ Fill in both pages, or leave both page fields blank.");
      return;
    }

    if ((!isListeningMode || hasPageInput) && (start <= 0 || end <= 0)) {
      setMessage("❌ Pages must be greater than 0.");
      return;
    }

    if ((!isListeningMode || hasPageInput) && end < start) {
      setMessage("❌ End page must be greater than or equal to start page.");
      return;
    }

    if (!isListeningMode || hasPageInput) {
      startPage = start;
      endPage = end;
    }

    const { error } = await supabase.from("user_book_reading_sessions").insert({
      user_book_id: userBookId,
      read_on: readOn,
      start_page: startPage,
      end_page: endPage,
      minutes_read: minutes,
      session_mode: isListeningMode ? "listening" : "curiosity",
    });

    if (error) {
      console.error("Error saving reading session:", error);
      setMessage(`❌ Could not save reading session: ${error.message}`);
      return;
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
        started_at?: string;
      } = {
        status: "reading",
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

    setTimerSaveMessage(
      isListeningMode
        ? "Your listening session has been saved in the Reading Tab."
        : "Your curiosity session has been saved in the Reading Tab."
    );
    window.setTimeout(() => setTimerSaveMessage(""), 4000);

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
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-gray-500">Loading book info…</p>
        </div>
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

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <CuriosityPageHeader title={pageTitle} description={pageDescription} />
        {userBookId ? (
          bookTitle ? (
            <CuriosityBookContextCard
              bookTitle={bookTitle}
              bookCover={bookCover}
              contextLine={
                isListeningMode
                  ? curiosityProgressLine || "Listening timer + heard words"
                  : curiosityProgressLine
              }
              onOpenBookHub={() => {
                router.push(`/books/${encodeURIComponent(userBookId)}`);
              }}
              onOpenVocabList={() => {
                router.push(`/books/${encodeURIComponent(userBookId)}/words`);
              }}
            />
          ) : null
        ) : (
          <p className="mb-6 text-sm text-gray-500">
            Open with <code className="rounded bg-gray-100 px-1 py-0.5">?userBookId=...</code>
          </p>
        )}

        <CuriosityStatusMessage message={message} />

        <CuriosityTimerPanel
          title={timerTitle}
          description={timerDescription}
          saveTitle={saveSessionTitle}
          startPageLabel={isListeningMode ? "Start page optional" : "Start page"}
          endPageLabel={isListeningMode ? "End page optional" : "End page"}
          isRunning={isRunning}
          isPaused={isPaused}
          elapsed={elapsed}
          showTimedSessionForm={showTimedSessionForm}
          sessionStartPage={sessionStartPage}
          sessionEndPage={sessionEndPage}
          timerSaveMessage={timerSaveMessage}
          formatTimer={formatTimer}
          onStart={() => {
            setSessionDate(todayYmdAppTimeZone());
            setStartTime(Date.now());
            setAccumulatedElapsedMs(0);
            setElapsed(0);
            setIsRunning(true);
            setIsPaused(false);
            setHasFinishedTimer(false);
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
            setStartTime(Date.now());
            setIsPaused(false);
            setIsRunning(true);
          }}
          onSaveSession={() => void saveReadingSession()}
          onCancelSession={() => {
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

        <div className="md:hidden">
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
                  pageNumber={quickPreview.page}
                  chapterNumber={quickPreview.chapterNumber}
                  chapterName={quickPreview.chapterName}
                  chapterNameOptions={sortedChapterNameOptions}
                  saving={quickLoading}
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
                      useAlternateSurface: false,
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
                    setQuickPreview((prev) => ({ ...prev, page: value }))
                  }
                  onChapterNumberChange={(value) =>
                    setQuickPreview((prev) => ({ ...prev, chapterNumber: value }))
                  }
                  onChapterNameChange={(value) =>
                    setQuickPreview((prev) => {
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
              meanings={quickPreview.meanings}
              selectedMeaningIndex={quickPreview.selectedMeaningIndex}
              quickLoading={quickLoading}
              quickError={quickError}
              savedNotice={savedQuickNotice}
              canSaveWord={Boolean(
                quickPreview.cacheSurface.trim() &&
                quickPreview.meaning.trim() &&
                !quickPreview.isCustomMeaning
              )}
              selectedCandidateId={selectedQuickLookupCandidateId}
              candidates={quickLookupCandidates}
              lastAddedWord={quickSessionWords[0] ?? null}
              inputRef={quickWordInputRef}
              onSurfaceChange={(value) => {
                setQuickPreview((prev) => ({
                  ...prev,
                  surface: value,
                  cacheSurface: "",
                  reading: "",
                  meanings: [],
                  selectedMeaningIndex: 0,
                  meaning: "",
                  isCustomMeaning: true,
                  useAlternateSurface: false,
                  alternateSurface: "",
                  pageOrder: null,
                }));
                setSavedQuickNotice("");
                setSelectedQuickLookupCandidateId(null);
                if (quickLookupCandidates.length > 0) setQuickLookupCandidates([]);
              }}
              onSearch={() => void pullQuickWord()}
              onSearchKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void pullQuickWord();
                }
              }}
              onSelectCandidate={(candidate) => {
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
              onSaveWord={() => void saveQuickWord({ requireSelectedLookup: true })}
              onDeleteLastWord={(id) => void deleteQuickWordById(id)}
            />
          )}
        </div>

        <div className="hidden md:block">
        <CuriosityAddEditWordCard
          title={isEnglishBook ? "Save English Word / Phrase" : addWordTitle}
          description={
            isEnglishBook
              ? "Add English from this book with Japanese support. Page and chapter stay ready for the next item."
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
                pageNumber={quickPreview.page}
                chapterNumber={quickPreview.chapterNumber}
                chapterName={quickPreview.chapterName}
                chapterNameOptions={sortedChapterNameOptions}
                saving={quickLoading}
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
                    useAlternateSurface: false,
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
                  setQuickPreview((prev) => ({ ...prev, page: value }))
                }
                onChapterNumberChange={(value) =>
                  setQuickPreview((prev) => ({ ...prev, chapterNumber: value }))
                }
                onChapterNameChange={(value) =>
                  setQuickPreview((prev) => {
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
              surface={quickPreview.surface}
              reading={quickPreview.reading}
              quickLoading={quickLoading}
              quickPreviewLibraryColorInfo={quickPreviewLibraryColorInfo}
              quickWordInputRef={quickWordInputRef}
              onSurfaceChange={(value) => {
                setQuickPreview((prev) => ({
                  ...prev,
                  surface: value,
                  cacheSurface: value.trim() ? prev.cacheSurface : "",
                }));
                setSavedQuickNotice("");
                if (quickLookupCandidates.length > 0) setQuickLookupCandidates([]);
              }}
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
            <CuriosityDictionaryChoices
              surface={quickPreview.surface}
              candidates={quickLookupCandidates}
              selectedSurface={quickPreview.surface}
              selectedReading={quickPreview.reading}
              selectedMeaning={quickPreview.meaning}
              onSelectCandidate={(candidate) => {
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
              quickPreview={quickPreview}
              chapterNameOptions={sortedChapterNameOptions}
              hideKanjiInReadingSupport={hideKanjiInReadingSupport}
              isEditing={quickPreview.id != null}
              savedQuickNotice={savedQuickNotice}
              quickWordFieldsRef={quickWordFieldsRef}
              onReadingChange={(value) =>
                setQuickPreview((prev) => ({ ...prev, reading: value }))
              }
              onAlternateSurfaceChange={(value) =>
                setQuickPreview((prev) => ({
                  ...prev,
                  alternateSurface: value,
                  useAlternateSurface: value.trim().length > 0,
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
                setQuickPreview((prev) => ({ ...prev, page: value }))
              }
              onChapterNumberChange={(value) =>
                setQuickPreview((prev) => ({ ...prev, chapterNumber: value }))
              }
              onChapterNameChange={(value) =>
                setQuickPreview((prev) => {
                  const knownChapterNumber = chapterNumberByName[value.trim()];
                  return {
                    ...prev,
                    chapterName: value,
                    chapterNumber: knownChapterNumber || prev.chapterNumber,
                  };
                })
              }
              onHideKanjiChange={setHideKanjiInReadingSupport}
              onSaveWord={() => void saveQuickWord()}
              onClearWordFields={() => clearQuickWordFields()}
              locationLabel={isListeningMode ? "Page or %" : "Page"}
              locationPlaceholder={isListeningMode ? "p. 42 or 37%" : "Page"}
              locationHelpText={isListeningMode ? "Use a page if you have the book open, or a Kindle/audio percent as a listening note. Percent is not saved as a page." : undefined}
              allowPercentLocation={isListeningMode}
              saveAreaWarning={
                isRunning || isPaused
                  ? "Timer is active. If you leave or refresh the page, you may lose your session."
                  : undefined
              }
            />
              </>
            )}
          </CuriosityAddEditWordFormShell>
          <CuriosityRecentSessionWords wordCount={quickSessionWords.length}>

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
          </CuriosityRecentSessionWords>
        </CuriosityAddEditWordCard>
        </div>
      </div>
    </main >
  );
}
