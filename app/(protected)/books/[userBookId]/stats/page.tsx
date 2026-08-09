// Book Stats Page
//

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { getBookIdentity } from "@/lib/books/bookIdentity";
import { isEnglishNativeTrackerBook as getIsEnglishNativeTrackerBook } from "@/lib/books/englishNativeTracker";
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
    language_code: string | null;
    page_count: number | null;
};

type UserBook = {
    id: string;
    user_id: string;
    started_at: string | null;
    finished_at: string | null;
    dnf_at: string | null;
    current_location: string | null;
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

function formatMinutes(total: number | null) {
    if (!total || total <= 0) return "—";

    const hours = Math.floor(total / 60);
    const minutes = total % 60;

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

function statusLabel(row: UserBook | null) {
    if (!row) return "—";
    if (row.dnf_at) return "DNF";
    if (row.finished_at) return "Finished";
    if (row.started_at) return "Reading";
    return "Not started";
}

function WordHistoryCard({
    wordCount,
    onOpen,
}: {
    wordCount: number | null;
    onOpen: () => void;
}) {
    return (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                        Word History
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-stone-950">
                        Your Words in This Book
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-stone-700">
                        Look up a word to see where it appeared in this book, and review the words you looked up most.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="rounded-2xl border border-white/80 bg-white px-4 py-3 text-center shadow-sm">
                        <p className="text-2xl font-black text-stone-950">
                            {wordCount ?? "—"}
                        </p>
                        <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                            saved words
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onOpen}
                        className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
                    >
                        Open Word History →
                    </button>
                </div>
            </div>
        </section>
    );
}

async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    return token;
}

