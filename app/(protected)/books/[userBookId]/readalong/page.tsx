// Fluid Reading - Extensive
// 

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import LibraryColorBadge from "@/components/LibraryColorBadge";
import ReadAlongLoadingState from "./components/ReadAlongLoadingState";
import ReadAlongPageHeader from "./components/ReadAlongPageHeader";
import ReadAlongBookContextCard from "./components/ReadAlongBookContextCard";
import ReadAlongEmptyState from "./components/ReadAlongEmptyState";
import ReadAlongSupportModeTabs from "./components/ReadAlongSupportModeTabs";
import ReadAlongCurrentPageSummary from "./components/ReadAlongCurrentPageSummary";
import ReadAlongPageNavigator from "./components/ReadAlongPageNavigator";
import ReadAlongChapterSelector from "./components/ReadAlongChapterSelector";
import ReadAlongTimerPanel from "./components/ReadAlongTimerPanel";
import {
    fetchLibraryStudyColorInfoByWord,
    makeLibraryStudyColorKey,
    type LibraryStudyWordColorInfo,
} from "@/lib/libraryStudyColorLookup";
import { todayYmdAppTimeZone } from "@/lib/timeZone";

type ReadAlongWord = {
    id: string;
    surface: string;
    reading: string | null;
    meaning: string | null;
    page_number: number | null;
    page_order: number | null;
    chapter_number: number | null;
    chapter_name: string | null;
    hide_kanji_in_reading_support?: boolean | null;
};

type SupportMode = "full" | "reading" | "meaning";

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

