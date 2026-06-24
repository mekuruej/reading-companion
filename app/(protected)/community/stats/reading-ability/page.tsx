// Reading Ability

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import SectionBand from "./components/SectionBand";
import PieChart from "./components/PieChart";
import ReadingAbilityFilterSelector from "./components/ReadingAbilityFilterSelector";
import ReadingAbilityHeader from "./components/ReadingAbilityHeader";
import PaceLegendCards from "./components/PaceLegendCards";
import ReadingRangeCard from "./components/ReadingRangeCard";
import ReadingAbilityComparisonPanel from "./components/ReadingAbilityComparisonPanel";
import ReadingAbilityMetricGrid from "./components/ReadingAbilityMetricGrid";
import {
  ReadingAbilityErrorBanner,
  ReadingAbilityLoadingPanel,
} from "./components/ReadingAbilityStatePanels";
import ReadingAbilityTypePanel from "./components/ReadingAbilityTypePanel";

type SessionMode = "fluid" | "curiosity" | "listening" | string;

type SessionRow = {
    user_book_id: string;
    read_on: string | null;
    start_page: number | null;
    end_page: number | null;
    minutes_read: number | null;
    session_mode: SessionMode | null;
    is_filler?: boolean | null;
};

type WordRow = {
    id: string;
    user_book_id: string;
    created_at: string;
    surface: string | null;
    meaning: string | null;
};

type RawUserBookRow = {
    id: string;
    books:
    | {
        id: string;
        title: string | null;
        book_type: string | null;
        page_count: number | null;
        cover_url: string | null;
    }
    | {
        id: string;
        title: string | null;
        book_type: string | null;
        page_count: number | null;
        cover_url: string | null;
    }[]
    | null;
};

type UserBookRow = {
    id: string;
    books: {
        id: string;
        title: string | null;
        book_type: string | null;
        page_count: number | null;
        cover_url: string | null;
    } | null;
};

type BookMetric = {
    userBookId: string;
    title: string;
    bookType: string;
    pagesRead: number;
    fluidPages: number;
    curiosityPages: number;
    timedFluidPages: number;
    timedCuriosityPages: number;
    timedReadingPages: number;
    wordsSaved: number;
    curiosityMinutes: number;
    fluidMinutes: number;
    listeningMinutes: number;
    totalMinutes: number;
    readingMinutes: number;
    averageMinutesPerPage: number | null;
    wordsPerPage: number | null;
    sessions: number;
};

type ReadingAbilityFilter =
    | "all"
    | "image_supported"
    | "bridge_books"
    | "text_dense";

const READING_ABILITY_FILTERS: {
    value: ReadingAbilityFilter;
    title: string;
    description: string;
    activeClass: string;
    inactiveClass: string;
}[] = [
        {
            value: "all",
            title: "All Reading",
            description: "Everything together",
            activeClass: "border-sky-600 bg-sky-600 text-white shadow-md",
            inactiveClass: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
        },
        {
            value: "image_supported",
            title: "Image-Supported",
            description: "Manga, picture books, early readers",
            activeClass: "border-emerald-600 bg-emerald-600 text-white shadow-md",
            inactiveClass:
                "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
        },
        {
            value: "bridge_books",
            title: "Bridge Books",
            description: "Chapter books, middle grade, YA",
            activeClass: "border-violet-600 bg-violet-600 text-white shadow-md",
            inactiveClass:
                "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
        },
        {
            value: "text_dense",
            title: "Text-Dense",
            description: "Novels, essays, nonfiction, textbooks",
            activeClass: "border-amber-600 bg-amber-500 text-white shadow-md",
            inactiveClass:
                "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
        },
    ];

type TypeMetric = {
    bookType: string;
    pagesRead: number;
    timedPages: number;
    wordsSaved: number;
    totalMinutes: number;
    averageMinutesPerPage: number | null;
    wordsPerPage: number | null;
};

