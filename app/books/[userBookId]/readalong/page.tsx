"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ReadAlongWord = {
    id: string;
    surface: string;
    reading: string | null;
    meaning: string | null;
    page_number: number | null;
};

type SupportMode = "full" | "reading" | "meaning";

type PageChunk = {
    label: string;
    words: ReadAlongWord[];
};

function chunkArray<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

export default function ReadAlongPage() {
    const params = useParams<{ userBookId: string }>();
    const userBookId = params.userBookId;

    const [words, setWords] = useState<ReadAlongWord[]>([]);
    const [loading, setLoading] = useState(true);
    const [supportMode, setSupportMode] = useState<SupportMode>("full");
    const [pageIndex, setPageIndex] = useState(0);

    useEffect(() => {
        async function loadWords() {
            if (!userBookId) return;

            setLoading(true);

            const { data, error } = await supabase
                .from("user_book_words")
                .select("id, surface, reading, meaning, page_number, created_at")
                .eq("user_book_id", userBookId)
                .eq("hidden", false)
                .order("page_number", { ascending: true, nullsFirst: false })
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
        const hasAnyPageNumbers = words.some((w) => w.page_number != null);

        if (hasAnyPageNumbers) {
            const grouped = new Map<number, ReadAlongWord[]>();

            for (const w of words) {
                const page = w.page_number ?? -1;
                if (!grouped.has(page)) grouped.set(page, []);
                grouped.get(page)!.push(w);
            }

            const sortedPages = Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);

            const result: PageChunk[] = [];

            for (const [pageNum, pageWords] of sortedPages) {
                const chunks = chunkArray(pageWords, 6);

                chunks.forEach((chunk, idx) => {
                    result.push({
                        label:
                            chunks.length === 1
                                ? pageNum === -1
                                    ? "No page"
                                    : `Page ${pageNum}`
                                : pageNum === -1
                                    ? `No page (${idx + 1})`
                                    : `Page ${pageNum} (${idx + 1})`,
                        words: chunk,
                    });
                });
            }

            return result;
        }

        return chunkArray(words, 5).map((chunk, idx) => ({
            label: `Section ${idx + 1}`,
            words: chunk,
        }));
    }, [words]);

    const currentPage = pages[pageIndex];

    function goPrev() {
        setPageIndex((prev) => Math.max(0, prev - 1));
    }

    function goNext() {
        setPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
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
        <main className="min-h-screen bg-stone-50 p-6">
            <div className="mx-auto max-w-4xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-stone-900">Read Along</h1>
                        <p className="mt-1 text-sm text-stone-500">
                            Follow the words in reading order.
                        </p>
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

                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={pageIndex === 0}
                        className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ← Previous
                    </button>

                    <div className="text-center">
                        <div className="text-sm font-medium text-stone-900">{currentPage.label}</div>
                        <div className="text-xs text-stone-500">
                            {pageIndex + 1} / {pages.length}
                        </div>
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

                <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm transition-all duration-200">
                    <div className="mx-auto max-w-2xl space-y-8 text-center">
                        {currentPage.words.map((w) => (
                            <div
                                key={w.id}
                                className="border-b border-stone-100 pb-6 last:border-b-0 last:pb-0"
                            >
                                <div className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                                    {w.surface || "—"}
                                </div>

                                {(supportMode === "full" || supportMode === "reading") && (
                                    <div className="mt-2 text-lg text-stone-500">
                                        {w.reading || "—"}
                                    </div>
                                )}

                                {(supportMode === "full" || supportMode === "meaning") && (
                                    <div className="mt-3 mx-auto max-w-xl text-left text-base leading-7 text-stone-700 sm:text-lg">
                                        {w.meaning || "—"}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}