async function loadReadingSessionStats(userBookId: string) {
    const token = await getAccessToken();
    const response = await fetch(`/api/books/${userBookId}/reading-sessions`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.error ?? "Could not load reading sessions.");
    }

    return data as {
        sessions?: ReadingSession[];
        wordCount?: number | null;
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
    const [canSeeVocabularyStats, setCanSeeVocabularyStats] = useState(false);
    const [isEnglishNativeTrackerBook, setIsEnglishNativeTrackerBook] = useState(false);
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
            setCanSeeVocabularyStats(false);
            setIsEnglishNativeTrackerBook(false);
            setWordCount(null);

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
                .select("role, is_super_teacher, app_access_type, app_access_expires_at")
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
          current_location,
          rating_difficulty,
          books (
            id,
            title,
            title_reading,
            cover_url,
            book_type,
            language_code,
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
            const roleForAccess = isSuperTeacher ? "super_teacher" : profile?.role;

            const appStatus = getAppAccessStatus({
                role: roleForAccess,
                app_access_type: (profile as any)?.app_access_type ?? null,
                app_access_expires_at: (profile as any)?.app_access_expires_at ?? null,
            });

            const featureAccess = getFeatureAccess({
                role: roleForAccess,
                hasFullAccess: appStatus.hasFullAccess,
                isTrialActive: appStatus.reason === "trial",
            });

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

            const { data: ownerProfile, error: ownerProfileError } = await supabase
                .from("profiles")
                .select("native_language")
                .eq("id", ownerUserId)
                .maybeSingle();

            if (ownerProfileError) {
                console.error("Error loading book stats owner profile:", ownerProfileError);
            }

            const trackerBook = getIsEnglishNativeTrackerBook({
                bookLanguageCode: loadedRow.books?.language_code ?? null,
                ownerNativeLanguage: ownerProfile?.native_language ?? null,
            });

            if (featureAccess.isTrial && !trackerBook) {
                setAccessMessage("Deep Book Stats are part of paid Reading Access. During your trial, use the Book Hub to track reading, listening, saved words, and word colors.");
                setAccessChecked(true);
                setCanAccessBook(false);
                setLoading(false);
                return;
            }

            const canViewVocabularyStats = featureAccess.canUseBookStats && !trackerBook;

            setCanSeeVocabularyStats(canViewVocabularyStats);
            setIsEnglishNativeTrackerBook(trackerBook);
            setCanAccessBook(true);
            setAccessChecked(true);
            setRow(loadedRow);

            try {
                const statsData = await loadReadingSessionStats(userBookId);

                if (cancelled) return;

                setSessions(statsData.sessions ?? []);
                setWordCount(canViewVocabularyStats ? statsData.wordCount ?? 0 : null);
            } catch (statsError) {
                if (cancelled) return;
                console.error("Error loading book session stats:", statsError);
                setSessions([]);
                setWordCount(null);
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

    const engagementSessions = useMemo(() => {
        return isEnglishNativeTrackerBook ? visualReadingSessions : realSessions;
    }, [isEnglishNativeTrackerBook, realSessions, visualReadingSessions]);

    const totalTrackedMinutes = useMemo(() => {
        return isEnglishNativeTrackerBook
            ? fluidMinutes
            : curiosityMinutes + fluidMinutes + listeningMinutes;
    }, [curiosityMinutes, fluidMinutes, isEnglishNativeTrackerBook, listeningMinutes]);

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
        if (engagementSessions.length === 0) return null;
        return new Set(engagementSessions.map((s) => s.read_on)).size;
    }, [engagementSessions]);

    const lastEngaged = engagementSessions[0]?.read_on ?? null;

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

    const nativeActivitySessions = useMemo(() => {
        return realSessions.filter((s) => s.session_mode === "fluid" || s.session_mode === "listening");
    }, [realSessions]);

    const nativeTimedReadingSessions = useMemo(() => {
        return fluidSessions.filter((s) => s.minutes_read != null && s.minutes_read > 0);
    }, [fluidSessions]);

    const nativeTimedReadingPageSessions = useMemo(() => {
        return nativeTimedReadingSessions.filter((s) => s.start_page != null && s.end_page != null);
    }, [nativeTimedReadingSessions]);

    const nativeTimedReadingMinutes = useMemo(() => {
        return nativeTimedReadingSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
    }, [nativeTimedReadingSessions]);

    const nativeTimedReadingPages = useMemo(() => {
        return nativeTimedReadingPageSessions.reduce((sum, s) => {
            if (s.start_page == null || s.end_page == null) return sum;
            return sum + (s.end_page - s.start_page + 1);
        }, 0);
    }, [nativeTimedReadingPageSessions]);

    const nativeAverageMinPerPage =
        nativeTimedReadingPages > 0 && nativeTimedReadingMinutes > 0
            ? nativeTimedReadingMinutes / nativeTimedReadingPages
            : null;
    const nativePagesPerHour = nativeAverageMinPerPage ? 60 / nativeAverageMinPerPage : null;

    const nativeTimedListeningSessions = useMemo(() => {
        return listeningSessions.filter((s) => s.minutes_read != null && s.minutes_read > 0);
    }, [listeningSessions]);

    const nativeTimedListeningMinutes = useMemo(() => {
        return nativeTimedListeningSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
    }, [nativeTimedListeningSessions]);

    const nativeDaysActive = useMemo(() => {
        if (nativeActivitySessions.length === 0) return null;
        return new Set(nativeActivitySessions.map((s) => s.read_on)).size;
    }, [nativeActivitySessions]);

    const nativeLastActivity = nativeActivitySessions[0]?.read_on ?? row?.finished_at ?? row?.dnf_at ?? row?.started_at ?? null;
    const nativeLastActivityMode =
        nativeActivitySessions[0]?.session_mode === "listening"
            ? "listening"
            : nativeActivitySessions[0]?.session_mode === "fluid"
                ? "reading"
                : null;

    const nativeCurrentReadingPage = useMemo(() => {
        const endPages = fluidSessions
            .map((s) => s.end_page)
            .filter((page): page is number => page != null && Number.isFinite(page));
        if (endPages.length === 0) return null;
        return Math.max(...endPages);
    }, [fluidSessions]);

    const nativeListeningLocation = row?.current_location?.trim() || "";
    const nativeCurrentProgress = (() => {
        if (row?.finished_at) {
            return book?.page_count ? `${book.page_count} / ${book.page_count}` : "Finished";
        }

        if (nativeListeningLocation && (nativeLastActivityMode === "listening" || nativeCurrentReadingPage == null)) {
            return nativeListeningLocation;
        }

        if (nativeCurrentReadingPage != null) {
            return book?.page_count ? `${nativeCurrentReadingPage} / ${book.page_count}` : `Page ${nativeCurrentReadingPage}`;
        }

        if (nativeListeningLocation) return nativeListeningLocation;
        if (row?.started_at) return "In progress";
        return "—";
    })();

    const nativeCurrentProgressNote =
        nativeListeningLocation && nativeCurrentReadingPage != null && nativeLastActivityMode !== "listening"
            ? `Listening position: ${nativeListeningLocation}`
            : nativeLastActivityMode === "listening"
                ? "Latest activity was listening"
                : nativeCurrentReadingPage != null
                    ? "From reading progress updates"
                    : undefined;

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

    const bookIdentity = getBookIdentity(book);

    return (
        <main className="min-h-screen bg-stone-50 p-6">
            <div className="mx-auto max-w-6xl space-y-5">
                <BookStatsHeader
                    bookTitle={bookIdentity.title}
                    bookTitleReading={bookIdentity.titleReading}
                    coverUrl={book?.cover_url ?? null}
                    canOpenVocabList={canSeeVocabularyStats}
                    bookHubHref={`/books/${encodeURIComponent(userBookId)}`}
                    vocabListHref={`/books/${encodeURIComponent(userBookId)}/words`}
                    description={
                        isEnglishNativeTrackerBook
                            ? "Progress, timed reading, listening, and pace."
                            : undefined
                    }
                />

                {isEnglishNativeTrackerBook ? (
                    <>
                        <StatsSection title="Progress">
                            <StatCard label="Status" value={statusLabel(row)} />
                            <StatCard
                                label="Current Progress"
                                value={nativeCurrentProgress}
                                note={nativeCurrentProgressNote}
                            />
                            <StatCard
                                label="Days Active"
                                value={nativeDaysActive ?? "—"}
                                note="Reading or listening activity"
                            />
                            <StatCard label="Last Activity" value={nativeLastActivity ?? "—"} />
                        </StatsSection>

                        {nativeTimedReadingMinutes > 0 || nativeAverageMinPerPage != null || nativePagesPerHour != null ? (
                            <StatsSection title="Reading">
                                {nativeTimedReadingMinutes > 0 ? (
                                    <StatCard
                                        label="Total Timed Reading"
                                        value={formatMinutes(nativeTimedReadingMinutes)}
                                        note="Timed reading sessions only"
                                    />
                                ) : null}

                                {nativeAverageMinPerPage != null ? (
                                    <StatCard
                                        label="Average Min/Page"
                                        value={nativeAverageMinPerPage.toFixed(2)}
                                        note="Timed reading with page ranges"
                                    />
                                ) : null}

                                {nativePagesPerHour != null ? (
                                    <StatCard
                                        label="Pages/Hour"
                                        value={nativePagesPerHour.toFixed(1)}
                                        note="Timed reading with page ranges"
                                    />
                                ) : null}
                            </StatsSection>
                        ) : null}

                        {nativeTimedListeningMinutes > 0 ? (
                            <StatsSection title="Listening">
                                <StatCard
                                    label="Total Listening Time"
                                    value={formatMinutes(nativeTimedListeningMinutes)}
                                    note="Timed listening sessions only"
                                />
                                <StatCard
                                    label="Listening Sessions"
                                    value={nativeTimedListeningSessions.length}
                                    note="Timed listening sessions"
                                />
                            </StatsSection>
                        ) : null}
                    </>
                ) : (
                    <>
                        {canSeeVocabularyStats ? (
                            <WordHistoryCard
                                wordCount={wordCount}
                                onOpen={() =>
                                    router.push(
                                        `/vocab/explore?userBookId=${encodeURIComponent(userBookId)}`
                                    )
                                }
                            />
                        ) : null}

                <StatsSection title="Progress Snapshot">
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
                </StatsSection>

                {totalTrackedMinutes > 0 && (
                    <StatsSection title="Time by Mode">
                        {!isEnglishNativeTrackerBook && curiosityMinutes > 0 && (
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

                        {!isEnglishNativeTrackerBook && listeningMinutes > 0 && (
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
                    </StatsSection>
                )}

                {(overallMinPerPage != null ||
                    pagesPerHour != null ||
                    curiosityPageStats != null ||
                    fluidPageStats != null) && (
                        <StatsSection title="Pace">
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
                        </StatsSection>
                    )}

                {canSeeVocabularyStats ? (
                    <StatsSection title="Vocabulary">
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
                    </StatsSection>
                ) : null}
                    </>
                )}
            </div>
        </main>
    );
}
