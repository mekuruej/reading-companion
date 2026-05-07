// Read Along Page
// 

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

        animateScrollTo(container, desiredTop, 1000);
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

        const readOn = sessionDate || new Date().toISOString().slice(0, 10);

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
    }, [userBookId]);

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
        return (
            <main className="min-h-screen bg-stone-50 p-6">
                <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 text-center text-stone-500">
                    Loading Read Along…
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
            <div className="mx-auto max-w-4xl space-y-4">
                <div>
                    <h1 className="text-2xl font-semibold text-stone-900">Fluid Reading</h1>
                    <p className="mt-1 text-sm text-stone-600">
                        Use this for a quicker, smoother reading experience while you read along with your saved words. New lookups can wait — this page is for keeping your reading momentum.
                    </p>

                    <p className="mt-2 text-xs text-stone-500">
                        Want to look up words while reading?{" "}
                        <a
                            href={`/vocab/single-add?userBookId=${userBookId}`}
                            className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
                        >
                            Head to Curiosity Reading
                        </a>
                    </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center">
                    <div className="text-base font-semibold text-stone-900">
                        Fluid Reading with Saved Word Support
                    </div>
                    <p className="mt-3 text-sm leading-6 text-stone-700">
                        Read forward without stopping for new lookups. Use your saved words only as light support.
                    </p>
                </div>

                {bookTitle ? (
                    <div className="mb-2 mt-2 flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                router.push(`/books/${encodeURIComponent(userBookId)}/words`);
                            }}
                            className="flex items-center gap-4 rounded-xl px-1 text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            title={`Go to ${bookTitle} Vocab List`}
                        >
                            {bookCover ? (
                                <img
                                    src={bookCover}
                                    alt={`Go to ${bookTitle} Vocab List`}
                                    className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
                                />
                            ) : null}

                            <div>
                                <p className="text-xs uppercase tracking-wide text-stone-500">For book</p>
                                <div className="text-base font-semibold text-stone-900 hover:text-emerald-700">
                                    {bookTitle}
                                </div>
                                {hasFinishedTimer ? (
                                    <p className="mt-1 text-sm text-emerald-700">Open Vocab List</p>
                                ) : null}
                            </div>
                        </button>

                        {hasFinishedTimer ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (userBookId) {
                                        router.push(`/books/${encodeURIComponent(userBookId)}`);
                                    }
                                }}
                                className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-stone-700"
                            >
                                Open Book Hub
                            </button>
                        ) : null}
                    </div>
                ) : null}

                <div className="rounded-xl border border-stone-200 bg-white px-3 py-3">
                    <div className="mb-2 text-center text-sm text-stone-600">
                        Use the timer to track your fluid reading session, whether you read quietly or with saved word support.
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {!isRunning && !isPaused ? (
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date().toISOString().slice(0, 10);

                                    setSessionDate(today);
                                    setStartTime(Date.now());
                                    setElapsed(0);
                                    setIsRunning(true);
                                    setIsPaused(false);
                                    setHasFinishedTimer(false);
                                    setShowTimedSessionForm(false);
                                    setTimerSaveMessage("");
                                    setSessionMinutesRead("");
                                }}
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                            >
                                Start Timer
                            </button>
                        ) : null}

                        {isRunning ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (startTime) {
                                            setElapsed(Math.floor((Date.now() - startTime) / 1000));
                                        }
                                        setIsRunning(false);
                                        setIsPaused(true);
                                    }}
                                    className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
                                >
                                    Pause
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (startTime) {
                                            setElapsed(Math.floor((Date.now() - startTime) / 1000));
                                        }
                                        setIsRunning(false);
                                        setIsPaused(false);
                                        setHasFinishedTimer(true);
                                        void openTimedSessionFormWithDefaults();
                                    }}
                                    className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                                >
                                    Finish
                                </button>
                            </>
                        ) : null}

                        {isPaused ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStartTime(Date.now() - elapsed * 1000);
                                        setIsRunning(true);
                                        setIsPaused(false);
                                    }}
                                    className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                                >
                                    Resume
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPaused(false);
                                        setIsRunning(false);
                                        setHasFinishedTimer(true);
                                        void openTimedSessionFormWithDefaults();
                                    }}
                                    className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                                >
                                    Finish
                                </button>
                            </>
                        ) : null}

                        <div className="flex items-center rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700">
                            ⏱ {formatTimer(elapsed)}
                        </div>
                    </div>

                    {showTimedSessionForm && !isRunning ? (
                        <div className="mt-3 rounded-2xl border border-stone-300 bg-white p-4">
                            <div className="mb-3 text-sm font-medium text-stone-700">
                                Save this reading session
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <div className="mb-1 text-sm text-stone-600">Start page</div>
                                    <input
                                        type="number"
                                        min={1}
                                        value={sessionStartPage}
                                        onChange={(e) => setSessionStartPage(e.target.value)}
                                        placeholder="e.g. 45"
                                        className="w-full rounded border px-3 py-2 text-sm"
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-sm text-stone-600">End page</div>
                                    <input
                                        type="number"
                                        min={1}
                                        value={sessionEndPage}
                                        onChange={(e) => setSessionEndPage(e.target.value)}
                                        placeholder="e.g. 52"
                                        className="w-full rounded border px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="mt-3 text-sm text-stone-500">
                                Time: {formatTimer(elapsed)}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setSessionMinutesRead(String(Math.max(1, Math.round(elapsed / 60))));
                                        await saveReadingSession();
                                    }}
                                    className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                                >
                                    Save Timed Session
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTimedSessionForm(false);
                                        setElapsed(0);
                                        setStartTime(null);
                                        setIsPaused(false);
                                        setIsRunning(false);
                                    }}
                                    className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {(isRunning || isPaused) ? (
                        <p className="mt-2 text-xs text-amber-600">
                            Timer is active. If you leave Read Along or refresh the page, you may lose your session.
                        </p>
                    ) : null}

                    {timerSaveMessage ? (
                        <p className="mt-2 text-xs text-emerald-600">{timerSaveMessage}</p>
                    ) : null}
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => setSupportMode("full")}
                        className={`rounded-xl px-2 py-2 text-xs whitespace-nowrap sm:text-sm ${supportMode === "full"
                            ? "bg-stone-900 text-white"
                            : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                            }`}
                    >
                        <span className="sm:hidden">Full</span>
                        <span className="hidden sm:inline">Full Support</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSupportMode("reading")}
                        className={`rounded-xl px-2 py-2 text-xs whitespace-nowrap sm:text-sm ${supportMode === "reading"
                            ? "bg-stone-900 text-white"
                            : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                            }`}
                    >
                        <span className="sm:hidden">Reading</span>
                        <span className="hidden sm:inline">Reading Support</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSupportMode("meaning")}
                        className={`rounded-xl px-2 py-2 text-xs whitespace-nowrap sm:text-sm ${supportMode === "meaning"
                            ? "bg-stone-900 text-white"
                            : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                            }`}
                    >
                        <span className="sm:hidden">Meaning</span>
                        <span className="hidden sm:inline">Meaning Support</span>
                    </button>
                </div>

                {chapterOptions.length > 0 ? (
                    <section className="mb-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-lg font-black text-stone-900">
                                    {selectedChapterLabel}
                                </h2>
                                <p className="mt-1 text-sm text-stone-500">
                                    Choose a chapter, or add a page number below for a more exact spot.
                                </p>
                            </div>

                            <label className="w-full text-sm sm:w-72">
                                <select
                                    value={selectedChapterKey}
                                    onChange={(event) => setSelectedChapterKey(event.target.value)}
                                    className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="all">All chapters</option>
                                    {chapterOptions.map((chapter) => (
                                        <option key={chapter.key} value={chapter.key}>
                                            {chapter.label} · {chapter.wordCount} words
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </section>
                ) : null}

                <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                    <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
                        <div className="space-y-3">
                            {pages.length > 0 ? (
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={goPrev}
                                        disabled={pageIndex === 0}
                                        className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        ← Previous
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            value={jumpPageInput}
                                            onChange={(e) => setJumpPageInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    jumpToPage(Number(jumpPageInput));
                                                }
                                            }}
                                            placeholder="Page"
                                            className="w-20 rounded-lg border border-stone-300 px-2 py-1 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => jumpToPage(Number(jumpPageInput))}
                                            className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-black"
                                        >
                                            Go
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={goNext}
                                        disabled={pageIndex === pages.length - 1}
                                        className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Next →
                                    </button>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3 sm:items-center sm:text-left">
                                <div className="order-2 text-sm text-stone-500 sm:order-1">
                                    {currentPage
                                        ? `${currentPage.words.length} saved word${currentPage.words.length === 1 ? "" : "s"}`
                                        : "No saved words yet"}
                                </div>

                                <div className="order-1 text-xl font-bold text-stone-900 sm:order-2 sm:text-center">
                                    {currentPage ? currentPage.label : "Fluid Reading"}
                                </div>

                                <div className="order-3 text-sm text-stone-500 sm:text-right">
                                    Tap the words to follow along with the book.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        ref={scrollAreaRef}
                        className="max-h-[72vh] overflow-y-auto px-4 py-4 sm:px-6"
                    >
                        {!currentPage || currentPage.words.length === 0 ? (
                            <div className="mx-auto max-w-2xl py-16 text-center">
                                <div className="text-2xl font-semibold text-stone-700">
                                    No saved words here.
                                </div>

                                <p className="mt-3 text-sm text-stone-500">
                                    Enjoy the story!
                                </p>
                            </div>
                        ) : (
                            <div className="mx-auto max-w-2xl space-y-3 pb-[60vh]">
                                {currentPage.words.map((w, index) => {
                                    const isFaded = index <= fadedThroughIndex;

                                    return (
                                        <div
                                            key={w.id}
                                            ref={(el) => {
                                                wordRefs.current[w.id] = el;
                                            }}
                                            onClick={() => handleProgressTap(index, w.id)}
                                            className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${isFaded
                                                ? "border-stone-200 bg-stone-50 opacity-35"
                                                : "border-stone-200 bg-white hover:bg-stone-50"
                                                }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
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