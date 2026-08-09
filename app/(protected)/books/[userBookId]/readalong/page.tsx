// Fluid Reading - Extensive
// 

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { getEnglishNativeTrackerBookMode } from "@/lib/books/englishNativeTracker";
import {
    canUseFullAccessFeature,
    getFullAccessRequiredCopy,
} from "@/lib/access/requireFullAccess";
import ReadAlongLoadingState from "./components/ReadAlongLoadingState";
import ReadAlongPageHeader from "./components/ReadAlongPageHeader";
import ReadAlongBookContextCard from "./components/ReadAlongBookContextCard";
import ReadAlongEmptyState from "./components/ReadAlongEmptyState";
import ReadAlongSupportModeTabs from "../_shared/readalong/ReadAlongSupportModeTabs";
import ReadAlongCurrentPageSummary from "./components/ReadAlongCurrentPageSummary";
import ReadAlongPageNavigator from "../_shared/readalong/ReadAlongPageNavigator";
import ReadAlongChapterSelector from "./components/ReadAlongChapterSelector";
import ReadAlongTimerPanel from "./components/ReadAlongTimerPanel";
import ReadAlongReaderShell from "../_shared/readalong/ReadAlongReaderShell";
import ReadAlongWordList from "./components/ReadAlongWordList";
import ReadAlongAccessDeniedState from "./components/ReadAlongAccessDeniedState";
import ReadingJournalPanel from "../components/ReadingJournalPanel";
import {
    makeLibraryStudyColorKey,
    type LibraryStudyWordColorInfo,
} from "@/lib/libraryStudyColorLookup";
import { todayYmdAppTimeZone } from "@/lib/timeZone";
import {
    clearPersistedTimedSession,
    elapsedMsForPersistedTimedSession,
    readPersistedTimedSession,
    writePersistedTimedSession,
} from "../_shared/timed-session/timedSessionPersistence";
import {
    resolveStudentWorkspaceBackContext,
    type StudentWorkspaceBackContext,
} from "@/lib/teacher/studentWorkspaceContext";

const READ_ALONG_TIMED_SESSION_MODE = "readalong";

type ReadAlongWord = {
    id: string;
    surface: string;
    reading: string | null;
    meaning: string | null;
    jlpt?: string | null;
    meaning_choice_index?: number | null;
    page_number: number | null;
    page_order: number | null;
    chapter_number: number | null;
    chapter_name: string | null;
    hide_kanji_in_reading_support?: boolean | null;
};

type JishoCandidate = {
    id: string;
    surface: string;
    reading: string;
    jlpt: string;
    isCommon: boolean;
    meaningChoices: string[];
    defaultMeaning: string;
};

type AddAfterDraft = {
    word: string;
    reading: string;
    meaning: string;
    jlpt: string;
    isCommon: boolean;
    meaningChoices: string[];
    meaningChoiceIndex: number | null;
    candidates: JishoCandidate[];
    lookupLoading: boolean;
    saving: boolean;
    message: string;
};

type SupportMode = "full" | "reading" | "meaning";
type AddWordPlacement = "before" | "after";
type FollowAlongViewMode = "follow-along" | "workspace";

type PageChunk = {
    label: string;
    words: ReadAlongWord[];
    pageNumber?: number | null;
};

function chunkArray<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