function formatDecimal(value: number | null, digits = 1) {
    if (value == null || !Number.isFinite(value)) return "—";
    return value.toFixed(digits);
}

function sessionPages(row: SessionRow) {
    const start = Number(row.start_page);
    const end = Number(row.end_page);

    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
    if (end <= start) return 0;

    return end - start;
}

function wordKey(surface: string | null, meaning: string | null) {
    return `${surface ?? ""}::${meaning ?? ""}`.trim();
}

function bookTypeLabel(value: string | null | undefined) {
    if (!value) return "Other";

    const labels: Record<string, string> = {
        picture_book: "Picture books",
        early_reader: "Early readers",
        chapter_book: "Chapter books",
        middle_grade: "Middle grade",
        young_adult: "Young adult",
        ya: "YA",
        adult: "Adult",
        novel: "Novel",
        manga: "Manga",
        graded_reader: "Graded readers",
        nonfiction: "Nonfiction",
        short_story: "Short story",
        "short story": "Short story",
        textbook: "Textbook",
    };

    return labels[value] ?? value.replaceAll("_", " ");
}

function readingAbilityGroupForBookType(
    bookType: string | null | undefined
): ReadingAbilityFilter {
    if (
        bookType === "manga" ||
        bookType === "picture_book" ||
        bookType === "early_reader"
    ) {
        return "image_supported";
    }

    if (
        bookType === "chapter_book" ||
        bookType === "middle_grade" ||
        bookType === "ya" ||
        bookType === "young_adult"
    ) {
        return "bridge_books";
    }

    if (
        bookType === "novel" ||
        bookType === "short_story" ||
        bookType === "short story" ||
        bookType === "nonfiction" ||
        bookType === "essay" ||
        bookType === "textbook" ||
        bookType === "adult"
    ) {
        return "text_dense";
    }

    return "text_dense";
}

function bookTypeSortIndex(value: string | null | undefined) {
    const order = [
        "picture_book",
        "early_reader",
        "graded_reader",
        "chapter_book",
        "middle_grade",
        "young_adult",
        "adult",
        "manga",
        "nonfiction",
        "textbook",
    ];

    const index = order.indexOf(value ?? "");
    return index === -1 ? 999 : index;
}

function paceLabel(item: BookMetric) {
    if (item.averageMinutesPerPage == null) return null;

    if (item.averageMinutesPerPage <= 2) return "Flowing";
    if (item.averageMinutesPerPage <= 5) return "Steady";
    if (item.averageMinutesPerPage <= 10) return "Support-heavy";
    return "Pushes back";
}

function readingAbilityTheme(value: ReadingAbilityFilter) {
    if (value === "image_supported") {
        return {
            pageHeader: "border-emerald-300 bg-white",
            section: "border-emerald-300 bg-white",
            softSection: "border-emerald-300 bg-white",
            statOne: "border-emerald-300 bg-white",
            statTwo: "border-emerald-300 bg-white",
            statThree: "border-emerald-300 bg-white",
            plainCard: "border-emerald-300 bg-white",
        };
    }

    if (value === "bridge_books") {
        return {
            pageHeader: "border-violet-300 bg-white",
            section: "border-violet-300 bg-white",
            softSection: "border-violet-300 bg-white",
            statOne: "border-violet-300 bg-white",
            statTwo: "border-violet-300 bg-white",
            statThree: "border-violet-300 bg-white",
            plainCard: "border-violet-300 bg-white",
        };
    }

    if (value === "text_dense") {
        return {
            pageHeader: "border-amber-300 bg-white",
            section: "border-amber-300 bg-white",
            softSection: "border-amber-300 bg-white",
            statOne: "border-amber-300 bg-white",
            statTwo: "border-amber-300 bg-white",
            statThree: "border-amber-300 bg-white",
            plainCard: "border-amber-300 bg-white",
        };
    }

    return {
        pageHeader: "border-sky-300 bg-white",
        section: "border-sky-300 bg-white",
        softSection: "border-sky-300 bg-white",
        statOne: "border-sky-300 bg-white",
        statTwo: "border-sky-300 bg-white",
        statThree: "border-sky-300 bg-white",
        plainCard: "border-sky-300 bg-white",
    };
}