export default function ReadAlongPage() {
    const router = useRouter();
    const params = useParams<{ userBookId: string }>();
    const userBookId = params.userBookId;
    const searchParams = useSearchParams();

    const [words, setWords] = useState<ReadAlongWord[]>([]);
    const [libraryColorByWordKey, setLibraryColorByWordKey] = useState<
        Record<string, LibraryStudyWordColorInfo>
    >({});
    const [loading, setLoading] = useState(true);
    const [supportMode, setSupportMode] = useState<SupportMode>("full");

    const [pageIndex, setPageIndex] = useState(0);
    const [jumpPageInput, setJumpPageInput] = useState("");
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

    const scrollAreaRef = useRef<HTMLDivElement | null>(null);
    const wordRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scrollAnimationFrame = useRef<number | null>(null);

    const [bookTitle, setBookTitle] = useState("");
    const [bookCover, setBookCover] = useState("");
    const [username, setUsername] = useState("");
    const [accessChecked, setAccessChecked] = useState(false);
    const [canAccessBook, setCanAccessBook] = useState(false);
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
            setAccessMessage("");

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setAccessMessage("Please sign in.");
                setAccessChecked(true);
                setCanAccessBook(false);
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role, is_super_teacher")
                .eq("id", user.id)
                .maybeSingle();

            const { data: userBook, error: userBookError } = await supabase
                .from("user_books")
                .select(`
                    id,
                    user_id,
                    books:book_id (
                        title,
                        cover_url
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

            const book = Array.isArray((userBook as any)?.books)
                ? (userBook as any).books[0]
                : (userBook as any)?.books;

            setCanAccessBook(true);
            setAccessChecked(true);
            setBookTitle(book?.title ?? "");
            setBookCover(book?.cover_url ?? "");

            const { data, error } = await supabase
                .from("user_book_words")
                .select(`
                    id,
                    surface,
                    reading,
                    meaning,
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

            setWords((data as ReadAlongWord[]) ?? []);
            setLoading(false);
        }

        loadWords();
    }, [userBookId]);

    useEffect(() => {
        let cancelled = false;

        async function loadLibraryColors() {
            if (!canAccessBook) return;

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
                data: { user },
            } = await supabase.auth.getUser();

            if (!user?.id) return;

            const next = await fetchLibraryStudyColorInfoByWord(
                supabase,
                user.id,
                wordsToCheck
            );

            if (!cancelled) {
                setLibraryColorByWordKey(next);
            }
        }

        void loadLibraryColors();

        return () => {
            cancelled = true;
        };
    }, [words, canAccessBook]);

    useEffect(() => {
        let cancelled = false;

        async function loadLibraryColors() {
            if (!canAccessBook) return;

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
                data: { user },
            } = await supabase.auth.getUser();

            if (!user?.id) return;

            const next = await fetchLibraryStudyColorInfoByWord(
                supabase,
                user.id,
                wordsToCheck
            );

            if (!cancelled) {
                setLibraryColorByWordKey(next);
            }
        }

        void loadLibraryColors();

        return () => {
            cancelled = true;
        };
    }, [words, canAccessBook]);

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
            setJumpPageInput(String(pageNum));
        }
    }, [pages, searchParams]);

    const currentPage = pages[pageIndex] ?? null;
    const currentPageNumber = currentPage?.pageNumber ?? null;

    function jumpToPage(pageNum: number) {
        if (!Number.isFinite(pageNum) || pageNum <= 0) return;

        const matchIndex = pages.findIndex((p) => p.pageNumber === pageNum);

        if (matchIndex >= 0) {
            setPageIndex(matchIndex);
            setJumpPageInput(String(pageNum));
        }
    }

    function goPrev() {
        setPageIndex((prev) => Math.max(0, prev - 1));
    }

    function goNext() {
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
        setFadedThroughIndex(index);

        const container = scrollAreaRef.current;

        const nextWord = currentPage.words[index + 1];
        const target =
            (nextWord ? wordRefs.current[nextWord.id] : null) ?? wordRefs.current[wordId];

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

        if (!canAccessBook) {
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
        setTimerSaveMessage("Your fluid reading session has been saved in the Reading Tab.");

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
                return;
            }

            if (!userBook) {
                setBookTitle("");
                setBookCover("");
                return;
            }

            const { data: book, error: bookError } = await supabase
                .from("books")
                .select("title, cover_url")
                .eq("id", userBook.book_id)
                .maybeSingle();

            if (bookError) {
                console.error("Error loading book details:", bookError);
                setBookTitle("");
                setBookCover("");
                return;
            }

            setBookTitle(book?.title ?? "");
            setBookCover(book?.cover_url ?? "");
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
        return (
            <AccessDeniedMessage message={accessMessage || "You do not have access to this book."} />
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
    }

    return (
        <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
            <div className="mx-auto max-w-4xl space-y-4">
                <ReadAlongPageHeader />
                {bookTitle ? (
                    <ReadAlongBookContextCard
                        bookTitle={bookTitle}
                        bookCover={bookCover}
                        onOpenBookHub={() => {
                            router.push(`/books/${encodeURIComponent(userBookId)}`);
                        }}
                        onOpenVocabList={() => {
                            router.push(`/books/${encodeURIComponent(userBookId)}/words`);
                        }}
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

                <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                    <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
                        <div className="space-y-3">
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
                        </div>
                    </div>

                    <div
                        ref={scrollAreaRef}
                        className="max-h-[72vh] overflow-y-auto px-4 py-4 sm:px-6"
                    >
                        {!currentPage || currentPage.words.length === 0 ? (
                            <ReadAlongEmptyState />
                        ) : (
                            <div className="mx-auto max-w-2xl space-y-3 pb-[60vh]">
                                {currentPage.words.map((w, index) => {
                                    const isFaded = index <= fadedThroughIndex;
                                    const colorInfo =
                                        libraryColorByWordKey[makeLibraryStudyColorKey(w.surface, w.reading)] ?? null;

                                    return (
                                        <div
                                            key={w.id}
                                            ref={(el) => {
                                                wordRefs.current[w.id] = el;
                                            }}
                                            onClick={() => handleProgressTap(index, w.id)}
                                            className={`relative cursor-pointer rounded-2xl border px-4 py-3 pr-28 transition ${isFaded
                                                ? "border-stone-200 bg-stone-50 opacity-35"
                                                : "border-stone-200 bg-white hover:bg-stone-50"
                                                }`}
                                        >
                                            {colorInfo ? (
                                                <div className="absolute right-4 top-3">
                                                    <LibraryColorBadge
                                                        colorStatus={colorInfo.colorStatus}
                                                        stageLabel={colorInfo.stageLabel}
                                                    />
                                                </div>
                                            ) : null}

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <div className="text-xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-2xl">
                                                        {(w.hide_kanji_in_reading_support ? (w.reading || w.surface) : w.surface) || "—"}
                                                    </div>

                                                    {(supportMode === "full" || supportMode === "reading") && (
                                                        <div className="text-sm text-stone-500 sm:text-base">
                                                            {w.reading || "—"}
                                                        </div>
                                                    )}
                                                </div>

                                                {(supportMode === "full" || supportMode === "meaning") && (
                                                    <div className="mt-2 text-sm leading-6 text-stone-700 sm:text-base">
                                                        {w.meaning || "—"}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
