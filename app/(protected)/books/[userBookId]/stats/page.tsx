// Book Stats Page
//

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import BookStatsLoadingState from "./components/BookStatsLoadingState";
import BookStatsErrorState from "./components/BookStatsErrorState";
import StatCard from "./components/StatCard";
import StatsSection from "./components/StatsSection";
import BookStatsHeader from "./components/BookStatsHeader";

type Book = {
    id: string;
    title: string | null;
    title_reading: string | null;
    cover_url: string | null;
    book_type: string | null;
    page_count: number | null;
};

type UserBook = {
    id: string;
    user_id: string;
    started_at: string | null;
    finished_at: string | null;
    dnf_at: string | null;
    rating_difficulty: number | null;
    books: Book | null;
};

type ReadingSession = {
    id: string;
    user_book_id: string;
    read_on: string;
    start_page: number | null;
    end_page: number | null;
    minutes_read: number | null;
    is_filler: boolean | null;
    created_at: string;
    session_mode: string | null;
};

type ComparisonBook = {
    id: string;
    rating_difficulty: number | null;
    books: {
        book_type: string | null;
    } | null;
};

function formatMinutes(total: number | null) {
    if (!total || total <= 0) return "—";

    const hours = Math.floor(total / 60);
    const minutes = total % 60;

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

function bookTypeLabel(value: string | null | undefined) {
    switch (value) {
        case "picture_book":
            return "picture books";
        case "early_reader":
            return "early readers";
        case "chapter_book":
            return "chapter books";
        case "middle_grade":
            return "middle grade books";
        case "ya":
            return "YA books";
        case "novel":
            return "novels";
        case "short_story":
            return "short stories";
        case "manga":
            return "manga";
        case "nonfiction":
            return "nonfiction books";
        case "essay":
            return "essays";
        case "memoir":
            return "memoirs";
        case "textbook":
            return "textbooks";
        case "other":
            return "books of this type";
        default:
            return "books of this type";
    }
}

function statusLabel(row: UserBook | null) {
    if (!row) return "—";
    if (row.dnf_at) return "DNF";
    if (row.finished_at) return "Finished";
    if (row.started_at) return "Reading";
    return "Not started";
}

function difficultyText(value: number | null) {
    switch (value) {
        case 1:
            return "Very easy";
        case 2:
            return "Pretty comfortable";
        case 3:
            return "Challenging but manageable";
        case 4:
            return "Hard, but doable";
        case 5:
            return "Extremely difficult";
        default:
            return "Not rated yet";
    }
}

function difficultyNeighborhood(percentHarderThan: number | null) {
    if (percentHarderThan == null) {
        return {
            label: "Not enough data yet",
            colorClass: "border-stone-200 bg-stone-50 text-stone-800",
            note: "Rate more books of this type to see where this one sits.",
        };
    }

    if (percentHarderThan >= 80) {
        return {
            label: "Mountain Book",
            colorClass: "border-rose-200 bg-rose-50 text-rose-900",
            note: "This one sits near the harder end of your shelf.",
        };
    }

    if (percentHarderThan >= 60) {
        return {
            label: "Tough Climb",
            colorClass: "border-orange-200 bg-orange-50 text-orange-900",
            note: "This book felt harder than most of your books of this type.",
        };
    }

    if (percentHarderThan >= 40) {
        return {
            label: "In the Neighborhood",
            colorClass: "border-yellow-200 bg-yellow-50 text-yellow-900",
            note: "This book sits around the middle of your books of this type.",
        };
    }

    if (percentHarderThan >= 20) {
        return {
            label: "Comfortable Read",
            colorClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
            note: "This book felt easier than many of your books of this type.",
        };
    }

    return {
        label: "Gentle Read",
        colorClass: "border-sky-200 bg-sky-50 text-sky-900",
        note: "This one sits near the gentler end of your shelf.",
    };
}

export default function BookStatsPage() {
    const router = useRouter();
    const params = useParams<{ userBookId: string }>();
    const userBookId = params.userBookId;

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [row, setRow] = useState<UserBook | null>(null);
    const [sessions, setSessions] = useState<ReadingSession[]>([]);
    const [wordCount, setWordCount] = useState<number | null>(null);
    const [comparisonBooks, setComparisonBooks] = useState<ComparisonBook[]>([]);
    const [accessChecked, setAccessChecked] = useState(false);
    const [canAccessBook, setCanAccessBook] = useState(false);
    const [accessMessage, setAccessMessage] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadStats() {
            if (!userBookId) return;

            setLoading(true);
            setErrorMessage("");
            setAccessChecked(false);
            setCanAccessBook(false);
            setAccessMessage("");

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (cancelled) return;

            if (userError || !user) {
                setErrorMessage("Please sign in.");
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

            if (cancelled) return;

            const { data: userBookData, error: userBookError } = await supabase
                .from("user_books")
                .select(`
          id,
          user_id,
          started_at,
          finished_at,
          dnf_at,
          rating_difficulty,
          books (
            id,
            title,
            title_reading,
            cover_url,
            book_type,
            page_count
          )
        `)
                .eq("id", userBookId)
                .maybeSingle();

            if (cancelled) return;

            if (userBookError || !userBookData) {
                if (userBookError) console.error("Error loading book stats:", userBookError);
                setAccessMessage("You do not have access to these book stats.");
                setAccessChecked(true);
                setCanAccessBook(false);
                setLoading(false);
                return;
            }

            const loadedRow = userBookData as unknown as UserBook;
            const ownerUserId = loadedRow.user_id;
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

                if (cancelled) return;

                if (!teacherStudentError && teacherStudent) {
                    canAccess = true;
                }
            }

            if (!canAccess) {
                setAccessMessage("You do not have access to these book stats.");
                setAccessChecked(true);
                setCanAccessBook(false);
                setLoading(false);
                return;
            }

            setCanAccessBook(true);
            setAccessChecked(true);
            setRow(loadedRow);

            const [{ data: sessionData, error: sessionError }, wordCountResult] =
                await Promise.all([
                    supabase
                        .from("user_book_reading_sessions")
                        .select(
                            "id, user_book_id, read_on, start_page, end_page, minutes_read, is_filler, created_at, session_mode"
                        )
                        .eq("user_book_id", userBookId)
                        .order("read_on", { ascending: false })
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("user_book_words")
                        .select("id", { count: "exact", head: true })
                        .eq("user_book_id", userBookId),
                ]);

            if (cancelled) return;

            if (sessionError) {
                console.error("Error loading book sessions:", sessionError);
                setSessions([]);
            } else {
                setSessions((sessionData as ReadingSession[]) ?? []);
            }

            if (wordCountResult.error) {
                console.error("Error loading word count:", wordCountResult.error);
                setWordCount(null);
            } else {
                setWordCount(wordCountResult.count ?? 0);
            }

            const { data: comparisonData, error: comparisonError } = await supabase
                .from("user_books")
                .select(`
          id,
          rating_difficulty,
          books (
            book_type
          )
        `)
                .eq("user_id", loadedRow.user_id)
                .not("rating_difficulty", "is", null);

            if (cancelled) return;

            if (comparisonError) {
                console.error("Error loading difficulty comparison:", comparisonError);
                setComparisonBooks([]);
            } else {
                setComparisonBooks((comparisonData as unknown as ComparisonBook[]) ?? []);
            }

            setLoading(false);
        }

        loadStats();

        return () => {
            cancelled = true;
        };
    }, [userBookId]);

    const book = row?.books ?? null;
    const realSessions = useMemo(() => sessions.filter((s) => !s.is_filler), [sessions]);

    const visualReadingSessions = useMemo(() => {
        return realSessions.filter((s) => s.session_mode === "curiosity" || s.session_mode === "fluid");
    }, [realSessions]);

    const pageTrackedSessions = useMemo(() => {
        return visualReadingSessions.filter((s) => s.start_page != null && s.end_page != null);
    }, [visualReadingSessions]);

    const timedSessions = useMemo(() => {
        return visualReadingSessions.filter((s) => s.minutes_read != null && s.minutes_read > 0);
    }, [visualReadingSessions]);

    const timedPageTrackedSessions = useMemo(() => {
        return timedSessions.filter((s) => s.start_page != null && s.end_page != null);
    }, [timedSessions]);

    const curiositySessions = useMemo(() => {
        return realSessions.filter((s) => s.session_mode === "curiosity");
    }, [realSessions]);

    const fluidSessions = useMemo(() => {
        return realSessions.filter((s) => s.session_mode === "fluid");
    }, [realSessions]);

    const listeningSessions = useMemo(() => {
        return realSessions.filter((s) => s.session_mode === "listening");
    }, [realSessions]);

    const curiosityMinutes = useMemo(() => {
        return curiositySessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
    }, [curiositySessions]);

    const fluidMinutes = useMemo(() => {
        return fluidSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
    }, [fluidSessions]);

    const listeningMinutes = useMemo(() => {
        return listeningSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
    }, [listeningSessions]);

    const totalTrackedMinutes = useMemo(() => {
        return curiosityMinutes + fluidMinutes + listeningMinutes;
    }, [curiosityMinutes, fluidMinutes, listeningMinutes]);

    const pagesRead = useMemo(() => {
        return pageTrackedSessions.reduce((sum, s) => {
            if (s.start_page == null || s.end_page == null) return sum;
            return sum + (s.end_page - s.start_page + 1);
        }, 0);
    }, [pageTrackedSessions]);

    const timedPages = useMemo(() => {
        return timedPageTrackedSessions.reduce((sum, s) => {
            if (s.start_page == null || s.end_page == null) return sum;
            return sum + (s.end_page - s.start_page + 1);
        }, 0);
    }, [timedPageTrackedSessions]);

    const timedPageMinutes = useMemo(() => {
        return timedPageTrackedSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
    }, [timedPageTrackedSessions]);

    const daysEngaged = useMemo(() => {
        if (realSessions.length === 0) return null;
        return new Set(realSessions.map((s) => s.read_on)).size;
    }, [realSessions]);

    const lastEngaged = realSessions[0]?.read_on ?? null;

    const overallMinPerPage = timedPages > 0 ? timedPageMinutes / timedPages : null;
    const pagesPerHour = overallMinPerPage ? 60 / overallMinPerPage : null;

    const curiosityPageStats = useMemo(() => {
        const valid = curiositySessions.filter(
            (s) => s.minutes_read != null && s.minutes_read > 0 && s.start_page != null && s.end_page != null
        );

        const pages = valid.reduce((sum, s) => {
            if (s.start_page == null || s.end_page == null) return sum;
            return sum + (s.end_page - s.start_page + 1);
        }, 0);

        const minutes = valid.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);

        return pages > 0 ? minutes / pages : null;
    }, [curiositySessions]);

    const fluidPageStats = useMemo(() => {
        const valid = fluidSessions.filter(
            (s) => s.minutes_read != null && s.minutes_read > 0 && s.start_page != null && s.end_page != null
        );

        const pages = valid.reduce((sum, s) => {
            if (s.start_page == null || s.end_page == null) return sum;
            return sum + (s.end_page - s.start_page + 1);
        }, 0);

        const minutes = valid.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);

        return pages > 0 ? minutes / pages : null;
    }, [fluidSessions]);

    const difficultyComparison = useMemo(() => {
        if (!row || row.rating_difficulty == null || !book?.book_type) {
            return {
                sampleSize: 0,
                percentHarderThan: null as number | null,
            };
        }

        const sameTypeRatedBooks = comparisonBooks.filter((item) => {
            return (
                item.id !== row.id &&
                item.rating_difficulty != null &&
                item.books?.book_type === book.book_type
            );
        });

        if (sameTypeRatedBooks.length < 3) {
            return {
                sampleSize: sameTypeRatedBooks.length,
                percentHarderThan: null as number | null,
            };
        }

        // Difficulty scale: 1 = easiest, 5 = hardest.
        // This book is "harder than" books with a lower/easier rating.
        const easierBooks = sameTypeRatedBooks.filter(
            (item) =>
                item.rating_difficulty != null &&
                item.rating_difficulty < (row.rating_difficulty as number)
        );

        const percentHarderThan = Math.round(
            (easierBooks.length / sameTypeRatedBooks.length) * 100
        );

        return {
            sampleSize: sameTypeRatedBooks.length,
            percentHarderThan,
        };
    }, [row, book?.book_type, comparisonBooks]);

    const neighborhood = difficultyNeighborhood(difficultyComparison.percentHarderThan);
    const typeLabel = bookTypeLabel(book?.book_type);

    if (loading) {
        return <BookStatsLoadingState />;
    }

    if (!accessChecked) {
        return <BookStatsLoadingState message="Checking book access..." />;
    }

    if (!canAccessBook) {
        return (
            <AccessDeniedMessage
                message={accessMessage || "You do not have access to these book stats."}
            />
        );
    }

    if (errorMessage || !row) {
        return (
            <BookStatsErrorState
                message={errorMessage ?? "Book stats could not be loaded."}
            />
        );
    }

    return (
        <main className="min-h-screen bg-stone-50 p-6">
            <div className="mx-auto max-w-6xl space-y-5">
                <BookStatsHeader
                    bookTitle={book.title}
                    bookTitleReading={book.title_reading}
                    coverUrl={book.cover_url}
                    onOpenBookHub={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
                    onOpenVocabList={() =>
                        router.push(`/books/${encodeURIComponent(userBookId)}/words`)
                    }
                />

                <section className={`rounded-3xl border p-5 shadow-sm ${neighborhood.colorClass}`}>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_210px] md:items-stretch">
                        <div className="rounded-2xl bg-white/35 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                                Difficulty Neighborhood
                            </div>

                            <div className="mt-2 text-3xl font-black">
                                {neighborhood.label}
                            </div>

                            {difficultyComparison.percentHarderThan != null ? (
                                <p className="mt-2 text-sm leading-6">
                                    Harder than{" "}
                                    <span className="font-black">
                                        {difficultyComparison.percentHarderThan}%
                                    </span>{" "}
                                    of your other {typeLabel}.
                                </p>
                            ) : (
                                <p className="mt-2 text-sm leading-6">{neighborhood.note}</p>
                            )}

                            <div className="mt-4 text-xs opacity-70">
                                Compared only with your rated {typeLabel}.{" "}
                                {difficultyComparison.sampleSize > 0
                                    ? `Based on ${difficultyComparison.sampleSize} other rated ${typeLabel}.`
                                    : "Rate more books of this type to compare fairly."}
                            </div>
                        </div>

                        <div className="flex min-h-[150px] flex-col justify-center rounded-2xl border border-white/70 bg-white/75 p-5 text-center shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                                Your Rating
                            </div>

                            <div className="mt-2 text-4xl font-black">
                                {row.rating_difficulty ? `${row.rating_difficulty}/5` : "—"}
                            </div>

                            <div className="mt-2 text-sm font-semibold opacity-80">
                                {difficultyText(row.rating_difficulty)}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-black text-stone-950">
                        Progress Snapshot
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard label="Status" value={statusLabel(row)} />
                        <StatCard
                            label="Pages Read"
                            value={pagesRead || "—"}
                            note="Page-tracked sessions only"
                        />
                        <StatCard
                            label="Days Engaged"
                            value={daysEngaged ?? "—"}
                            note="Reading or listening dates"
                        />
                        <StatCard label="Last Engaged" value={lastEngaged ?? "—"} />
                    </div>
                </section>

                {totalTrackedMinutes > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-black text-stone-950">
                            Time by Mode
                        </h2>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {curiosityMinutes > 0 && (
                                <StatCard
                                    label="Curiosity Reading"
                                    value={formatMinutes(curiosityMinutes)}
                                    note="Intensive reading"
                                />
                            )}

                            {fluidMinutes > 0 && (
                                <StatCard
                                    label="Fluid Reading"
                                    value={formatMinutes(fluidMinutes)}
                                    note="Saved support + just reading"
                                />
                            )}

                            {listeningMinutes > 0 && (
                                <StatCard
                                    label="Listening"
                                    value={formatMinutes(listeningMinutes)}
                                    note="Ear training"
                                />
                            )}

                            <StatCard
                                label="Total Logged Time"
                                value={formatMinutes(totalTrackedMinutes)}
                                note="Reading and listening only"
                            />
                        </div>
                    </section>
                )}

                {(overallMinPerPage != null ||
                    pagesPerHour != null ||
                    curiosityPageStats != null ||
                    fluidPageStats != null) && (
                        <section className="space-y-3">
                            <h2 className="text-lg font-black text-stone-950">
                                Pace
                            </h2>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {overallMinPerPage != null && (
                                    <StatCard
                                        label="Overall Min/Page"
                                        value={overallMinPerPage.toFixed(2)}
                                        note="Page-tracked timed sessions"
                                    />
                                )}

                                {pagesPerHour != null && (
                                    <StatCard
                                        label="Pages/Hour"
                                        value={pagesPerHour.toFixed(1)}
                                        note="Based on page-tracked time"
                                    />
                                )}

                                {curiosityPageStats != null && (
                                    <StatCard
                                        label="Curiosity Min/Page"
                                        value={curiosityPageStats.toFixed(2)}
                                        note="Intensive pace"
                                    />
                                )}

                                {fluidPageStats != null && (
                                    <StatCard
                                        label="Fluid Min/Page"
                                        value={fluidPageStats.toFixed(2)}
                                        note="Extensive pace"
                                    />
                                )}
                            </div>
                        </section>
                    )}

                <section className="space-y-3">
                    <h2 className="text-lg font-black text-stone-950">
                        Vocabulary
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            label="Words Saved"
                            value={wordCount ?? "—"}
                            note="Saved words from this book"
                        />

                        {pagesRead > 0 && wordCount != null && (
                            <StatCard
                                label="Words/Page"
                                value={(wordCount / pagesRead).toFixed(2)}
                                note="Based on page-tracked progress"
                            />
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
