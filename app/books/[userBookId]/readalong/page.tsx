"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ReadAlongWord = {
    id: string;
    surface: string;
    reading: string | null;
    meaning: string | null;
    page_number: number | null;
    page_order: number | null;
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

export default function ReadAlongPage() {
    const params = useParams<{ userBookId: string }>();
    const userBookId = params.userBookId;
    const searchParams = useSearchParams();

    const [words, setWords] = useState<ReadAlongWord[]>([]);
    const [loading, setLoading] = useState(true);
    const [supportMode, setSupportMode] = useState<SupportMode>("full");
    const [pageIndex, setPageIndex] = useState(0);
    const [jumpPageInput, setJumpPageInput] = useState("");
    const [fadedThroughIndex, setFadedThroughIndex] = useState<number>(-1);

    const scrollAreaRef = useRef<HTMLDivElement | null>(null);
    const wordRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const scrollAnimationFrame = useRef<number | null>(null);

    useEffect(() => {
        async function loadWords() {
            if (!userBookId) return;

            setLoading(true);

            const { data, error } = await supabase
                .from("user_book_words")
                .select("id, surface, reading, meaning, page_number, page_order, created_at")
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

    const pages = useMemo<PageChunk[]>(() => {
        const numberedWords = words.filter((w) => w.page_number != null);

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

        return chunkArray(words, 8).map((chunk, idx) => ({
            label: `Section ${idx + 1}`,
            words: chunk,
            pageNumber: null,
        }));
    }, [words]);

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

    function jumpToPage(pageNum: number) {
        if (!Number.isFinite(pageNum) || pageNum <= 0) return;

        const matchIndex = pages.findIndex((p) => p.pageNumber === pageNum);

        if (matchIndex >= 0) {
            setPageIndex(matchIndex);
            setJumpPageInput(String(pageNum));
        }
    }

    const currentPage = pages[pageIndex];

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
        const startTime = performance.now();

        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
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

    function handleProgressTap(index: number, wordId: string) {
        setFadedThroughIndex(index);

        const container = scrollAreaRef.current;
        const target = wordRefs.current[wordId];

        if (!container || !target) return;

        const stickyHeaderHeight = 116;
        const previewOfPreviousWord = 140;
        const desiredTop = Math.max(
            0,
            target.offsetTop - stickyHeaderHeight - previewOfPreviousWord
        );

        animateScrollTo(container, desiredTop, 1000);
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-50 p-6">
                <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 text-center text-stone-500">
                    Loading Read Along…
                </div>
            </main>
        );
    }

    if (!pages.length) {
        return (
            <main className="min-h-screen bg-stone-50 p-6">
                <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 text-center text-stone-500">
                    No words yet.
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
            <div className="pointer-events-none fixed inset-y-0 z-30 hidden w-full xl:flex">
                <div className="relative mx-auto w-full max-w-[68rem]">
                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={pageIndex === 0}
                        className="pointer-events-auto absolute left-0 top-1/2 -translate-x-[calc(100%+12px)] -translate-y-1/2 rounded-2xl border border-stone-300 bg-white/90 px-4 py-3 text-sm font-medium text-stone-700 shadow-sm backdrop-blur transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ← Previous
                    </button>

                    <button
                        type="button"
                        onClick={goNext}
                        disabled={pageIndex === pages.length - 1}
                        className="pointer-events-auto absolute right-0 top-1/2 translate-x-[calc(100%+12px)] -translate-y-1/2 rounded-2xl border border-stone-300 bg-white/90 px-4 py-3 text-sm font-medium text-stone-700 shadow-sm backdrop-blur transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Next →
                    </button>
                </div>
            </div>

            <div className="mx-auto max-w-4xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-stone-900">Read Along</h1>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setSupportMode("full")}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${supportMode === "full"
                                ? "bg-stone-900 text-white"
                                : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                                }`}
                        >
                            Full Support
                        </button>

                        <button
                            type="button"
                            onClick={() => setSupportMode("reading")}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${supportMode === "reading"
                                ? "bg-stone-900 text-white"
                                : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                                }`}
                        >
                            Reading Support
                        </button>

                        <button
                            type="button"
                            onClick={() => setSupportMode("meaning")}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${supportMode === "meaning"
                                ? "bg-stone-900 text-white"
                                : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                                }`}
                        >
                            Meaning Support
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-3">
                            <div className="shrink-0 text-sm font-medium text-stone-900">
                                Jump to page
                            </div>
                            <p className="text-sm text-stone-500">
                                Go straight to a page number in your saved vocab.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                                placeholder="e.g. 45"
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm sm:w-32"
                            />

                            <button
                                type="button"
                                onClick={() => jumpToPage(Number(jumpPageInput))}
                                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                            >
                                Go
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                    <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-4">
                            <div>
                                <div className="text-base font-semibold text-stone-900">
                                    {currentPage.label}
                                </div>
                                <div className="text-xs text-stone-500 sm:text-sm">
                                    {currentPage.words.length} saved word
                                    {currentPage.words.length === 1 ? "" : "s"}
                                </div>
                            </div>

                            <div className="text-center text-xs text-stone-500 sm:text-sm">
                                Follow saved words in reading order and tap to mark your place.
                            </div>
                        </div>
                    </div>

                    <div
                        ref={scrollAreaRef}
                        className="max-h-[72vh] overflow-y-auto px-4 py-4 sm:px-6"
                    >
                        {currentPage.words.length === 0 ? (
                            <div className="mx-auto max-w-2xl py-16 text-center">
                                <div className="text-2xl font-semibold text-stone-700">
                                    No saved words here.
                                </div>
                                <p className="mt-3 text-sm text-stone-500">You knew everything!</p>
                            </div>
                        ) : (
                            <div className="mx-auto max-w-2xl space-y-3">
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
                                                <div className="text-xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-2xl">
                                                    {w.surface || "—"}
                                                </div>

                                                {(supportMode === "full" || supportMode === "reading") && (
                                                    <div className="mt-1 text-sm text-stone-500 sm:text-base">
                                                        {w.reading || "—"}
                                                    </div>
                                                )}

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

                    <div className="sticky bottom-0 z-10 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 xl:hidden">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={goPrev}
                                disabled={pageIndex === 0}
                                className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                ← Previous
                            </button>

                            <div className="text-center text-xs text-stone-500 sm:text-sm">
                                {currentPage.label}
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
                    </div>
                </div>
            </div>
        </main>
    );
}