export default function ReadingAbilityPage() {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [rows, setRows] = useState<UserBookRow[]>([]);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [words, setWords] = useState<WordRow[]>([]);
    const [bookTypeFilter, setBookTypeFilter] =
        useState<ReadingAbilityFilter>("all");

    useEffect(() => {
        let isMounted = true;

        async function loadReadingAbility() {
            setLoading(true);
            setErrorMsg("");

            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                const user = session?.user;

                if (!user) {
                    if (!isMounted) return;
                    setRows([]);
                    setSessions([]);
                    setWords([]);
                    return;
                }

                const { data: userBooks, error: userBooksError } = await supabase
                    .from("user_books")
                    .select(
                        `
              id,
              books:book_id (
                id,
                title,
                book_type,
                page_count,
                cover_url
              )
            `
                    )
                    .eq("user_id", user.id);

                if (userBooksError) throw userBooksError;

                const loadedRows: UserBookRow[] = ((userBooks ?? []) as RawUserBookRow[]).map(
                    (row) => ({
                        id: row.id,
                        books: Array.isArray(row.books)
                            ? row.books[0] ?? null
                            : row.books ?? null,
                    })
                );

                const userBookIds = loadedRows.map((row) => row.id).filter(Boolean);

                if (userBookIds.length === 0) {
                    if (!isMounted) return;
                    setRows(loadedRows);
                    setSessions([]);
                    setWords([]);
                    return;
                }

                const [
                    { data: sessionData, error: sessionError },
                    { data: wordData, error: wordError },
                ] = await Promise.all([
                    supabase
                        .from("user_book_reading_sessions")
                        .select(
                            "user_book_id, read_on, start_page, end_page, minutes_read, session_mode, is_filler"
                        )
                        .in("user_book_id", userBookIds),
                    supabase
                        .from("user_book_words")
                        .select("id, user_book_id, created_at, surface, meaning")
                        .in("user_book_id", userBookIds),
                ]);

                if (sessionError) throw sessionError;
                if (wordError) throw wordError;

                if (!isMounted) return;

                setRows(loadedRows);
                setSessions(
                    ((sessionData ?? []) as SessionRow[]).filter((row) => !row.is_filler)
                );
                setWords((wordData ?? []) as WordRow[]);
            } catch (error: any) {
                console.error("Error loading reading ability:", error);
                if (!isMounted) return;
                setErrorMsg(error?.message ?? "Could not load reading ability.");
                setRows([]);
                setSessions([]);
                setWords([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadReadingAbility();

        return () => {
            isMounted = false;
        };
    }, []);

    const bookMetrics = useMemo(() => {
        const sessionsByBook = new Map<string, SessionRow[]>();
        const wordsByBook = new Map<string, WordRow[]>();

        for (const row of sessions) {
            const list = sessionsByBook.get(row.user_book_id) ?? [];
            list.push(row);
            sessionsByBook.set(row.user_book_id, list);
        }

        for (const word of words) {
            const list = wordsByBook.get(word.user_book_id) ?? [];
            list.push(word);
            wordsByBook.set(word.user_book_id, list);
        }

        return rows
            .map((row) => {
                const bookSessions = sessionsByBook.get(row.id) ?? [];
                const bookWords = wordsByBook.get(row.id) ?? [];

                const fluidSessions = bookSessions.filter(
                    (session) => session.session_mode === "fluid" || !session.session_mode
                );
                const curiositySessions = bookSessions.filter(
                    (session) => session.session_mode === "curiosity"
                );
                const listeningSessions = bookSessions.filter(
                    (session) => session.session_mode === "listening"
                );

                const fluidPages = fluidSessions.reduce(
                    (sum, session) => sum + sessionPages(session),
                    0
                );
                const curiosityPages = curiositySessions.reduce(
                    (sum, session) => sum + sessionPages(session),
                    0
                );

                const timedFluidPages = fluidSessions.reduce((sum, session) => {
                    const minutes = Number(session.minutes_read) || 0;
                    return minutes > 0 ? sum + sessionPages(session) : sum;
                }, 0);

                const timedCuriosityPages = curiositySessions.reduce((sum, session) => {
                    const minutes = Number(session.minutes_read) || 0;
                    return minutes > 0 ? sum + sessionPages(session) : sum;
                }, 0);

                const curiosityMinutes = curiositySessions.reduce(
                    (sum, session) => sum + (Number(session.minutes_read) || 0),
                    0
                );
                const fluidMinutes = fluidSessions.reduce(
                    (sum, session) => sum + (Number(session.minutes_read) || 0),
                    0
                );
                const listeningMinutes = listeningSessions.reduce(
                    (sum, session) => sum + (Number(session.minutes_read) || 0),
                    0
                );

                const pagesRead = fluidPages + curiosityPages;
                const timedReadingPages = timedFluidPages + timedCuriosityPages;
                const readingMinutes = fluidMinutes + curiosityMinutes;
                const totalMinutes = readingMinutes + listeningMinutes;
                const uniqueWords = new Set(
                    bookWords.map((word) => wordKey(word.surface, word.meaning))
                ).size;

                return {
                    userBookId: row.id,
                    title: row.books?.title ?? "Untitled book",
                    bookType: row.books?.book_type ?? "other",
                    pagesRead,
                    fluidPages,
                    curiosityPages,
                    timedFluidPages,
                    timedCuriosityPages,
                    timedReadingPages,
                    wordsSaved: bookWords.length,
                    curiosityMinutes,
                    fluidMinutes,
                    listeningMinutes,
                    totalMinutes,
                    readingMinutes,
                    averageMinutesPerPage:
                        timedReadingPages > 0 ? readingMinutes / timedReadingPages : null,
                    wordsPerPage: pagesRead > 0 ? uniqueWords / pagesRead : null,
                    sessions: bookSessions.length,
                } satisfies BookMetric;
            })
            .filter(
                (item) =>
                    item.pagesRead > 0 || item.wordsSaved > 0 || item.totalMinutes > 0
            );
    }, [rows, sessions, words]);

    const filteredBookMetrics = useMemo(() => {
        if (bookTypeFilter === "all") return bookMetrics;

        return bookMetrics.filter(
            (item) => readingAbilityGroupForBookType(item.bookType) === bookTypeFilter
        );
    }, [bookMetrics, bookTypeFilter]);

    const selectedFilter = READING_ABILITY_FILTERS.find(
        (option) => option.value === bookTypeFilter
    );

    const selectedFilterLabel = selectedFilter?.title ?? "All Reading";

    const selectedTheme = readingAbilityTheme(bookTypeFilter);

    const abilityTotals = useMemo(() => {
        const pagesRead = filteredBookMetrics.reduce(
            (sum, item) => sum + item.pagesRead,
            0
        );

        const fluidPages = filteredBookMetrics.reduce(
            (sum, item) => sum + item.fluidPages,
            0
        );

        const curiosityPages = filteredBookMetrics.reduce(
            (sum, item) => sum + item.curiosityPages,
            0
        );

        const wordsSaved = filteredBookMetrics.reduce(
            (sum, item) => sum + item.wordsSaved,
            0
        );

        const fluidMinutes = filteredBookMetrics.reduce(
            (sum, item) => sum + item.fluidMinutes,
            0
        );

        const curiosityMinutes = filteredBookMetrics.reduce(
            (sum, item) => sum + item.curiosityMinutes,
            0
        );

        const timedFluidPages = filteredBookMetrics.reduce(
            (sum, item) => sum + item.timedFluidPages,
            0
        );

        const timedCuriosityPages = filteredBookMetrics.reduce(
            (sum, item) => sum + item.timedCuriosityPages,
            0
        );

        const sessions = filteredBookMetrics.reduce(
            (sum, item) => sum + item.sessions,
            0
        );

        const timedPages = timedFluidPages + timedCuriosityPages;
        const untimedPages = Math.max(0, pagesRead - timedPages);
        const readingMinutes = fluidMinutes + curiosityMinutes;

        const booksTouched = filteredBookMetrics.filter(
            (item) =>
                item.pagesRead > 0 || item.wordsSaved > 0 || item.totalMinutes > 0
        ).length;

        return {
            pagesRead,
            fluidPages,
            curiosityPages,
            timedPages,
            untimedPages,
            wordsSaved,
            readingMinutes,
            booksTouched,
            sessions,
            timedCoveragePercent: pagesRead > 0 ? (timedPages / pagesRead) * 100 : null,
            averageWordsPerPage: pagesRead > 0 ? wordsSaved / pagesRead : null,
            fluidMinutesPerPage:
                timedFluidPages > 0 ? fluidMinutes / timedFluidPages : null,
            curiosityMinutesPerPage:
                timedCuriosityPages > 0 ? curiosityMinutes / timedCuriosityPages : null,
        };
    }, [filteredBookMetrics]);

    const abilityStandouts = useMemo(() => {
        const mostWordsPerPage =
            [...filteredBookMetrics]
                .filter((item) => item.wordsPerPage != null && item.pagesRead > 0)
                .sort((a, b) => (b.wordsPerPage ?? 0) - (a.wordsPerPage ?? 0))[0] ??
            null;

        const leastWordsPerPage =
            [...filteredBookMetrics]
                .filter((item) => item.wordsPerPage != null && item.pagesRead > 0)
                .sort((a, b) => (a.wordsPerPage ?? 999) - (b.wordsPerPage ?? 999))[0] ??
            null;

        const fluidPaceBooks = filteredBookMetrics
            .map((item) => ({
                ...item,
                fluidMinPerPage:
                    item.timedFluidPages > 0 ? item.fluidMinutes / item.timedFluidPages : null,
            }))
            .filter((item) => item.fluidMinPerPage != null);

        const curiosityPaceBooks = filteredBookMetrics
            .map((item) => ({
                ...item,
                curiosityMinPerPage:
                    item.timedCuriosityPages > 0
                        ? item.curiosityMinutes / item.timedCuriosityPages
                        : null,
            }))
            .filter((item) => item.curiosityMinPerPage != null);

        const fastestFluid =
            [...fluidPaceBooks].sort(
                (a, b) => (a.fluidMinPerPage ?? 999) - (b.fluidMinPerPage ?? 999)
            )[0] ?? null;

        const slowestFluid =
            [...fluidPaceBooks].sort(
                (a, b) => (b.fluidMinPerPage ?? 0) - (a.fluidMinPerPage ?? 0)
            )[0] ?? null;

        const fastestCuriosity =
            [...curiosityPaceBooks].sort(
                (a, b) =>
                    (a.curiosityMinPerPage ?? 999) - (b.curiosityMinPerPage ?? 999)
            )[0] ?? null;

        const slowestCuriosity =
            [...curiosityPaceBooks].sort(
                (a, b) =>
                    (b.curiosityMinPerPage ?? 0) - (a.curiosityMinPerPage ?? 0)
            )[0] ?? null;

        return {
            mostWordsPerPage,
            leastWordsPerPage,
            fastestFluid,
            slowestFluid,
            fastestCuriosity,
            slowestCuriosity,
        };
    }, [filteredBookMetrics]);

    const abilityTypeMetrics = useMemo(() => {
        const grouped = new Map<string, TypeMetric>();

        for (const item of filteredBookMetrics) {
            const key = bookTypeLabel(item.bookType);
            const existing =
                grouped.get(key) ??
                {
                    bookType: key,
                    pagesRead: 0,
                    timedPages: 0,
                    wordsSaved: 0,
                    totalMinutes: 0,
                    averageMinutesPerPage: null,
                    wordsPerPage: null,
                };

            existing.pagesRead += item.pagesRead;
            existing.timedPages += item.timedReadingPages;
            existing.wordsSaved += item.wordsSaved;
            existing.totalMinutes += item.fluidMinutes + item.curiosityMinutes;
            grouped.set(key, existing);
        }

        return Array.from(grouped.values())
            .map((item) => ({
                ...item,
                averageMinutesPerPage:
                    item.timedPages > 0 ? item.totalMinutes / item.timedPages : null,
                wordsPerPage: item.pagesRead > 0 ? item.wordsSaved / item.pagesRead : null,
            }))
            .sort((a, b) => b.pagesRead - a.pagesRead)
            .slice(0, 6);
    }, [filteredBookMetrics]);

    const pacePie = useMemo(() => {
        const grouped = new Map<string, number>();

        for (const item of filteredBookMetrics) {
            if (item.pagesRead <= 0 || item.averageMinutesPerPage == null) continue;

            const label = paceLabel(item);
            if (!label) continue;

            grouped.set(label, (grouped.get(label) ?? 0) + 1);
        }

        const palette: Record<string, string> = {
            Flowing: "#34d399",
            Steady: "#60a5fa",
            "Support-heavy": "#fbbf24",
            "Pushes back": "#f87171",
        };

        return ["Flowing", "Steady", "Support-heavy", "Pushes back"]
            .map((label) => ({
                label,
                value: grouped.get(label) ?? 0,
                color: palette[label],
            }))
            .filter((item) => item.value > 0);
    }, [filteredBookMetrics]);

    const abilityComparisonRows = useMemo(() => {
        const grouped = new Map<string, BookMetric[]>();

        for (const item of filteredBookMetrics) {
            if (item.pagesRead <= 0 || item.averageMinutesPerPage == null) continue;

            const key = item.bookType ?? "other";
            const list = grouped.get(key) ?? [];
            list.push(item);
            grouped.set(key, list);
        }

        return Array.from(grouped.entries())
            .map(([key, items]) => {
                const sortedSlowestFirst = [...items].sort(
                    (a, b) =>
                        (b.averageMinutesPerPage ?? -1) - (a.averageMinutesPerPage ?? -1)
                );

                const sortedFastestFirst = [...items].sort(
                    (a, b) =>
                        (a.averageMinutesPerPage ?? 999) - (b.averageMinutesPerPage ?? 999)
                );

                let pushed: BookMetric | null = null;
                let flowed: BookMetric | null = null;

                if (items.length === 1) {
                    const onlyBook = items[0];
                    const label = paceLabel(onlyBook);

                    if (label === "Flowing" || label === "Steady") {
                        flowed = onlyBook;
                    } else if (label === "Support-heavy" || label === "Pushes back") {
                        pushed = onlyBook;
                    }
                } else {
                    pushed = sortedSlowestFirst[0] ?? null;
                    flowed =
                        sortedFastestFirst.find(
                            (item) => item.userBookId !== pushed?.userBookId
                        ) ?? null;
                }

                return {
                    bookType: key,
                    pushed,
                    flowed,
                };
            })
            .sort((a, b) => bookTypeSortIndex(a.bookType) - bookTypeSortIndex(b.bookType));
    }, [filteredBookMetrics]);

    if (loading) {
        return <ReadingAbilityLoadingPanel />;
     }

    return (
        <main className="min-h-screen bg-slate-100 px-6 py-8">
            <div className="mx-auto max-w-7xl space-y-5">
                <ReadingAbilityHeader pageHeaderTone={selectedTheme.pageHeader} />

                <ReadingAbilityErrorBanner message={errorMsg} />

                <SectionBand
                    eyebrow={`Book category — ${selectedFilterLabel}`}
                    title={selectedFilter?.title ?? "All Reading"}
                    description="Choose a broad kind of reading material. This changes the stats and book examples below."
                    tone={selectedTheme.section}
                >
                    <ReadingAbilityFilterSelector
                        filters={READING_ABILITY_FILTERS}
                        value={bookTypeFilter}
                        onChange={(value) => setBookTypeFilter(value as ReadingAbilityFilter)}
                        bookCount={filteredBookMetrics.length}
                    />
                </SectionBand>

                <ReadingAbilityMetricGrid
                    timedCoveragePercent={abilityTotals.timedCoveragePercent}
                    timedPages={abilityTotals.timedPages}
                    untimedPages={abilityTotals.untimedPages}
                    fluidMinutesPerPage={abilityTotals.fluidMinutesPerPage}
                    curiosityMinutesPerPage={abilityTotals.curiosityMinutesPerPage}
                    formatDecimal={formatDecimal}
                    tone={selectedTheme}
                />

                <div className="grid gap-4 md:grid-cols-2">
                    <ReadingRangeCard
                        title={`Fluid Reading Range — ${selectedFilterLabel}`}
                        fastest={
                            abilityStandouts.fastestFluid?.fluidMinPerPage != null
                                ? {
                                    value: `${formatDecimal(
                                        abilityStandouts.fastestFluid.fluidMinPerPage
                                    )} min/page`,
                                    title: abilityStandouts.fastestFluid.title,
                                }
                                : null
                        }
                        slowest={
                            abilityStandouts.slowestFluid?.fluidMinPerPage != null
                                ? {
                                    value: `${formatDecimal(
                                        abilityStandouts.slowestFluid.fluidMinPerPage
                                    )} min/page`,
                                    title: abilityStandouts.slowestFluid.title,
                                }
                                : null
                        }
                        emptyText="No timed fluid reading yet"
                        tone={selectedTheme.plainCard}
                    />

                    <ReadingRangeCard
                        title={`Curiosity Reading Range — ${selectedFilterLabel}`}
                        fastest={
                            abilityStandouts.fastestCuriosity?.curiosityMinPerPage != null
                                ? {
                                    value: `${formatDecimal(
                                        abilityStandouts.fastestCuriosity.curiosityMinPerPage
                                    )} min/page`,
                                    title: abilityStandouts.fastestCuriosity.title,
                                }
                                : null
                        }
                        slowest={
                            abilityStandouts.slowestCuriosity?.curiosityMinPerPage != null
                                ? {
                                    value: `${formatDecimal(
                                        abilityStandouts.slowestCuriosity.curiosityMinPerPage
                                    )} min/page`,
                                    title: abilityStandouts.slowestCuriosity.title,
                                }
                                : null
                        }
                        emptyText="No timed curiosity reading yet"
                        tone={selectedTheme.plainCard}
                    />
                </div>

                <SectionBand
                    eyebrow={`Pace — ${selectedFilterLabel}`}
                    title="How your books felt to read"
                    description="Books are grouped by minutes per page only."
                    tone={selectedTheme.softSection}
                >
                    <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr] xl:items-start">
                        <PieChart
                            items={pacePie}
                            size={190}
                            formatPercent={formatDecimal}
                        />

                        <PaceLegendCards />
                    </div>
                </SectionBand>

                <ReadingAbilityTypePanel
                    selectedFilterLabel={selectedFilterLabel}
                    tone={selectedTheme.section}
                    rows={abilityTypeMetrics}
                    formatDecimal={formatDecimal}
                />

                <ReadingAbilityComparisonPanel
                    selectedFilterLabel={selectedFilterLabel}
                    tone={selectedTheme.section}
                    rows={abilityComparisonRows}
                    bookTypeLabel={bookTypeLabel}
                    formatDecimal={formatDecimal}
                />
            </div>
        </main>
    );
}
