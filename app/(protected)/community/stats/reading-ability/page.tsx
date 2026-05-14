// Reading Ability

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
            softSection: "border-emerald-300 bg-emerald-50/25",
            statOne: "border-emerald-300 bg-emerald-50/35",
            statTwo: "border-emerald-300 bg-white",
            statThree: "border-emerald-300 bg-emerald-50/25",
            plainCard: "border-emerald-300 bg-white",
        };
    }

    if (value === "bridge_books") {
        return {
            pageHeader: "border-violet-300 bg-white",
            section: "border-violet-300 bg-white",
            softSection: "border-violet-300 bg-violet-50/25",
            statOne: "border-violet-300 bg-violet-50/35",
            statTwo: "border-violet-300 bg-white",
            statThree: "border-violet-300 bg-violet-50/25",
            plainCard: "border-violet-300 bg-white",
        };
    }

    if (value === "text_dense") {
        return {
            pageHeader: "border-amber-300 bg-white",
            section: "border-amber-300 bg-white",
            softSection: "border-amber-300 bg-amber-50/25",
            statOne: "border-amber-300 bg-amber-50/35",
            statTwo: "border-amber-300 bg-white",
            statThree: "border-amber-300 bg-amber-50/25",
            plainCard: "border-amber-300 bg-white",
        };
    }

    return {
        pageHeader: "border-sky-300 bg-white",
        section: "border-sky-300 bg-white",
        softSection: "border-sky-300 bg-sky-50/25",
        statOne: "border-sky-300 bg-sky-50/35",
        statTwo: "border-sky-300 bg-white",
        statThree: "border-sky-300 bg-sky-50/25",
        plainCard: "border-sky-300 bg-white",
    };
}