function easeInOutQuad(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function formatTimer(totalSeconds: number) {
    const safe = Math.max(0, totalSeconds);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function chapterKeyForWord(word: Pick<ReadAlongWord, "chapter_number" | "chapter_name">) {
    const chapterNumber = word.chapter_number;
    const chapterName = word.chapter_name?.trim() ?? "";

    if (chapterNumber == null && !chapterName) return "";

    return `${chapterNumber ?? "no-number"}|||${chapterName}`;
}

function chapterLabelForWord(word: Pick<ReadAlongWord, "chapter_number" | "chapter_name">) {
    const chapterNumber = word.chapter_number;
    const chapterName = word.chapter_name?.trim() ?? "";

    if (chapterNumber != null && chapterName) return `Chapter ${chapterNumber}: ${chapterName}`;
    if (chapterNumber != null) return `Chapter ${chapterNumber}`;
    if (chapterName) return chapterName;

    return "Unchaptered";
}

function hasUsefulSupportMeaning(word: Pick<ReadAlongWord, "meaning">) {
    return Boolean(word.meaning?.trim());
}

function normalizeJlpt(val: string): string {
    if (!val) return "NON-JLPT";
    const v = val.toUpperCase();

    if (v.includes("N5")) return "N5";
    if (v.includes("N4")) return "N4";
    if (v.includes("N3")) return "N3";
    if (v.includes("N2")) return "N2";
    if (v.includes("N1")) return "N1";

    return "NON-JLPT";
}

function extractMeaningChoices(entry: any): string[] {
    const senses = entry?.senses ?? [];
    const choices: string[] = [];

    for (const sense of senses) {
        const defs: string[] = sense?.english_definitions ?? [];
        const text = defs.join("; ").trim();
        if (text) choices.push(text);
    }

    const seen = new Set<string>();
    return choices.filter((choice) => {
        const key = choice.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function isExactJishoMatch(entry: any, query: string) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return false;

    if ((entry?.slug ?? "") === cleanQuery) return true;

    const japaneseForms = entry?.japanese ?? [];
    return japaneseForms.some(
        (form: any) => (form?.word ?? "") === cleanQuery || (form?.reading ?? "") === cleanQuery
    );
}

function buildJishoCandidates(entries: any[], fallbackWord: string): JishoCandidate[] {
    const exactEntries = entries.filter((entry) => isExactJishoMatch(entry, fallbackWord));
    const sourceEntries = exactEntries.length > 0 ? exactEntries : entries;
    const candidates: JishoCandidate[] = [];
    const seen = new Set<string>();

    for (let index = 0; index < sourceEntries.length; index += 1) {
        const entry = sourceEntries[index];
        const japaneseForms = entry?.japanese ?? [];
        const primaryForm =
            japaneseForms.find((j: any) => j?.word || j?.reading) ?? japaneseForms[0] ?? {};
        const surface = primaryForm?.word || entry?.slug || fallbackWord;
        const reading = primaryForm?.reading || "";
        const meaningChoices = extractMeaningChoices(entry);

        const candidate: JishoCandidate = {
            id: `${surface}__${reading || "no-reading"}__${index}`,
            surface,
            reading,
            jlpt: normalizeJlpt(entry?.jlpt?.[0] || ""),
            isCommon: !!entry?.is_common,
            meaningChoices,
            defaultMeaning: meaningChoices[0] || "",
        };

        const dedupeKey = [
            candidate.surface,
            candidate.reading,
            candidate.meaningChoices.join("||"),
        ].join("___");

        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        candidates.push(candidate);
    }

    return candidates;
}

function hasKanji(text: string) {
    return /[\p{Script=Han}]/u.test(text);
}

function isReadyForFlashcards(word: {
    surface?: string | null;
    reading?: string | null;
    meaning?: string | null;
}) {
    const surface = (word.surface ?? "").trim();
    const reading = (word.reading ?? "").trim();
    const meaning = (word.meaning ?? "").trim();

    return Boolean(surface && reading && meaning);
}

function sameWordOrderGroup(
    a: Pick<ReadAlongWord, "chapter_number" | "chapter_name" | "page_number">,
    b: Pick<ReadAlongWord, "chapter_number" | "chapter_name" | "page_number">
) {
    return (
        (a.chapter_number ?? null) === (b.chapter_number ?? null) &&
        (a.chapter_name ?? "").trim() === (b.chapter_name ?? "").trim() &&
        (a.page_number ?? null) === (b.page_number ?? null)
    );
}

function makeBlankAddAfterDraft(word = ""): AddAfterDraft {
    return {
        word,
        reading: "",
        meaning: "",
        jlpt: "NON-JLPT",
        isCommon: false,
        meaningChoices: [],
        meaningChoiceIndex: null,
        candidates: [],
        lookupLoading: false,
        saving: false,
        message: "",
    };
}

async function generateVocabularyKanjiMap(vocabularyCacheId: number) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/vocabulary-kanji-map/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ vocabulary_cache_id: vocabularyCacheId }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error("Could not generate vocabulary kanji map:", data?.error ?? response.status);
    }
}

export default function ReadAlongPage() {
    const router = useRouter();
    const params = useParams<{ userBookId: string }>();
    const userBookId = params.userBookId;
    const searchParams = useSearchParams();
    const savedPageStorageKey = `readalong-current-page:${userBookId}`;

    const [words, setWords] = useState<ReadAlongWord[]>([]);
    const [libraryColorByWordKey, setLibraryColorByWordKey] = useState<
        Record<string, LibraryStudyWordColorInfo>
    >({});
    const [loading, setLoading] = useState(true);
    const [supportMode, setSupportMode] = useState<SupportMode>("full");
    const [viewMode, setViewMode] = useState<FollowAlongViewMode>("follow-along");
    const [activeAddAfterWordId, setActiveAddAfterWordId] = useState<string | null>(null);
    const [activeAddPlacement, setActiveAddPlacement] = useState<AddWordPlacement>("after");
    const [addAfterDraft, setAddAfterDraft] = useState<AddAfterDraft>(() =>
        makeBlankAddAfterDraft()
    );

    const [pageIndex, setPageIndex] = useState(0);
    const [jumpPageInput, setJumpPageInput] = useState("");
    const [hasRestoredSavedPage, setHasRestoredSavedPage] = useState(false);
    const [selectedChapterKey, setSelectedChapterKey] = useState("all");
    const [fadedThroughIndex, setFadedThroughIndex] = useState<number>(-1);

    const [sessionDate, setSessionDate] = useState("");
    const [sessionStartPage, setSessionStartPage] = useState("");
    const [sessionEndPage, setSessionEndPage] = useState("");
    const [sessionMinutesRead, setSessionMinutesRead] = useState("");

    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showTimedSessionForm, setShowTimedSessionForm] = useState(false);
    const [timerSaveMessage, setTimerSaveMessage] = useState("");
    const [hasFinishedTimer, setHasFinishedTimer] = useState(false);
    const [timerPersistenceReady, setTimerPersistenceReady] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement | null>(null);
    const wordRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scrollAnimationFrame = useRef<number | null>(null);
    const skippedInitialPersistenceWriteRef = useRef(false);

    const [bookTitle, setBookTitle] = useState("");
    const [bookCover, setBookCover] = useState("");
    const [bookLanguageCode, setBookLanguageCode] = useState<string | null>(null);
    const [favoriteQuotes, setFavoriteQuotes] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [studentWorkspaceBackContext, setStudentWorkspaceBackContext] =
        useState<StudentWorkspaceBackContext | null>(null);
    const [accessChecked, setAccessChecked] = useState(false);
    const [canAccessBook, setCanAccessBook] = useState(false);
    const [learnerUserId, setLearnerUserId] = useState<string | null>(null);
    const [canUseSavedWordReading, setCanUseSavedWordReading] = useState(false);
    const [canUseReadingJournal, setCanUseReadingJournal] = useState(false);
    const [fullAccessLocked, setFullAccessLocked] = useState(false);
    const [accessMessage, setAccessMessage] = useState("");

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
        async function loadWords() {
            if (!userBookId) return;

            setLoading(true);
            setAccessChecked(false);
            setCanAccessBook(false);
            setLearnerUserId(null);
            setCanUseSavedWordReading(false);
            setCanUseReadingJournal(false);
            setFullAccessLocked(false);
            setAccessMessage("");
            setStudentWorkspaceBackContext(null);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setAccessMessage("Please sign in.");
                setAccessChecked(true);
                setCanAccessBook(false);
                setCanUseSavedWordReading(false);
                setCanUseReadingJournal(false);
                setFullAccessLocked(false);
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role, is_super_teacher, app_access_type, app_access_expires_at")
                .eq("id", user.id)
                .maybeSingle();

            const { data: userBook, error: userBookError } = await supabase
                .from("user_books")
                .select(`
                    id,
                    user_id,
                    favorite_quotes,
                    books:book_id (
                        title,
                        cover_url,
                        language_code
                    )
                `)
                .eq("id", userBookId)
                .maybeSingle();

            if (userBookError || !userBook) {
                if (userBookError) console.error("Error loading read along book:", userBookError);
                setAccessMessage("You do not have access to this book.");
                setAccessChecked(true);
                setCanAccessBook(false);
                setLoading(false);
                return;
            }

            const ownerUserId = (userBook as any).user_id;
            const isSuperTeacher =
                profile?.role === "super_teacher" || Boolean((profile as any)?.is_super_teacher);
            let canAccess =
                ownerUserId === user.id ||
                isSuperTeacher;

            if (!canAccess && profile?.role === "teacher" && ownerUserId) {
                const { data: teacherStudent, error: teacherStudentError } = await supabase
                    .from("teacher_students")
                    .select("teacher_id")
                    .eq("teacher_id", user.id)
                    .eq("student_id", ownerUserId)
                    .maybeSingle();

                if (!teacherStudentError && teacherStudent) {
                    canAccess = true;
                }
            }

            if (!canAccess) {
                setAccessMessage("You do not have access to this book.");
                setAccessChecked(true);
                setCanAccessBook(false);
                setLoading(false);
                return;
            }

            const trackerMode = await getEnglishNativeTrackerBookMode({ supabase, userBookId });
            if (trackerMode.isEnglishNativeTrackerBook) {
                router.replace(`/books/${userBookId}`);
                return;
            }

            const workspaceBackContext = await resolveStudentWorkspaceBackContext({
                supabase,
                from: searchParams.get("from"),
                requestedStudentId: searchParams.get("studentId"),
                currentUserId: user.id,
                profile,
                ownerUserId,
            });
            setStudentWorkspaceBackContext(workspaceBackContext);

            const book = Array.isArray((userBook as any)?.books)
                ? (userBook as any).books[0]
                : (userBook as any)?.books;

            setCanAccessBook(true);
            setLearnerUserId(ownerUserId);
            setAccessChecked(true);
            setBookTitle(book?.title ?? "");
            setBookCover(book?.cover_url ?? "");
            setBookLanguageCode(book?.language_code ?? null);
            setFavoriteQuotes((userBook as any)?.favorite_quotes ?? null);

            const appAccessStatus = profile
                ? getAppAccessStatus(profile)
                : { hasAccess: false, hasFullAccess: false, reason: "missing_profile" };

            const featureAccess = getFeatureAccess({
                role: (profile as any)?.is_super_teacher
                    ? "super_teacher"
                    : (profile as any)?.role ?? null,
                hasFullAccess: appAccessStatus.hasFullAccess,
                isTrialActive: appAccessStatus.reason === "trial",
            });

            const canUseSavedWordReadingNow = canUseFullAccessFeature(
                featureAccess,
                "saved_word_reading"
            );

            setCanUseSavedWordReading(canUseSavedWordReadingNow);
            setCanUseReadingJournal(
                Boolean(featureAccess.canUseStoryNotes && book?.language_code !== "en")
            );

            if (!canUseSavedWordReadingNow) {
                setWords([]);
                setLibraryColorByWordKey({});
                setFullAccessLocked(true);
                setViewMode("follow-along");
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("user_book_words")
                .select(`
                    id,
                    surface,
                    reading,
                    meaning,
                    jlpt,
                    meaning_choice_index,
                    page_number,
                    page_order,
                    chapter_number,
                    chapter_name,
                    hide_kanji_in_reading_support
                    `)
                .eq("user_book_id", userBookId)
                .eq("hidden", false)
                .order("page_number", { ascending: true, nullsFirst: false })
                .order("page_order", { ascending: true, nullsFirst: false })
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error loading read along words:", error);
                setWords([]);
                setLoading(false);
                return;
            }

            setWords(((data as ReadAlongWord[]) ?? []).filter(hasUsefulSupportMeaning));
            setLoading(false);
        }

        loadWords();
    }, [userBookId, searchParams]);

    useEffect(() => {
        let cancelled = false;

        async function loadLibraryColors() {
            if (!canAccessBook || !learnerUserId) return;

            const wordsToCheck = words.map((word) => ({
                surface: word.surface,
                reading: word.reading,
            }));

            const hasAnyLookupWord = wordsToCheck.some(
                (word) => word.surface?.trim() && word.reading?.trim()
            );

            if (!hasAnyLookupWord) {
                setLibraryColorByWordKey({});
                return;
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) return;

            const response = await fetch(`/api/books/${userBookId}/library-colors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ words: wordsToCheck }),
            });

            if (!response.ok) {
                console.warn("Could not load read along library colors:", await response.text());
                return;
            }

            const payload = (await response.json()) as {
                colors?: Record<string, LibraryStudyWordColorInfo>;
            };
            const next = payload.colors ?? {};

            if (!cancelled) {
                setLibraryColorByWordKey(next);
            }
        }

        void loadLibraryColors();

        return () => {
            cancelled = true;
        };
    }, [words, canAccessBook, learnerUserId, userBookId]);

    const chapterOptions = useMemo(() => {
        const map = new Map<
            string,
            {
                label: string;
                wordCount: number;
                pages: Set<number>;
                sortNumber: number;
            }
        >();

        for (const word of words) {
            const key = chapterKeyForWord(word);
            if (!key) continue;

            const existing =
                map.get(key) ??
                {
                    label: chapterLabelForWord(word),
                    wordCount: 0,
                    pages: new Set<number>(),
                    sortNumber: word.chapter_number ?? 999999,
                };

            existing.wordCount += 1;

            if (word.page_number != null) {
                existing.pages.add(word.page_number);
            }

            map.set(key, existing);
        }

        return Array.from(map.entries())
            .map(([key, value]) => ({
                key,
                label: value.label,
                wordCount: value.wordCount,
                pageCount: value.pages.size,
                sortNumber: value.sortNumber,
            }))
            .sort((a, b) => {
                if (a.sortNumber !== b.sortNumber) return a.sortNumber - b.sortNumber;
                return a.label.localeCompare(b.label, "ja");
            });
    }, [words]);

    const filteredWords = useMemo(() => {
        if (selectedChapterKey === "all") return words;

        return words.filter((word) => chapterKeyForWord(word) === selectedChapterKey);
    }, [words, selectedChapterKey]);

    const selectedChapterLabel =
        selectedChapterKey === "all"
            ? "All chapters"
            : chapterOptions.find((chapter) => chapter.key === selectedChapterKey)?.label ??
            "Selected chapter";

    const pages = useMemo<PageChunk[]>(() => {
        const numberedWords = filteredWords.filter((w) => w.page_number != null);

        if (numberedWords.length > 0) {
            const grouped = new Map<number, ReadAlongWord[]>();

            for (const w of numberedWords) {
                const page = w.page_number as number;
                if (!grouped.has(page)) grouped.set(page, []);
                grouped.get(page)!.push(w);
            }

            const pageNumbers = Array.from(grouped.keys()).sort((a, b) => a - b);
            const minPage = pageNumbers[0];
            const maxPage = pageNumbers[pageNumbers.length - 1];

            const result: PageChunk[] = [];

            for (let pageNum = minPage; pageNum <= maxPage; pageNum++) {
                result.push({
                    label: `Page ${pageNum}`,
                    words: grouped.get(pageNum) ?? [],
                    pageNumber: pageNum,
                });
            }

            return result;
        }

        return chunkArray(filteredWords, 8).map((chunk, idx) => ({
            label: `Section ${idx + 1}`,
            words: chunk,
            pageNumber: null,
        }));
    }, [filteredWords]);

    useEffect(() => {
        setPageIndex(0);
        setJumpPageInput("");
        setFadedThroughIndex(-1);
    }, [selectedChapterKey]);

    useEffect(() => {
        if (selectedChapterKey === "all") return;
        if (chapterOptions.some((chapter) => chapter.key === selectedChapterKey)) return;

        setSelectedChapterKey("all");
    }, [chapterOptions, selectedChapterKey]);

    useEffect(() => {
        if (!pages.length) return;

        const pageParam = searchParams.get("page");
        if (!pageParam) return;

        const pageNum = Number(pageParam);
        if (!Number.isFinite(pageNum) || pageNum <= 0) return;

        const matchIndex = pages.findIndex((p) => p.pageNumber === pageNum);

        if (matchIndex >= 0) {
            setPageIndex(matchIndex);
            setJumpPageInput("");
            setHasRestoredSavedPage(true);
        }
    }, [pages, searchParams]);

    useEffect(() => {
        if (!pages.length || hasRestoredSavedPage) return;
        if (searchParams.get("page")) return;
        if (typeof window === "undefined") return;

        const savedPage = Number(window.localStorage.getItem(savedPageStorageKey));
        if (!Number.isFinite(savedPage) || savedPage <= 0) {
            setHasRestoredSavedPage(true);
            return;
        }

        const matchIndex = pages.findIndex((p) => p.pageNumber === savedPage);
        if (matchIndex >= 0) {
            setPageIndex(matchIndex);
        }

        setHasRestoredSavedPage(true);
    }, [hasRestoredSavedPage, pages, savedPageStorageKey, searchParams]);

    const currentPage = pages[pageIndex] ?? null;
    const currentPageNumber = currentPage?.pageNumber ?? null;
    const currentPageChapterNumber = currentPage?.words[0]?.chapter_number ?? null;
    const currentPageChapterLabel = currentPage?.words[0]
        ? chapterLabelForWord(currentPage.words[0])
        : selectedChapterLabel;

    useEffect(() => {
        if (!hasRestoredSavedPage || currentPageNumber == null) return;
        if (typeof window === "undefined") return;

        window.localStorage.setItem(savedPageStorageKey, String(currentPageNumber));
    }, [currentPageNumber, hasRestoredSavedPage, savedPageStorageKey]);

    useEffect(() => {
        if (canUseReadingJournal) return;
        setViewMode("follow-along");
    }, [canUseReadingJournal]);

    function jumpToPage(pageNum: number) {
        if (!Number.isFinite(pageNum) || pageNum <= 0) return;

        const matchIndex = pages.findIndex((p) => p.pageNumber === pageNum);

        if (matchIndex >= 0) {
            setPageIndex(matchIndex);
            setJumpPageInput("");
        }
    }

    function goPrev() {
        setPageIndex((prev) => Math.max(0, prev - 1));
    }

    function goNext() {
        setPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
    }

    function goNextFromWordTap() {
        setPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
    }

    function animateScrollTo(container: HTMLDivElement, top: number, duration = 420) {
        if (scrollAnimationFrame.current) {
            cancelAnimationFrame(scrollAnimationFrame.current);
        }

        const startTop = container.scrollTop;
        const distance = top - startTop;
        const startTimeForAnimation = performance.now();

        const step = (now: number) => {
            const elapsedTime = now - startTimeForAnimation;
            const progress = Math.min(elapsedTime / duration, 1);
            const eased = easeInOutQuad(progress);

            container.scrollTop = startTop + distance * eased;

            if (progress < 1) {
                scrollAnimationFrame.current = requestAnimationFrame(step);
            } else {
                scrollAnimationFrame.current = null;
            }
        };

        scrollAnimationFrame.current = requestAnimationFrame(step);
    }

    function handleProgressTap(index: number, wordId: string) {
        if (index === 0 && fadedThroughIndex >= 0 && pageIndex > 0) {
            window.setTimeout(() => goPrev(), 120);
            return;
        }

        setFadedThroughIndex(index);

        const container = scrollAreaRef.current;

        const nextWord = currentPage.words[index + 1];
        if (!nextWord) {
            if (pageIndex < pages.length - 1) {
                window.setTimeout(() => goNextFromWordTap(), 180);
            }
            return;
        }

        const target =
            wordRefs.current[nextWord.id] ?? wordRefs.current[wordId];

        if (!container || !target) return;

        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const targetTopWithinScroll =
            targetRect.top - containerRect.top + container.scrollTop;

        const desiredTop = Math.max(0, targetTopWithinScroll - 104);

        animateScrollTo(container, desiredTop, 800);
    }

    async function openTimedSessionFormWithDefaults() {
        if (!canAccessBook) return;

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
            setSessionEndPage(currentPageNumber != null ? String(currentPageNumber) : "");
            setShowTimedSessionForm(true);
            return;
        }

        const latest = data?.[0];
        const nextStart =
            latest?.end_page != null && Number.isFinite(Number(latest.end_page))
                ? String(Number(latest.end_page) + 1)
                : "";

        setSessionStartPage(nextStart);
        setSessionEndPage(currentPageNumber != null ? String(currentPageNumber) : nextStart);
        setShowTimedSessionForm(true);
    }

    async function saveReadingSession() {
        if (!userBookId) return;

        if (!canAccessBook || !canUseSavedWordReading) {
            setTimerSaveMessage("❌ You do not have access to save sessions to this book.");
            return;
        }

        const startPageNum = Number(sessionStartPage);
        const endPageNum = Number(sessionEndPage);
        const minutesNum = Number(sessionMinutesRead || Math.max(1, Math.round(elapsed / 60)));

        if (!Number.isFinite(startPageNum) || !Number.isFinite(endPageNum)) {
            alert("Please enter a valid start page and end page.");
            return;
        }

        if (startPageNum <= 0 || endPageNum <= 0) {
            alert("Pages must be 1 or higher.");
            return;
        }

        if (endPageNum < startPageNum) {
            alert("End page cannot be before start page.");
            return;
        }

        if (!Number.isFinite(minutesNum) || minutesNum <= 0) {
            alert("Minutes read must be at least 1.");
            return;
        }

        const readOn = sessionDate || todayYmdAppTimeZone();

        const { error } = await supabase.from("user_book_reading_sessions").insert({
            user_book_id: userBookId,
            read_on: readOn,
            start_page: startPageNum,
            end_page: endPageNum,
            minutes_read: minutesNum,
            session_mode: "fluid",
        });

        if (error) {
            console.error("Error saving timed reading session:", error);
            alert(`Could not save reading session.\n${error.message}`);
            return;
        }

        setShowTimedSessionForm(false);
        setElapsed(0);
        setStartTime(null);
        setIsRunning(false);
        setIsPaused(false);
        setSessionMinutesRead("");
        clearPersistedTimedSession(READ_ALONG_TIMED_SESSION_MODE, userBookId);
        setTimerSaveMessage("Your fluid reading session has been saved in Reading History.");

        setTimeout(() => {
            setTimerSaveMessage("");
        }, 4000);
    }

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        if (isRunning && startTime) {
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, startTime]);

    useEffect(() => {
        if (!userBookId) return;

        skippedInitialPersistenceWriteRef.current = false;
        const persisted = readPersistedTimedSession(READ_ALONG_TIMED_SESSION_MODE, userBookId);
        if (persisted) {
            const restoredElapsedMs = elapsedMsForPersistedTimedSession(persisted);
            const restoredRunning =
                !persisted.isPaused &&
                !persisted.showTimedSessionForm &&
                typeof persisted.startedAt === "number";

            setStartTime(restoredRunning ? persisted.startedAt : null);
            setElapsed(Math.floor(restoredElapsedMs / 1000));
            setIsRunning(restoredRunning);
            setIsPaused(persisted.isPaused && !persisted.showTimedSessionForm);
            setShowTimedSessionForm(persisted.showTimedSessionForm);
            setHasFinishedTimer(persisted.showTimedSessionForm);
            setSessionDate(persisted.sessionDate);
            setSessionStartPage(persisted.sessionStartPage);
            setSessionEndPage(persisted.sessionEndPage);
            setSessionMinutesRead(
                persisted.showTimedSessionForm
                    ? String(Math.max(1, Math.round(restoredElapsedMs / 60000)))
                    : ""
            );
        }

        setTimerPersistenceReady(true);
    }, [userBookId]);

    useEffect(() => {
        if (!timerPersistenceReady || !userBookId) return;

        if (!skippedInitialPersistenceWriteRef.current) {
            skippedInitialPersistenceWriteRef.current = true;
            return;
        }

        if (!isRunning && !isPaused && !showTimedSessionForm && elapsed <= 0) {
            clearPersistedTimedSession(READ_ALONG_TIMED_SESSION_MODE, userBookId);
            return;
        }

        writePersistedTimedSession({
            version: 1,
            sessionMode: READ_ALONG_TIMED_SESSION_MODE,
            userBookId,
            startedAt: isRunning ? startTime : null,
            accumulatedElapsedMs: isRunning ? 0 : Math.max(0, elapsed * 1000),
            isPaused,
            sessionDate,
            sessionStartPage,
            sessionEndPage,
            showTimedSessionForm,
            savedAt: Date.now(),
        });
    }, [
        elapsed,
        isPaused,
        isRunning,
        sessionDate,
        sessionEndPage,
        sessionStartPage,
        showTimedSessionForm,
        startTime,
        timerPersistenceReady,
        userBookId,
    ]);

    useEffect(() => {
        if (!timerPersistenceReady || !userBookId) return;

        const persistCurrentTimer = () => {
            if (!isRunning && !isPaused && !showTimedSessionForm && elapsed <= 0) return;

            writePersistedTimedSession({
                version: 1,
                sessionMode: READ_ALONG_TIMED_SESSION_MODE,
                userBookId,
                startedAt: isRunning ? startTime : null,
                accumulatedElapsedMs: isRunning ? 0 : Math.max(0, elapsed * 1000),
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
        elapsed,
        isPaused,
        isRunning,
        sessionDate,
        sessionEndPage,
        sessionStartPage,
        showTimedSessionForm,
        startTime,
        timerPersistenceReady,
        userBookId,
    ]);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();

            const isTyping =
                tag === "input" ||
                tag === "textarea" ||
                tag === "select" ||
                target?.isContentEditable;

            if (isTyping) return;

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                goPrev();
            }

            if (e.key === "ArrowRight") {
                e.preventDefault();
                goNext();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pages.length]);

    useEffect(() => {
        setFadedThroughIndex(-1);

        if (scrollAnimationFrame.current) {
            cancelAnimationFrame(scrollAnimationFrame.current);
            scrollAnimationFrame.current = null;
        }

        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = 0;
        }
    }, [pageIndex]);

    useEffect(() => {
        return () => {
            if (scrollAnimationFrame.current) {
                cancelAnimationFrame(scrollAnimationFrame.current);
            }
        };
    }, []);

    useEffect(() => {
        async function loadBookInfo() {
            if (!userBookId) return;
            if (!canAccessBook) return;

            const { data: userBook, error: userBookError } = await supabase
                .from("user_books")
                .select("id, book_id")
                .eq("id", userBookId)
                .maybeSingle();

            if (userBookError) {
                console.error("Error loading user book info:", userBookError);
                setBookTitle("");
                setBookCover("");
                setBookLanguageCode(null);
                return;
            }

            if (!userBook) {
                setBookTitle("");
                setBookCover("");
                setBookLanguageCode(null);
                return;
            }

            const { data: book, error: bookError } = await supabase
                .from("books")
                .select("title, cover_url, language_code")
                .eq("id", userBook.book_id)
                .maybeSingle();

            if (bookError) {
                console.error("Error loading book details:", bookError);
                setBookTitle("");
                setBookCover("");
                setBookLanguageCode(null);
                return;
            }

            setBookTitle(book?.title ?? "");
            setBookCover(book?.cover_url ?? "");
            setBookLanguageCode(book?.language_code ?? null);
        }

        loadBookInfo();
    }, [userBookId, canAccessBook]);

    useEffect(() => {
        function handleBeforeUnload(e: BeforeUnloadEvent) {
            if (!isRunning && !isPaused) return;
            e.preventDefault();
            e.returnValue = "";
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isRunning, isPaused]);

    if (loading) {
        return <ReadAlongLoadingState />;
    }

    if (!accessChecked) {
        return <ReadAlongLoadingState />;
    }

    if (!canAccessBook) {
        return <ReadAlongAccessDeniedState message={accessMessage} />;
    }

    if (fullAccessLocked) {
        const copy = getFullAccessRequiredCopy("saved_word_reading");

        return (
            <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
                <div className="mx-auto max-w-3xl">
                    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                            Full access feature
                        </p>

                        <h1 className="mt-2 text-2xl font-black text-stone-950">
                            Saved-word reading support
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-stone-600">
                            {copy.message}
                        </p>

                        <p className="mt-3 text-sm leading-6 text-stone-600">
                            You can still read this book with the timer-only Just Reading page.
                        </p>

                        {bookTitle ? (
                            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                                <p className="text-xs uppercase tracking-wide text-stone-500">
                                    Current book
                                </p>
                                <p className="mt-1 font-semibold text-stone-900">{bookTitle}</p>
                            </div>
                        ) : null}

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
                                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                            >
                                Back to Book Hub
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    router.push(`/books/${encodeURIComponent(userBookId)}/just-reading`)
                                }
                                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                            >
                                Use Just Reading Timer
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    function handleStartTimer() {
        const today = todayYmdAppTimeZone();

        setSessionDate(today);
        setStartTime(Date.now());
        setElapsed(0);
        setIsRunning(true);
        setIsPaused(false);
        setHasFinishedTimer(false);
        setShowTimedSessionForm(false);
        setTimerSaveMessage("");
        setSessionMinutesRead("");
    }

    function handlePauseTimer() {
        if (startTime) {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }

        setIsRunning(false);
        setIsPaused(true);
    }

    async function handleFinishRunningTimer() {
        if (startTime) {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }

        setIsRunning(false);
        setIsPaused(false);
        setHasFinishedTimer(true);
        await openTimedSessionFormWithDefaults();
    }

    function handleResumeTimer() {
        setStartTime(Date.now() - elapsed * 1000);
        setIsRunning(true);
        setIsPaused(false);
    }

    async function handleFinishPausedTimer() {
        setIsPaused(false);
        setIsRunning(false);
        setHasFinishedTimer(true);
        await openTimedSessionFormWithDefaults();
    }

    async function handleSaveTimedSessionFromTimer() {
        setSessionMinutesRead(String(Math.max(1, Math.round(elapsed / 60))));
        await saveReadingSession();
    }

    function handleCancelTimedSession() {
        setShowTimedSessionForm(false);
        setElapsed(0);
        setStartTime(null);
        setIsPaused(false);
        setIsRunning(false);
        if (userBookId) {
            clearPersistedTimedSession(READ_ALONG_TIMED_SESSION_MODE, userBookId);
        }
    }

    function openAddAfter(word: ReadAlongWord, placement: AddWordPlacement) {
        setActiveAddAfterWordId((current) => {
            if (current === word.id && activeAddPlacement === placement) {
                setAddAfterDraft(makeBlankAddAfterDraft());
                return null;
            }

            setActiveAddPlacement(placement);
            setAddAfterDraft(makeBlankAddAfterDraft());
            return word.id;
        });
    }

    function applyAddAfterCandidate(candidate: JishoCandidate) {
        setAddAfterDraft((current) => ({
            ...current,
            word: candidate.surface,
            reading: candidate.reading,
            meaning: candidate.defaultMeaning,
            jlpt: candidate.jlpt,
            isCommon: candidate.isCommon,
            meaningChoices: candidate.meaningChoices,
            meaningChoiceIndex: candidate.meaningChoices.length > 0 ? 0 : null,
            message: "",
        }));
    }

    function updateAddAfterMeaning(index: number) {
        setAddAfterDraft((current) => ({
            ...current,
            meaningChoiceIndex: index,
            meaning: current.meaningChoices[index] ?? current.meaning,
        }));
    }

    async function lookupAddAfterWord() {
        const cleanWord = addAfterDraft.word.trim();

        if (!cleanWord) {
            setAddAfterDraft((current) => ({
                ...current,
                message: "Enter a word first.",
            }));
            return;
        }

        setAddAfterDraft((current) => ({
            ...current,
            lookupLoading: true,
            message: "",
        }));

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(cleanWord)}`, {
                headers: session?.access_token
                    ? { Authorization: `Bearer ${session.access_token}` }
                    : undefined,
            });

            if (!res.ok) {
                setAddAfterDraft((current) => ({
                    ...current,
                    candidates: [],
                    message: "Could not load dictionary data. You can enter it manually.",
                }));
                return;
            }

            const data = await res.json();
            const candidates = buildJishoCandidates(data?.data ?? [], cleanWord);
            const first = candidates[0];

            if (!first) {
                setAddAfterDraft((current) => ({
                    ...current,
                    candidates: [],
                    reading: "",
                    meaning: "",
                    jlpt: "NON-JLPT",
                    isCommon: false,
                    meaningChoices: [],
                    meaningChoiceIndex: null,
                    message: "No dictionary result found. You can enter it manually.",
                }));
                return;
            }

            setAddAfterDraft((current) => ({
                ...current,
                word: first.surface,
                reading: first.reading,
                meaning: first.defaultMeaning,
                jlpt: first.jlpt,
                isCommon: first.isCommon,
                meaningChoices: first.meaningChoices,
                meaningChoiceIndex: first.meaningChoices.length > 0 ? 0 : null,
                candidates,
                message:
                    candidates.length > 1
                        ? "Dictionary loaded. Choose the matching word if needed."
                        : "Dictionary loaded.",
            }));
        } catch (error) {
            console.error("Follow-Along add-after lookup error:", error);
            setAddAfterDraft((current) => ({
                ...current,
                candidates: [],
                message: "Could not load dictionary data. You can enter it manually.",
            }));
        } finally {
            setAddAfterDraft((current) => ({
                ...current,
                lookupLoading: false,
            }));
        }
    }

    async function renumberGroupWithInsertedWord(
        anchor: ReadAlongWord,
        insertedWordId: string,
        placement: AddWordPlacement
    ) {
        let query = supabase
            .from("user_book_words")
            .select("id, page_order, created_at, chapter_name")
            .eq("user_book_id", userBookId);

        if (anchor.chapter_number == null) query = query.is("chapter_number", null);
        else query = query.eq("chapter_number", anchor.chapter_number);

        if (anchor.page_number == null) query = query.is("page_number", null);
        else query = query.eq("page_number", anchor.page_number);

        const { data, error } = await query
            .order("page_order", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true })
            .order("id", { ascending: true });

        if (error) throw error;

        const anchorChapterName = anchor.chapter_name?.trim() ?? "";
        const groupRows = (data ?? []).filter(
            (row) => (row.chapter_name ?? "").trim() === anchorChapterName
        );
        const existingRows = groupRows.filter((row) => row.id !== insertedWordId);
        const anchorIndex = existingRows.findIndex((row) => row.id === anchor.id);
        const insertedRow = groupRows.find((row) => row.id === insertedWordId);

        if (!insertedRow || anchorIndex < 0) return null;

        const reorderedRows = [...existingRows];
        reorderedRows.splice(placement === "before" ? anchorIndex : anchorIndex + 1, 0, insertedRow);

        for (let index = 0; index < reorderedRows.length; index += 1) {
            const row = reorderedRows[index];
            const nextPageOrder = index + 1;

            if (Number(row.page_order) === nextPageOrder) continue;

            const { error: updateError } = await supabase
                .from("user_book_words")
                .update({ page_order: nextPageOrder })
                .eq("id", row.id)
                .eq("user_book_id", userBookId);

            if (updateError) throw updateError;
        }

        return new Map(reorderedRows.map((row, index) => [String(row.id), index + 1]));
    }

    async function saveAddAfterWord(anchor: ReadAlongWord) {
        if (!userBookId || !canAccessBook || !canUseSavedWordReading) return;

        const cleanWord = addAfterDraft.word.trim();
        const cleanReading = addAfterDraft.reading.trim();
        const cleanMeaning = addAfterDraft.meaning.trim();

        if (!cleanWord || !cleanReading || !cleanMeaning) {
            setAddAfterDraft((current) => ({
                ...current,
                message: "Add the word, reading, and meaning before saving.",
            }));
            return;
        }

        setAddAfterDraft((current) => ({
            ...current,
            saving: true,
            message: "",
        }));

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setAddAfterDraft((current) => ({
                    ...current,
                    message: "Please sign in.",
                }));
                return;
            }

            let vocabularyCacheId: number | null = null;
            const hasVerifiedDictionaryMatch = addAfterDraft.candidates.some(
                (candidate) =>
                    candidate.surface === cleanWord &&
                    candidate.reading === cleanReading &&
                    candidate.meaningChoices.length > 0
            );

            if (hasKanji(cleanWord) && cleanReading) {
                const { data: existingCache, error: cacheLookupError } = await supabase
                    .from("vocabulary_cache")
                    .select("id, jlpt, is_common")
                    .eq("surface", cleanWord)
                    .eq("reading", cleanReading)
                    .maybeSingle();

                if (cacheLookupError) throw cacheLookupError;

                const normalizedJlpt = normalizeJlpt(addAfterDraft.jlpt);
                const cacheMetadata = {
                    jlpt: normalizedJlpt === "NON-JLPT" ? null : normalizedJlpt,
                    is_common: !!addAfterDraft.isCommon,
                };

                if (existingCache?.id) {
                    vocabularyCacheId = existingCache.id;

                    if ((!existingCache.jlpt && cacheMetadata.jlpt) || existingCache.is_common == null) {
                        const { error: cacheUpdateError } = await supabase
                            .from("vocabulary_cache")
                            .update(cacheMetadata)
                            .eq("id", existingCache.id);

                        if (cacheUpdateError) {
                            console.error("Error updating vocabulary cache metadata:", cacheUpdateError);
                        }
                    }
                } else if (hasVerifiedDictionaryMatch) {
                    const { data: createdCache, error: cacheInsertError } = await supabase
                        .from("vocabulary_cache")
                        .insert({
                            surface: cleanWord,
                            reading: cleanReading,
                            ...cacheMetadata,
                        })
                        .select("id")
                        .single();

                    if (cacheInsertError) throw cacheInsertError;
                    vocabularyCacheId = createdCache.id;
                }
            }

            const payload = {
                user_book_id: userBookId,
                vocabulary_cache_id: vocabularyCacheId,
                surface: cleanWord,
                reading: cleanReading,
                meaning: cleanMeaning,
                other_definition: addAfterDraft.meaningChoiceIndex == null ? cleanMeaning : null,
                meaning_choices: addAfterDraft.meaningChoices,
                meaning_choice_index: addAfterDraft.meaningChoiceIndex,
                jlpt: normalizeJlpt(addAfterDraft.jlpt),
                is_common: !!addAfterDraft.isCommon,
                page_number: anchor.page_number,
                page_order:
                    activeAddPlacement === "before"
                        ? Math.max(1, anchor.page_order ?? 1)
                        : (anchor.page_order ?? 0) + 1,
                chapter_number: anchor.chapter_number,
                chapter_name: anchor.chapter_name?.trim() || null,
                hide_kanji_in_reading_support: false,
                seen_on: todayYmdAppTimeZone(),
                excluded_from_flashcards: !isReadyForFlashcards({
                    surface: cleanWord,
                    reading: cleanReading,
                    meaning: cleanMeaning,
                }),
            };

            const { data: insertedRow, error: insertError } = await supabase
                .from("user_book_words")
                .insert(payload)
                .select(
                    "id, surface, reading, meaning, jlpt, meaning_choice_index, page_number, page_order, chapter_number, chapter_name, hide_kanji_in_reading_support"
                )
                .single();

            if (insertError) throw insertError;

            const pageOrderById = await renumberGroupWithInsertedWord(
                anchor,
                insertedRow.id,
                activeAddPlacement
            );
            const insertedWord: ReadAlongWord = {
                id: String(insertedRow.id),
                surface: insertedRow.surface ?? cleanWord,
                reading: insertedRow.reading ?? cleanReading,
                meaning: insertedRow.meaning ?? cleanMeaning,
                jlpt: insertedRow.jlpt ?? normalizeJlpt(addAfterDraft.jlpt),
                meaning_choice_index:
                    insertedRow.meaning_choice_index == null
                        ? null
                        : Number(insertedRow.meaning_choice_index),
                page_number: insertedRow.page_number ?? anchor.page_number,
                page_order:
                    pageOrderById?.get(String(insertedRow.id)) ??
                    insertedRow.page_order ??
                    (activeAddPlacement === "before"
                        ? Math.max(1, anchor.page_order ?? 1)
                        : (anchor.page_order ?? 0) + 1),
                chapter_number: insertedRow.chapter_number ?? anchor.chapter_number,
                chapter_name: insertedRow.chapter_name ?? anchor.chapter_name,
                hide_kanji_in_reading_support: !!insertedRow.hide_kanji_in_reading_support,
            };

            setWords((currentWords) => {
                const withInserted = [
                    ...currentWords.filter((word) => word.id !== insertedWord.id),
                    insertedWord,
                ].map((word) => {
                    const nextPageOrder = pageOrderById?.get(word.id);
                    return nextPageOrder ? { ...word, page_order: nextPageOrder } : word;
                });

                return withInserted.sort((a, b) => {
                    const aChapter = a.chapter_number ?? Number.MAX_SAFE_INTEGER;
                    const bChapter = b.chapter_number ?? Number.MAX_SAFE_INTEGER;
                    if (aChapter !== bChapter) return aChapter - bChapter;

                    const aPage = a.page_number ?? Number.MAX_SAFE_INTEGER;
                    const bPage = b.page_number ?? Number.MAX_SAFE_INTEGER;
                    if (aPage !== bPage) return aPage - bPage;

                    const aOrder = a.page_order ?? Number.MAX_SAFE_INTEGER;
                    const bOrder = b.page_order ?? Number.MAX_SAFE_INTEGER;
                    if (aOrder !== bOrder) return aOrder - bOrder;

                    return a.id.localeCompare(b.id);
                });
            });

            if (vocabularyCacheId && hasKanji(cleanWord)) {
                await generateVocabularyKanjiMap(vocabularyCacheId);
            }

            setActiveAddAfterWordId(null);
            setActiveAddPlacement("after");
            setAddAfterDraft(makeBlankAddAfterDraft());
        } catch (error: any) {
            console.error("Follow-Along add-after save error:", error);
            setAddAfterDraft((current) => ({
                ...current,
                message: error?.message ?? "Could not save this word.",
            }));
        } finally {
            setAddAfterDraft((current) => ({
                ...current,
                saving: false,
            }));
        }
    }

    const contextSuffix = studentWorkspaceBackContext
        ? `?from=student-workspace&studentId=${encodeURIComponent(studentWorkspaceBackContext.studentId)}`
        : "";

    function renderAddAfterPanel(anchor: ReadAlongWord) {
        const placementLabel = activeAddPlacement === "before" ? "before" : "after";
        const selectedCandidateId =
            addAfterDraft.candidates.find(
                (candidate) =>
                    candidate.surface === addAfterDraft.word &&
                    candidate.reading === addAfterDraft.reading &&
                    candidate.defaultMeaning === addAfterDraft.meaning
            )?.id ?? "";

        return (
            <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-800">
                    Add {placementLabel} {anchor.surface}
                </p>

                <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                        value={addAfterDraft.word}
                        onChange={(event) =>
                            setAddAfterDraft((current) => ({
                                ...current,
                                word: event.target.value,
                                candidates: [],
                                meaningChoices: [],
                                meaningChoiceIndex: null,
                                message: "",
                            }))
                        }
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                void lookupAddAfterWord();
                            }
                        }}
                        className="w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                        placeholder="Word from this spot"
                    />
                    <button
                        type="button"
                        onClick={() => void lookupAddAfterWord()}
                        disabled={addAfterDraft.lookupLoading || addAfterDraft.saving}
                        className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-violet-800 transition hover:bg-violet-100 disabled:opacity-50"
                    >
                        {addAfterDraft.lookupLoading ? "Looking..." : "Lookup"}
                    </button>
                </div>

                {addAfterDraft.candidates.length > 1 ? (
                    <label className="mt-2 block">
                        <span className="text-xs font-bold text-violet-900">Dictionary match</span>
                        <select
                            value={selectedCandidateId}
                            onChange={(event) => {
                                const candidate = addAfterDraft.candidates.find(
                                    (item) => item.id === event.target.value
                                );
                                if (candidate) applyAddAfterCandidate(candidate);
                            }}
                            className="mt-1 w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                        >
                            {addAfterDraft.candidates.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                    {candidate.surface}
                                    {candidate.reading ? ` (${candidate.reading})` : ""}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="block">
                        <span className="text-xs font-bold text-violet-900">Reading</span>
                        <input
                            value={addAfterDraft.reading}
                            onChange={(event) =>
                                setAddAfterDraft((current) => ({
                                    ...current,
                                    reading: event.target.value,
                                    message: "",
                                }))
                            }
                            className="mt-1 w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                            placeholder="Reading"
                        />
                    </label>

                    {addAfterDraft.meaningChoices.length > 1 ? (
                        <label className="block">
                            <span className="text-xs font-bold text-violet-900">Meaning</span>
                            <select
                                value={
                                    addAfterDraft.meaningChoiceIndex == null
                                        ? ""
                                        : String(addAfterDraft.meaningChoiceIndex)
                                }
                                onChange={(event) => updateAddAfterMeaning(Number(event.target.value))}
                                className="mt-1 w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                            >
                                {addAfterDraft.meaningChoices.map((meaning, index) => (
                                    <option key={`${meaning}-${index}`} value={index}>
                                        {meaning}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}
                </div>

                <label className="mt-2 block">
                    <span className="text-xs font-bold text-violet-900">Meaning to save</span>
                    <textarea
                        value={addAfterDraft.meaning}
                        onChange={(event) =>
                            setAddAfterDraft((current) => ({
                                ...current,
                                meaning: event.target.value,
                                meaningChoiceIndex: null,
                                message: "",
                            }))
                        }
                        className="mt-1 min-h-[70px] w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                        placeholder="Meaning or nuance"
                    />
                </label>

                {addAfterDraft.message ? (
                    <p className="mt-2 text-xs font-semibold text-violet-900">
                        {addAfterDraft.message}
                    </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void saveAddAfterWord(anchor)}
                        disabled={addAfterDraft.saving || addAfterDraft.lookupLoading}
                        className="rounded-xl bg-violet-700 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-violet-800 disabled:opacity-50"
                    >
                        {addAfterDraft.saving ? "Saving..." : "Save here"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveAddAfterWordId(null);
                            setActiveAddPlacement("after");
                            setAddAfterDraft(makeBlankAddAfterDraft());
                        }}
                        className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-violet-800 transition hover:bg-violet-100"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    const showReadingWorkspace = viewMode === "workspace" && canUseReadingJournal;
    const readerShell = (
        <ReadAlongReaderShell
            scrollAreaRef={scrollAreaRef}
            header={
                <>
                    <ReadAlongPageNavigator
                        pageIndex={pageIndex}
                        pageCount={pages.length}
                        jumpPageInput={jumpPageInput}
                        onJumpPageInputChange={setJumpPageInput}
                        onJumpToPage={jumpToPage}
                        onPrevious={goPrev}
                        onNext={goNext}
                    />

                    <ReadAlongCurrentPageSummary
                        currentPageLabel={currentPage?.label ?? "Fluid Reading"}
                        wordCount={currentPage?.words.length ?? 0}
                        hasCurrentPage={Boolean(currentPage)}
                    />
                </>
            }
        >
            {!currentPage || currentPage.words.length === 0 ? (
                <ReadAlongEmptyState />
            ) : (
                <ReadAlongWordList
                    words={currentPage.words}
                    supportMode={supportMode}
                    fadedThroughIndex={fadedThroughIndex}
                    getColorInfo={(word) =>
                        libraryColorByWordKey[
                        makeLibraryStudyColorKey(word.surface, word.reading)
                        ] ?? null
                    }
                    setWordRef={(wordId, element) => {
                        wordRefs.current[wordId] = element;
                    }}
                    onProgressTap={handleProgressTap}
                    canAddAfter
                    activeAddAfterWordId={activeAddAfterWordId}
                    activeAddPlacement={activeAddPlacement}
                    renderAddAfterPanel={renderAddAfterPanel}
                    onOpenAddAfter={openAddAfter}
                />
            )}
        </ReadAlongReaderShell>
    );

    return (
        <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
            <div
                className={`mx-auto space-y-4 ${
                    showReadingWorkspace ? "max-w-[96rem]" : "max-w-4xl"
                }`}
            >
                {studentWorkspaceBackContext ? (
                    <button
                        type="button"
                        onClick={() => router.push(studentWorkspaceBackContext.href)}
                        className="text-sm font-semibold text-stone-500 hover:text-stone-900"
                    >
                        {studentWorkspaceBackContext.label}
                    </button>
                ) : null}

                <ReadAlongPageHeader />

                {canUseReadingJournal ? (
                    <div className="hidden justify-end lg:flex">
                        <div className="inline-flex rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setViewMode("follow-along")}
                                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                                    viewMode === "follow-along"
                                        ? "bg-stone-900 text-white"
                                        : "text-stone-600 hover:bg-stone-50"
                                }`}
                            >
                                Follow-Along
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("workspace")}
                                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                                    viewMode === "workspace"
                                        ? "bg-violet-700 text-white"
                                        : "text-stone-600 hover:bg-violet-50"
                                }`}
                            >
                                Reading Workspace
                            </button>
                        </div>
                    </div>
                ) : null}

                {bookTitle ? (
                    <ReadAlongBookContextCard
                        bookTitle={bookTitle}
                        bookCover={bookCover}
                        bookHubHref={`/books/${encodeURIComponent(userBookId)}${contextSuffix}`}
                        vocabListHref={`/books/${encodeURIComponent(userBookId)}/words${contextSuffix}`}
                    />
                ) : null}

                {chapterOptions.length > 0 ? (
                    <ReadAlongChapterSelector
                        selectedChapterKey={selectedChapterKey}
                        selectedChapterLabel={selectedChapterLabel}
                        chapterOptions={chapterOptions}
                        onSelectedChapterKeyChange={setSelectedChapterKey}
                    />
                ) : null}

                <ReadAlongTimerPanel
                    isRunning={isRunning}
                    isPaused={isPaused}
                    elapsedLabel={formatTimer(elapsed)}
                    showTimedSessionForm={showTimedSessionForm}
                    sessionStartPage={sessionStartPage}
                    sessionEndPage={sessionEndPage}
                    timerSaveMessage={timerSaveMessage}
                    onStartTimer={handleStartTimer}
                    onPauseTimer={handlePauseTimer}
                    onFinishRunningTimer={handleFinishRunningTimer}
                    onResumeTimer={handleResumeTimer}
                    onFinishPausedTimer={handleFinishPausedTimer}
                    onSessionStartPageChange={setSessionStartPage}
                    onSessionEndPageChange={setSessionEndPage}
                    onSaveTimedSession={handleSaveTimedSessionFromTimer}
                    onCancelTimedSession={handleCancelTimedSession}
                />

                <ReadAlongSupportModeTabs
                    supportMode={supportMode}
                    onSupportModeChange={setSupportMode}
                />

                {showReadingWorkspace && learnerUserId ? (
                    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-[minmax(0,1fr)_minmax(390px,clamp(28rem,34vw,32rem))]">
                        <div className="min-w-0">{readerShell}</div>
                        <div className="hidden min-w-0 lg:block">
                            <ReadingJournalPanel
                                userBookId={userBookId}
                                ownerUserId={learnerUserId}
                                favoriteQuotes={favoriteQuotes}
                                bookLanguageCode={bookLanguageCode}
                                currentPageNumber={currentPageNumber}
                                selectedChapterLabel={currentPageChapterLabel}
                                selectedChapterNumber={currentPageChapterNumber}
                                compact
                                vocabListHref={`/books/${encodeURIComponent(userBookId)}/words${contextSuffix}`}
                                onFavoriteQuotesChange={setFavoriteQuotes}
                            />
                        </div>
                    </div>
                ) : (
                    readerShell
                )}
            </div>
        </main>
    );
}