function StatCard({
    label,
    value,
    hint,
    tone = "border-slate-200 bg-white",
}: {
    label: string;
    value: string | number;
    hint?: string;
    tone?: string;
}) {
    return (
        <div className={`rounded-2xl border-2 p-4 shadow-sm ${tone}`}>
            <div className="text-xs font-medium uppercase text-slate-600">
                {label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">
                {value}
            </div>
            {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
        </div>
    );
}

function SectionBand({
    eyebrow,
    title,
    description,
    children,
    tone = "border-slate-200 bg-white",
}: {
    eyebrow: string;
    title: string;
    description?: string;
    children: React.ReactNode;
    tone?: string;
}) {
    return (
        <section className={`rounded-2xl border-2 p-4 shadow-sm ${tone}`}>
            <div className="mb-4">
                <div className="text-xs font-medium uppercase text-slate-600">
                    {eyebrow}
                </div>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
                {description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        {description}
                    </p>
                ) : null}
            </div>

            {children}
        </section>
    );
}

function BarStrip({
    items,
    colorClass,
    valueSuffix = "",
}: {
    items: { label: string; value: number }[];
    colorClass: string;
    valueSuffix?: string;
}) {
    const max = Math.max(1, ...items.map((item) => item.value));

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-slate-700">{item.label}</span>
                        <span className="shrink-0 font-medium text-slate-900">
                            {item.value}
                            {valueSuffix}
                        </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full rounded-full ${colorClass}`}
                            style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function PieChart({
    items,
    size = 220,
}: {
    items: { label: string; value: number; color: string }[];
    size?: number;
}) {
    const filtered = items.filter((item) => item.value > 0);
    const total = filtered.reduce((sum, item) => sum + item.value, 0);
    const radius = size / 2 - 12;
    const cx = size / 2;
    const cy = size / 2;

    if (total <= 0) {
        return (
            <div className="flex h-[220px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
                No data yet
            </div>
        );
    }

    let running = -Math.PI / 2;

    const paths = filtered.map((item) => {
        const angle = (item.value / total) * Math.PI * 2;
        const startAngle = running;
        const endAngle = running + angle;
        running = endAngle;

        const x1 = cx + radius * Math.cos(startAngle);
        const y1 = cy + radius * Math.sin(startAngle);
        const x2 = cx + radius * Math.cos(endAngle);
        const y2 = cy + radius * Math.sin(endAngle);
        const largeArc = angle > Math.PI ? 1 : 0;

        const d = [
            `M ${cx} ${cy}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            "Z",
        ].join(" ");

        return { ...item, d, percent: (item.value / total) * 100 };
    });

    const compact = size <= 180;

    return (
        <div
            className={
                compact
                    ? "space-y-4"
                    : "grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center"
            }
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="mx-auto"
            >
                {paths.length === 1 ? (
                    <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={paths[0].color}
                        stroke="white"
                        strokeWidth="3"
                    />
                ) : (
                    paths.map((item) => (
                        <path
                            key={item.label}
                            d={item.d}
                            fill={item.color}
                            stroke="white"
                            strokeWidth="3"
                        />
                    ))
                )}
                <circle cx={cx} cy={cy} r={radius * 0.48} fill="white" />
                <text
                    x={cx}
                    y={cy - 6}
                    textAnchor="middle"
                    className="fill-slate-500 text-[11px] font-medium uppercase"
                >
                    Total
                </text>
                <text
                    x={cx}
                    y={cy + 18}
                    textAnchor="middle"
                    className="fill-slate-900 text-[18px] font-semibold"
                >
                    {total}
                </text>
            </svg>

            <div className={compact ? "space-y-2" : "space-y-3"}>
                {paths.map((item) => (
                    <div
                        key={item.label}
                        className={`flex items-center justify-between gap-2 rounded-xl bg-slate-50 ${compact ? "px-2.5 py-2" : "px-3 py-2"
                            }`}
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <span
                                className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"
                                    } shrink-0 rounded-full`}
                                style={{ backgroundColor: item.color }}
                            />
                            <span
                                className={`min-w-0 truncate text-slate-700 ${compact ? "text-xs" : "text-sm"
                                    }`}
                                title={item.label}
                            >
                                {item.label}
                            </span>
                        </div>
                        <div
                            className={`shrink-0 font-medium text-slate-900 ${compact ? "text-xs" : "text-sm"
                                }`}
                        >
                            {item.value}{" "}
                            <span className="text-slate-500">
                                ({formatDecimal(item.percent)}%)
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
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
        return (
            <main className="min-h-screen bg-slate-100 px-6 py-8">
                <div className="mx-auto max-w-7xl">
                    <div className="text-sm text-slate-600">Loading reading ability…</div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-100 px-6 py-8">
            <div className="mx-auto max-w-7xl space-y-5">
                <div>
                    <Link
                        href="/community/stats"
                        className="text-sm font-semibold text-slate-500 hover:text-slate-900"
                    >
                        ← Back to Stats Home
                    </Link>

                    <div className={`mt-5 rounded-3xl border-2 p-5 shadow-sm ${selectedTheme.pageHeader}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                            Reading Ability
                        </p>
                        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                            Reading Ability
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                            Pace, support, difficulty, and reader-fit patterns from your
                            reading life.
                        </p>
                    </div>
                </div>

                {errorMsg ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {errorMsg}
                    </div>
                ) : null}

                <SectionBand
                    eyebrow={`Book category — ${selectedFilterLabel}`}
                    title={selectedFilter?.title ?? "All Reading"}
                    description="Choose a broad kind of reading material. This changes the stats and book examples below."
                    tone={selectedTheme.section}
                >
                    <div className="grid gap-3 md:grid-cols-4">
                        {READING_ABILITY_FILTERS.map((option) => {
                            const selected = bookTypeFilter === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setBookTypeFilter(option.value)}
                                    className={`rounded-2xl border-2 px-4 py-3 text-left transition ${selected ? option.activeClass : option.inactiveClass
                                        }`}
                                >
                                    <div className="text-base font-black">{option.title}</div>
                                    <div
                                        className={`mt-1 text-sm leading-5 ${selected ? "text-white/85" : ""
                                            }`}
                                    >
                                        {option.description}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                            {filteredBookMetrics.length}
                        </span>{" "}
                        book{filteredBookMetrics.length === 1 ? "" : "s"} with reading data included
                        in this category.
                    </p>
                </SectionBand>

                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        label="Timed Page Coverage"
                        value={
                            abilityTotals.timedCoveragePercent == null
                                ? "—"
                                : `${Math.round(abilityTotals.timedCoveragePercent)}%`
                        }
                        hint={`${abilityTotals.timedPages} timed pages · ${abilityTotals.untimedPages} untimed pages`}
                        tone={selectedTheme.statOne}
                    />

                    <StatCard
                        label="Fluid Pace Per Page"
                        value={
                            abilityTotals.fluidMinutesPerPage == null
                                ? "—"
                                : `${formatDecimal(abilityTotals.fluidMinutesPerPage)} min/page`
                        }
                        hint="Time per page during fluid reading"
                        tone={selectedTheme.statTwo}
                    />

                    <StatCard
                        label="Curiosity Pace Per Page"
                        value={
                            abilityTotals.curiosityMinutesPerPage == null
                                ? "—"
                                : `${formatDecimal(
                                    abilityTotals.curiosityMinutesPerPage
                                )} min/page`
                        }
                        hint="Time per page during curiosity reading"
                        tone={selectedTheme.statThree}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className={`rounded-2xl border-2 p-4 shadow-sm ${selectedTheme.plainCard}`}>
                        <div className="text-xs font-medium uppercase text-slate-600">
                            Fluid Reading Range — {selectedFilterLabel}
                        </div>

                        <div className="mt-3 space-y-3">
                            <div>
                                <div className="text-xs text-slate-500">Fastest</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {abilityStandouts.fastestFluid?.fluidMinPerPage != null
                                        ? `${formatDecimal(
                                            abilityStandouts.fastestFluid.fluidMinPerPage
                                        )} min/page`
                                        : "—"}
                                </div>
                                <div className="truncate text-sm text-slate-700">
                                    {abilityStandouts.fastestFluid?.title ??
                                        "No timed fluid reading yet"}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                                <div className="text-xs text-slate-500">Slowest</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {abilityStandouts.slowestFluid?.fluidMinPerPage != null
                                        ? `${formatDecimal(
                                            abilityStandouts.slowestFluid.fluidMinPerPage
                                        )} min/page`
                                        : "—"}
                                </div>
                                <div className="truncate text-sm text-slate-700">
                                    {abilityStandouts.slowestFluid?.title ??
                                        "No timed fluid reading yet"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`rounded-2xl border-2 p-4 shadow-sm ${selectedTheme.plainCard}`}>
                        <div className="text-xs font-medium uppercase text-slate-600">
                            Curiosity Reading Range — {selectedFilterLabel}
                        </div>

                        <div className="mt-3 space-y-3">
                            <div>
                                <div className="text-xs text-slate-500">Fastest</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {abilityStandouts.fastestCuriosity?.curiosityMinPerPage != null
                                        ? `${formatDecimal(
                                            abilityStandouts.fastestCuriosity.curiosityMinPerPage
                                        )} min/page`
                                        : "—"}
                                </div>
                                <div className="truncate text-sm text-slate-700">
                                    {abilityStandouts.fastestCuriosity?.title ??
                                        "No timed curiosity reading yet"}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                                <div className="text-xs text-slate-500">Slowest</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {abilityStandouts.slowestCuriosity?.curiosityMinPerPage != null
                                        ? `${formatDecimal(
                                            abilityStandouts.slowestCuriosity.curiosityMinPerPage
                                        )} min/page`
                                        : "—"}
                                </div>
                                <div className="truncate text-sm text-slate-700">
                                    {abilityStandouts.slowestCuriosity?.title ??
                                        "No timed curiosity reading yet"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <SectionBand
                    eyebrow={`Pace — ${selectedFilterLabel}`}
                    title="How your books felt to read"
                    description="Books are grouped by minutes per page only."
                    tone={selectedTheme.softSection}
                    >
                    <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr] xl:items-start">
                        <PieChart items={pacePie} />

                        <div className="grid gap-3 sm:grid-cols-2">
                            {[
                                {
                                    label: "Flowing",
                                    color: "bg-emerald-400",
                                    text: "These books moved quickly page by page.",
                                },
                                {
                                    label: "Steady",
                                    color: "bg-sky-400",
                                    text: "Comfortably readable, but still asking for attention.",
                                },
                                {
                                    label: "Support-heavy",
                                    color: "bg-amber-400",
                                    text: "These books took noticeably more time per page.",
                                },
                                {
                                    label: "Pushes back",
                                    color: "bg-red-400",
                                    text: "These books asked for a lot of support.",
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`h-3 w-3 rounded-full ${item.color}`} />
                                        <div className="font-semibold text-slate-900">
                                            {item.label}
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm leading-5 text-slate-600">
                                        {item.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </SectionBand>

                <div className="grid gap-4">
                    <SectionBand
                        eyebrow={`Book type — ${selectedFilterLabel}`}
                        title="Ability by book type"
                        description="This groups your reading by book category and compares page movement and timed reading pace."
                        tone={selectedTheme.section}
                        >
                        <div className="space-y-5">
                            <BarStrip
                                items={abilityTypeMetrics.map((item) => ({
                                    label: item.bookType,
                                    value: item.pagesRead,
                                }))}
                                colorClass="bg-indigo-500"
                                valueSuffix=" pages"
                            />

                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">Type</th>
                                            <th className="px-3 py-2">Pages</th>
                                            <th className="px-3 py-2">Min/page</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {abilityTypeMetrics.map((item) => (
                                            <tr key={item.bookType}>
                                                <td className="px-3 py-2 font-medium text-slate-900">
                                                    {item.bookType}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">
                                                    {item.pagesRead}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">
                                                    {formatDecimal(item.averageMinutesPerPage)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </SectionBand>

                </div>

                <SectionBand
                    eyebrow={`Comparison — ${selectedFilterLabel}`}
                    title="Books that pushed back / books that flowed"
                    description="Within each book type, this compares the slowest and fastest timed reading experiences."
                    tone={selectedTheme.section}
                    >
                    {abilityComparisonRows.length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                            No timed reading comparison yet. Add minutes to reading sessions to
                            see pace.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2">Book type</th>
                                        <th className="px-3 py-2">Pushed back</th>
                                        <th className="px-3 py-2">Flowed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {abilityComparisonRows.map((row) => (
                                        <tr key={row.bookType}>
                                            <td className="px-3 py-2 font-medium text-slate-900">
                                                {bookTypeLabel(row.bookType)}
                                            </td>

                                            <td className="px-3 py-2 text-slate-700">
                                                {row.pushed ? (
                                                    <div>
                                                        <div className="font-medium text-slate-900">
                                                            {row.pushed.title}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {formatDecimal(row.pushed.averageMinutesPerPage)}{" "}
                                                            min/page · {row.pushed.pagesRead} pages
                                                        </div>
                                                    </div>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>

                                            <td className="px-3 py-2 text-slate-700">
                                                {row.flowed ? (
                                                    <div>
                                                        <div className="font-medium text-slate-900">
                                                            {row.flowed.title}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {formatDecimal(row.flowed.averageMinutesPerPage)}{" "}
                                                            min/page · {row.flowed.pagesRead} pages
                                                        </div>
                                                    </div>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionBand>
            </div>
        </main>
    );
}