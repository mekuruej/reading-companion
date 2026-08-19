// Simple Timed Session Page
//

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { displayBookTitle } from "@/lib/books/bookIdentity";
import { todayYmdAppTimeZone } from "@/lib/timeZone";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import {
    clearPersistedTimedSession,
    elapsedMsForPersistedTimedSession,
    readPersistedTimedSession,
    writePersistedTimedSession,
} from "./timedSessionPersistence";

type SessionMode = "fluid" | "listening";

type SimpleTimedSessionPageProps = {
    sessionMode: SessionMode;
    allowNativeReadListenToggle?: boolean;
    onActiveSessionModeChange?: (mode: SessionMode) => void;
    eyebrow: string;
    title: string;
    subtitle: string;
    description: string;
    saveSuccessMessage: string;
    backLabel?: string;
    startLocationLabel?: string;
    endLocationLabel?: string;
    sessionLocationNote?: string;
    listeningLocationNote?: string;
    embedded?: boolean;
    workspaceCompact?: boolean;
};

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

function percentToPage(percent: number | null, pageCount: number | null) {
    if (percent == null || !pageCount || pageCount <= 0) return null;
    const clamped = Math.max(0, Math.min(100, percent));
    return Math.max(1, Math.min(pageCount, Math.round((clamped / 100) * pageCount)));
}

function pageToPercent(page: number | null, pageCount: number | null) {
    if (page == null || !pageCount || pageCount <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((page / pageCount) * 100)));
}

function parseListeningEndpoint(value: string, pageCount: number | null) {
    const trimmed = value.trim();
    if (!trimmed) return { value: null, error: null };

    const isPercent = trimmed.includes("%");
    const normalized = trimmed
        .replace(/%/g, "")
        .replace(/^p(?:age)?\.?\s*/i, "")
        .trim();
    const numeric = Number(normalized);

    if (!Number.isFinite(numeric)) {
        return { value: null, error: "Enter a page number or percent, like 42, p. 42, or 18%." };
    }

    if (isPercent) {
        if (numeric < 0 || numeric > 100) {
            return { value: null, error: "Listening percent must be between 0 and 100." };
        }

        return { value: percentToPage(numeric, pageCount) ?? Math.round(numeric), error: null };
    }

    if (numeric <= 0) {
        return { value: null, error: "Listening page must be greater than 0." };
    }

    return { value: Math.round(numeric), error: null };
}

function parseFlexibleListeningEndpoint(value: string, pageCount: number | null) {
    const parsed = parseListeningEndpoint(value, pageCount);
    return parsed.error ? { value: null, error: null } : parsed;
}

export default function SimpleTimedSessionPage({
    sessionMode,
    allowNativeReadListenToggle = false,
    onActiveSessionModeChange,
    eyebrow,
    title,
    subtitle,
    description,
    saveSuccessMessage,
    backLabel = "Back to Book Hub",
    startLocationLabel = "Start page optional",
    endLocationLabel = "End page optional",
    sessionLocationNote = "Page numbers are optional. If you leave them blank, only the time will be saved. Pace stats can only be generated with page numbers.",
    listeningLocationNote = "Optional. Add an audiobook position like Chapter 8, 37%, or 3:12:45. Listening time stays separate from reading pace.",
    embedded = false,
    workspaceCompact = false,
}: SimpleTimedSessionPageProps) {
    const router = useRouter();
    const params = useParams<{ userBookId: string }>();
    const userBookId = params.userBookId;

    const [loading, setLoading] = useState(true);
    const [bookTitle, setBookTitle] = useState("");
    const [bookCover, setBookCover] = useState("");
    const [bookPageCount, setBookPageCount] = useState<number | null>(null);
    const [bookStartedAt, setBookStartedAt] = useState<string | null>(null);
    const [showFinishedNav, setShowFinishedNav] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [accessChecked, setAccessChecked] = useState(false);
    const [canAccessBook, setCanAccessBook] = useState(false);
    const [accessMessage, setAccessMessage] = useState("");
    const [hasSavedWords, setHasSavedWords] = useState(false);

    const [sessionDate, setSessionDate] = useState("");
    const [sessionStartPage, setSessionStartPage] = useState("");
    const [sessionEndPage, setSessionEndPage] = useState("");
    const [sessionMinutesRead, setSessionMinutesRead] = useState("");

    const [startTime, setStartTime] = useState<number | null>(null);
    const [accumulatedElapsedMs, setAccumulatedElapsedMs] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showTimedSessionForm, setShowTimedSessionForm] = useState(false);
    const [timerSaveMessage, setTimerSaveMessage] = useState("");
    const [hasFinishedTimer, setHasFinishedTimer] = useState(false);
    const [timerPersistenceReady, setTimerPersistenceReady] = useState(false);
    const [activeSessionMode, setActiveSessionMode] = useState<SessionMode>(sessionMode);
    const [showProgressUpdateForm, setShowProgressUpdateForm] = useState(false);
    const [progressUpdateLocation, setProgressUpdateLocation] = useState("");
    const [progressUpdateMessage, setProgressUpdateMessage] = useState("");
    const [savingProgressUpdate, setSavingProgressUpdate] = useState(false);
    const skippedInitialPersistenceWriteRef = useRef(false);
    const isNativeListeningMode = allowNativeReadListenToggle && activeSessionMode === "listening";
    const activeEyebrow = allowNativeReadListenToggle
        ? activeSessionMode === "listening"
            ? "Listening"
            : "Reading"
        : eyebrow;
    const activeTitle = allowNativeReadListenToggle
        ? activeSessionMode === "listening"
            ? "Listen"
            : "Read"
        : title;
    const activeModeColor = activeSessionMode === "listening" ? "violet" : "emerald";
    const activeSubtitle = allowNativeReadListenToggle
        ? activeSessionMode === "listening"
            ? "Timed listening"
            : "Timed reading"
        : subtitle;
    const activeDescription = allowNativeReadListenToggle
        ? activeSessionMode === "listening"
            ? "Listen to your audiobook and log the time separately from reading pace."
            : "Time your reading, update your progress, and see your reading pace."
        : description;
    const activeSaveSuccessMessage = allowNativeReadListenToggle
        ? activeSessionMode === "listening"
            ? "Your listening session has been saved in Reading History."
            : "Your reading session has been saved in Reading History."
        : saveSuccessMessage;
    const activeSessionLocationNote =
        activeSessionMode === "listening" ? listeningLocationNote : sessionLocationNote;

    useEffect(() => {
        setActiveSessionMode(sessionMode);
    }, [sessionMode]);

    useEffect(() => {
        if (allowNativeReadListenToggle) {
            onActiveSessionModeChange?.(activeSessionMode);
        }
    }, [activeSessionMode, allowNativeReadListenToggle, onActiveSessionModeChange]);

    useEffect(() => {
        let cancelled = false;

        async function loadBook() {
            if (!userBookId) return;

            setLoading(true);
            setErrorMessage("");
            setAccessChecked(false);
            setCanAccessBook(false);
            setAccessMessage("");
            setHasSavedWords(false);

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

            const { data, error } = await supabase
                .from("user_books")
                .select(`
          id,
          user_id,
          started_at,
          books (
            title,
            language_code,
            cover_url,
            page_count
          )
        `)
                .eq("id", userBookId)
                .maybeSingle();

            if (cancelled) return;

            if (error || !data) {
                console.error("Error loading timed session book:", error);
                setAccessMessage("You do not have access to this book.");
                setAccessChecked(true);
                setCanAccessBook(false);
                setLoading(false);
                return;
            }

            const ownerUserId = (data as any).user_id;
            const isSuperTeacher =
                profile?.role === "super_teacher" || Boolean((profile as any)?.is_super_teacher);
            let canAccess =
                ownerUserId === user.id ||
                isSuperTeacher;

            if (!canAccess && profile?.role === "teacher" && ownerUserId) {
                const { data: teacherStudent, error: teacherStudentError } = await supabase
                    .from("teacher_students")
                    .select("id")
                    .eq("teacher_id", user.id)
                    .eq("student_id", ownerUserId)
                    .maybeSingle();

                if (cancelled) return;

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

            const book = Array.isArray((data as any)?.books)
                ? (data as any).books[0]
                : (data as any)?.books;

            setCanAccessBook(true);
            setAccessChecked(true);
            setBookTitle(displayBookTitle(book));
            setBookCover(book?.cover_url ?? "");
            setBookPageCount(book?.page_count ?? null);
            setBookStartedAt((data as any).started_at ?? null);

            const { data: savedWordRows, error: savedWordError } = await supabase
                .from("user_book_words")
                .select("id")
                .eq("user_book_id", userBookId)
                .limit(1);

            if (savedWordError) {
                console.error("Error checking timed session saved words:", savedWordError);
                setHasSavedWords(false);
            } else {
                setHasSavedWords((savedWordRows ?? []).length > 0);
            }

            setLoading(false);
        }

        loadBook();

        return () => {
            cancelled = true;
        };
    }, [userBookId]);

    useEffect(() => {
        if (!userBookId) return;

        skippedInitialPersistenceWriteRef.current = false;
        const persisted = readPersistedTimedSession(activeSessionMode, userBookId);
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
    }, [activeSessionMode, userBookId]);

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
            clearPersistedTimedSession(activeSessionMode, userBookId);
            return;
        }

        writePersistedTimedSession({
            version: 1,
            sessionMode: activeSessionMode,
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
        activeSessionMode,
        sessionStartPage,
        showTimedSessionForm,
        startTime,
        timerPersistenceReady,
        userBookId,
    ]);

    useEffect(() => {
        if (!timerPersistenceReady || !userBookId) return;

        const persistCurrentTimer = () => {
            if (!isRunning && !isPaused && !showTimedSessionForm && accumulatedElapsedMs <= 0) return;

            writePersistedTimedSession({
                version: 1,
                sessionMode: activeSessionMode,
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
        activeSessionMode,
        sessionStartPage,
        showTimedSessionForm,
        startTime,
        timerPersistenceReady,
        userBookId,
    ]);

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
            setShowTimedSessionForm(true);
            return;
        }

        const latest = data?.[0];
        const latestEndPage =
            latest?.end_page != null && Number.isFinite(Number(latest.end_page))
                ? Number(latest.end_page)
                : null;
        const latestPercent = pageToPercent(latestEndPage, bookPageCount);
        const nextStart = latestEndPage != null ? String(latestEndPage + 1) : "";

        setSessionStartPage(activeSessionMode === "listening" ? "" : nextStart);
        setSessionEndPage(
            activeSessionMode === "listening"
                ? latestPercent != null
                    ? `${latestPercent}%`
                    : latestEndPage != null
                        ? `p. ${latestEndPage}`
                        : ""
                : nextStart
        );
        setShowTimedSessionForm(true);
    }

    async function saveTimedSession() {
        if (!userBookId) return;

        if (!canAccessBook) {
            setTimerSaveMessage("❌ You do not have access to save sessions to this book.");
            return;
        }

        const trimmedStartPage = sessionStartPage.trim();
        const trimmedEndPage = sessionEndPage.trim();
        const hasAnyPageInput = trimmedStartPage !== "" || trimmedEndPage !== "";

        let startPageNum: number | null = null;
        let endPageNum: number | null = null;

        if (activeSessionMode === "listening") {
            const parsedEndpoint = isNativeListeningMode
                ? parseFlexibleListeningEndpoint(trimmedEndPage, bookPageCount)
                : parseListeningEndpoint(trimmedEndPage, bookPageCount);
            if (parsedEndpoint.error) {
                alert(parsedEndpoint.error);
                return;
            }
            endPageNum = parsedEndpoint.value;
        } else if (hasAnyPageInput) {
            startPageNum = Number(trimmedStartPage);
            endPageNum = Number(trimmedEndPage);

            if (!Number.isFinite(startPageNum) || !Number.isFinite(endPageNum)) {
                alert("Please enter both a valid start page and end page, or leave both blank.");
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
        }

        const minutesNum = Number(sessionMinutesRead || Math.max(1, Math.round(elapsed / 60)));

        const readOn = sessionDate || todayYmdAppTimeZone();

        const { error } = await supabase.from("user_book_reading_sessions").insert({
            user_book_id: userBookId,
            read_on: readOn,
            start_page: startPageNum,
            end_page: endPageNum,
            minutes_read: minutesNum,
            session_mode: activeSessionMode,
        });

        if (error) {
            console.error("Error saving timed session:", error);
            alert(`Could not save timed session.\n${error.message}`);
            return;
        }

        setShowTimedSessionForm(false);
        setElapsed(0);
        setAccumulatedElapsedMs(0);
        setStartTime(null);
        setIsRunning(false);
        setIsPaused(false);
        setSessionMinutesRead("");
        clearPersistedTimedSession(activeSessionMode, userBookId);
        setTimerSaveMessage(activeSaveSuccessMessage);
        setShowFinishedNav(true);

        const bookPatch: {
            status: "reading";
            started_at?: string;
            current_location?: string | null;
        } = {
            status: "reading",
        };

        if (!bookStartedAt) {
            bookPatch.started_at = readOn;
        }

        if (isNativeListeningMode) {
            bookPatch.current_location = trimmedEndPage || null;
        }

        if (!bookStartedAt || isNativeListeningMode) {
            const { data: updatedBook, error: updateError } = await supabase
                .from("user_books")
                .update(bookPatch)
                .eq("id", userBookId)
                .select("started_at")
                .maybeSingle();

            if (updateError) {
                console.error("Error updating book after timed session:", updateError);
            } else {
                setBookStartedAt((updatedBook as any)?.started_at ?? bookPatch.started_at ?? bookStartedAt);
            }
        }

        setTimeout(() => {
            setTimerSaveMessage("");
        }, 4000);
    }
    function startTimer() {
        const today = todayYmdAppTimeZone();

        setSessionDate(today);
        setStartTime(Date.now());
        setAccumulatedElapsedMs(0);
        setElapsed(0);
        setIsRunning(true);
        setIsPaused(false);
        setHasFinishedTimer(false);
        setShowFinishedNav(false);
        setShowTimedSessionForm(false);
        setTimerSaveMessage("");
        setSessionMinutesRead("");
    }

    function pauseTimer() {
        const nextElapsedMs =
            accumulatedElapsedMs + (startTime ? Math.max(0, Date.now() - startTime) : 0);

        if (startTime) {
            setElapsed(Math.floor(nextElapsedMs / 1000));
        }

        setAccumulatedElapsedMs(nextElapsedMs);
        setStartTime(null);
        setIsRunning(false);
        setIsPaused(true);
    }

    function resumeTimer() {
        setStartTime(Date.now());
        setIsRunning(true);
        setIsPaused(false);
    }

    function finishTimer() {
        const nextElapsedMs =
            accumulatedElapsedMs + (startTime ? Math.max(0, Date.now() - startTime) : 0);

        setAccumulatedElapsedMs(nextElapsedMs);
        setElapsed(Math.floor(nextElapsedMs / 1000));
        setStartTime(null);
        setIsRunning(false);
        setIsPaused(false);
        setHasFinishedTimer(true);
        setShowFinishedNav(false);
        void openTimedSessionFormWithDefaults();
    }

    function switchNativeSessionMode(nextMode: SessionMode) {
        if (activeSessionMode === nextMode) return;

        if (isRunning || isPaused || showTimedSessionForm) {
            const ok = window.confirm("Cancel the current timer before switching modes?");
            if (!ok) return;

            clearPersistedTimedSession(activeSessionMode, userBookId);
            setShowTimedSessionForm(false);
            setElapsed(0);
            setAccumulatedElapsedMs(0);
            setStartTime(null);
            setIsPaused(false);
            setIsRunning(false);
            setHasFinishedTimer(false);
        }

        setActiveSessionMode(nextMode);
        setSessionStartPage("");
        setSessionEndPage("");
        setSessionMinutesRead("");
        setTimerSaveMessage("");
        setProgressUpdateLocation("");
        setProgressUpdateMessage("");
        setShowFinishedNav(false);
    }

    async function saveProgressUpdateWithoutTiming() {
        if (!userBookId || !canAccessBook || savingProgressUpdate) return;

        const trimmedLocation = progressUpdateLocation.trim();
        if (!trimmedLocation) {
            setProgressUpdateMessage("Add your current progress before saving.");
            return;
        }

        let endPageNum: number | null = null;

        if (activeSessionMode === "listening") {
            const parsedEndpoint = parseFlexibleListeningEndpoint(trimmedLocation, bookPageCount);
            endPageNum = parsedEndpoint.value;
        } else {
            const parsedPage = Number(trimmedLocation);

            if (!Number.isFinite(parsedPage) || parsedPage <= 0) {
                setProgressUpdateMessage("Enter a valid current page.");
                return;
            }

            endPageNum = Math.round(parsedPage);
        }

        setSavingProgressUpdate(true);
        setProgressUpdateMessage("");

        const readOn = todayYmdAppTimeZone();
        const { error: sessionError } = await supabase.from("user_book_reading_sessions").insert({
            user_book_id: userBookId,
            read_on: readOn,
            start_page: null,
            end_page: endPageNum,
            minutes_read: null,
            session_mode: activeSessionMode,
        });

        if (sessionError) {
            console.error("Error saving progress update:", sessionError);
            setProgressUpdateMessage("Could not update progress.");
            setSavingProgressUpdate(false);
            return;
        }

        const bookPatch: {
            status: "reading";
            started_at?: string;
            current_location?: string | null;
        } = {
            status: "reading",
        };

        if (!bookStartedAt) {
            bookPatch.started_at = readOn;
        }

        if (activeSessionMode === "listening") {
            bookPatch.current_location = trimmedLocation;
        }

        const { data: updatedBook, error: updateError } = await supabase
            .from("user_books")
            .update(bookPatch)
            .eq("id", userBookId)
            .select("started_at")
            .maybeSingle();

        setSavingProgressUpdate(false);

        if (updateError) {
            console.error("Error updating book progress:", updateError);
            setProgressUpdateMessage("Progress was saved to history, but the book status could not be updated.");
            return;
        }

        setBookStartedAt((updatedBook as any)?.started_at ?? bookPatch.started_at ?? bookStartedAt);
        setProgressUpdateLocation("");
        setProgressUpdateMessage(
            activeSessionMode === "listening"
                ? "Listening progress updated. Pace was not changed."
                : "Reading progress updated. Pace needs a timed reading session."
        );
        setShowFinishedNav(true);
    }

    const nativeModeToggle = allowNativeReadListenToggle ? (
        <div className="mx-auto flex w-fit rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
            {(["fluid", "listening"] as SessionMode[]).map((mode) => {
                const active = activeSessionMode === mode;
                const activeClass =
                    mode === "listening"
                        ? "bg-violet-700 text-white"
                        : "bg-emerald-700 text-white";
                const inactiveClass =
                    mode === "listening"
                        ? "text-stone-600 hover:bg-violet-50"
                        : "text-stone-600 hover:bg-emerald-50";
                return (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => switchNativeSessionMode(mode)}
                        className={[
                            "rounded-xl px-4 py-2 text-sm font-black transition",
                            active ? activeClass : inactiveClass,
                        ].join(" ")}
                    >
                        {mode === "listening" ? "Listening" : "Reading"}
                    </button>
                );
            })}
        </div>
    ) : null;

    if (loading) {
        const loadingState = (
            <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
                Loading...
            </div>
        );

        return embedded ? (
            loadingState
        ) : (
            <main className="min-h-screen bg-stone-50 p-6">
                {loadingState}
            </main>
        );
    }

    if (!accessChecked) {
        const loadingState = (
            <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
                Loading...
            </div>
        );

        return embedded ? (
            loadingState
        ) : (
            <main className="min-h-screen bg-stone-50 p-6">
                {loadingState}
            </main>
        );
    }

    if (!canAccessBook) {
        return (
            <AccessDeniedMessage message={accessMessage || "You do not have access to this book."} />
        );
    }

    const timerPanel = (
        <div className={workspaceCompact ? "rounded-2xl border border-stone-200 bg-stone-50 p-4 text-center" : "mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-5 text-center"}>
            <div className="text-sm font-medium text-stone-500">Timer</div>
            <div className={workspaceCompact ? "mt-2 text-4xl font-black tracking-tight text-stone-900" : "mt-2 text-6xl font-black tracking-tight text-stone-900"}>
                {formatTimer(elapsed)}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {!isRunning && !isPaused ? (
                    <button
                        type="button"
                        onClick={startTimer}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                        Start Timer
                    </button>
                ) : null}

                {isRunning ? (
                    <>
                        <button
                            type="button"
                            onClick={pauseTimer}
                            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
                        >
                            Pause
                        </button>

                        <button
                            type="button"
                            onClick={finishTimer}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                            Finish
                        </button>
                    </>
                ) : null}

                {isPaused ? (
                    <>
                        <button
                            type="button"
                            onClick={resumeTimer}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                        >
                            Resume
                        </button>

                        <button
                            type="button"
                            onClick={finishTimer}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                            Finish
                        </button>
                    </>
                ) : null}
            </div>

            {(isRunning || isPaused) ? (
                <p className="mt-3 text-xs text-amber-600">
                    Timer is active. If you leave this page or refresh, you may lose your session.
                </p>
            ) : null}

            {timerSaveMessage ? (
                <p className="mt-3 text-xs text-emerald-600">{timerSaveMessage}</p>
            ) : null}
        </div>
    );

    const saveSessionForm = showTimedSessionForm && !isRunning ? (
        <div className={workspaceCompact ? "mt-3 rounded-2xl border border-stone-300 bg-white p-4" : "mt-5 rounded-3xl border border-stone-300 bg-white p-5"}>
            <div className="mb-3 text-sm font-semibold text-stone-800">
                Save this session
            </div>

            {activeSessionMode === "listening" ? (
                <div>
                    <div className="mb-1 text-sm text-stone-600">
                        {isNativeListeningMode ? "Listening position" : "Up to page or percent"}
                    </div>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={sessionEndPage}
                        onChange={(e) => setSessionEndPage(e.target.value)}
                        placeholder={isNativeListeningMode ? "e.g. Chapter 8, 37%, or 3:12:45" : "e.g. p. 42 or 18%"}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                    <div className="mt-1 text-xs text-stone-500">
                        {isNativeListeningMode
                            ? "Optional. This updates your audiobook position without adding page data."
                            : "Optional. Use a page if you have the book open, or a percent for audiobook progress."}
                    </div>
                </div>
            ) : (
                <div className={workspaceCompact ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
                    <div>
                        <div className="mb-1 text-sm text-stone-600">{startLocationLabel}</div>
                        <input
                            type="number"
                            min={1}
                            value={sessionStartPage}
                            onChange={(e) => setSessionStartPage(e.target.value)}
                            placeholder="e.g. 45"
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <div className="mb-1 text-sm text-stone-600">{endLocationLabel}</div>
                        <input
                            type="number"
                            min={1}
                            value={sessionEndPage}
                            onChange={(e) => setSessionEndPage(e.target.value)}
                            placeholder="e.g. 52"
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                        />
                    </div>
                </div>
            )}

            <div className="mt-3 space-y-1 text-sm text-stone-500">
                <div>Time: {formatTimer(elapsed)}</div>
                <div className="text-xs">
                    {activeSessionLocationNote}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={async () => {
                        setSessionMinutesRead(String(Math.max(1, Math.round(elapsed / 60))));
                        await saveTimedSession();
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
                        setAccumulatedElapsedMs(0);
                        setStartTime(null);
                        setIsPaused(false);
                        setIsRunning(false);
                        clearPersistedTimedSession(activeSessionMode, userBookId);
                    }}
                    className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
                >
                    Cancel
                </button>
            </div>
        </div>
    ) : null;

    const progressUpdatePanel = allowNativeReadListenToggle ? (
        <div className={workspaceCompact ? "mt-3 rounded-2xl bg-stone-50 p-4" : "mt-4 rounded-3xl bg-stone-50 p-5"}>
            {!showProgressUpdateForm ? (
                <button
                    type="button"
                    onClick={() => {
                        setShowProgressUpdateForm(true);
                        setProgressUpdateMessage("");
                    }}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
                >
                    Just update my book without timing
                </button>
            ) : (
                <div className="space-y-3">
                    <div>
                        <div className="text-sm font-semibold text-stone-900">
                            Just update my book
                        </div>
                        <p className="mt-1 text-xs leading-5 text-stone-500">
                            This updates your progress without timing. Pace can only be calculated from timed reading sessions.
                        </p>
                    </div>

                    <label className="block">
                        <span className="text-xs font-semibold text-stone-600">
                            {activeSessionMode === "listening" ? "Listening position" : "Current page"}
                        </span>
                        <input
                            type="text"
                            inputMode={activeSessionMode === "listening" ? "text" : "numeric"}
                            value={progressUpdateLocation}
                            onChange={(event) => setProgressUpdateLocation(event.target.value)}
                            placeholder={activeSessionMode === "listening" ? "e.g. Chapter 8, 37%, or 3:12:45" : "e.g. 84"}
                            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                        />
                    </label>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void saveProgressUpdateWithoutTiming()}
                            disabled={savingProgressUpdate}
                            className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
                        >
                            {savingProgressUpdate ? "Saving..." : "Save Progress"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowProgressUpdateForm(false);
                                setProgressUpdateLocation("");
                                setProgressUpdateMessage("");
                            }}
                            className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
                        >
                            Cancel
                        </button>
                    </div>

                    {progressUpdateMessage ? (
                        <p className="text-xs font-semibold text-stone-600">{progressUpdateMessage}</p>
                    ) : null}
                </div>
            )}
        </div>
    ) : null;

    const content = workspaceCompact ? (
        <>
            {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            {showFinishedNav && userBookId && bookTitle ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                    <button
                        type="button"
                        onClick={() => {
                            router.push(`/books/${encodeURIComponent(userBookId)}`);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        title={`Go to ${bookTitle} Book Hub`}
                    >
                        {bookCover ? (
                            <img
                                src={bookCover}
                                alt={`Go to ${bookTitle} Book Hub`}
                                className="h-16 w-11 shrink-0 rounded-md object-cover shadow-sm"
                            />
                        ) : null}

                        <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wide text-stone-500">
                                For book
                            </p>
                            <div className="truncate text-sm font-semibold text-stone-900 hover:text-stone-700">
                                {bookTitle}
                            </div>
                        </div>
                    </button>

                    <div className="flex shrink-0 flex-wrap gap-2">
                        {hasSavedWords ? (
                            <button
                                type="button"
                                onClick={() => {
                                    router.push(`/books/${encodeURIComponent(userBookId)}/words`);
                                }}
                                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
                            >
                                Vocabulary Archive
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => {
                                router.push(`/books/${encodeURIComponent(userBookId)}`);
                            }}
                            className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                        >
                            Book Hub
                        </button>
                    </div>
                </div>
            ) : null}

            <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="space-y-4">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        {nativeModeToggle}

                        {!allowNativeReadListenToggle ? (
                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                                {activeEyebrow}
                            </p>
                        ) : null}

                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
                            <span className={activeModeColor === "violet" ? "text-violet-800" : "text-emerald-800"}>
                                {activeTitle}
                            </span>
                        </h1>

                        <p className="mt-2 text-base font-semibold text-stone-700">
                            {activeSubtitle}
                        </p>

                        <p className="mt-3 text-sm leading-7 text-stone-600">
                            {activeDescription}
                        </p>
                    </div>

                    <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                        <div className="flex justify-center">
                            {bookCover ? (
                                <img
                                    src={bookCover}
                                    alt={`${bookTitle} cover`}
                                    className="h-56 w-36 rounded-2xl object-cover shadow-lg"
                                />
                            ) : (
                                <div className="flex h-56 w-36 items-center justify-center rounded-2xl bg-stone-100 text-sm text-stone-400">
                                    No cover
                                </div>
                            )}
                        </div>
                        {timerPanel}
                    </div>

                    <div className="space-y-3">
                        {saveSessionForm}
                        {progressUpdatePanel}
                    </div>
                </div>
            </section>
        </>
    ) : (
        <>
                <button
                    type="button"
                    onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
                    className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-stone-800"
                >
                    ← {backLabel}
                </button>

                {errorMessage ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                {showFinishedNav && userBookId && bookTitle ? (
                    <div className="mb-4 mt-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                        <button
                            type="button"
                            onClick={() => {
                                router.push(`/books/${encodeURIComponent(userBookId)}`);
                            }}
                            className="flex min-w-0 items-center gap-4 rounded-xl text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400"
                            title={`Go to ${bookTitle} Book Hub`}
                        >
                            {bookCover ? (
                                <img
                                    src={bookCover}
                                    alt={`Go to ${bookTitle} Book Hub`}
                                    className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
                                />
                            ) : null}

                            <div className="min-w-0">
                                <p className="text-xs uppercase tracking-wide text-stone-500">
                                    For book
                                </p>
                                <div className="truncate text-base font-semibold text-stone-900 hover:text-stone-700">
                                    {bookTitle}
                                </div>
                            </div>
                        </button>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                            {hasSavedWords ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        router.push(`/books/${encodeURIComponent(userBookId)}/words`);
                                    }}
                                    className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
                                >
                                    Vocabulary Archive
                                </button>
                            ) : null}

                            <button
                                type="button"
                                onClick={() => {
                                    router.push(`/books/${encodeURIComponent(userBookId)}`);
                                }}
                                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                            >
                                Book Hub
                            </button>
                        </div>
                    </div>
                ) : null}

                <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                    <div className="grid gap-6 p-6 md:grid-cols-[280px_minmax(0,1fr)] md:p-8">
                        <div className="space-y-4">
                            {nativeModeToggle}
                            <div className="flex justify-center">
                                {bookCover ? (
                                    <img
                                        src={bookCover}
                                        alt={`${bookTitle} cover`}
                                        className="h-[28rem] w-72 rounded-2xl object-cover shadow-xl"
                                    />
                                ) : (
                                    <div className="flex h-[28rem] w-72 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                                        No cover
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col justify-center">
                            {!allowNativeReadListenToggle ? (
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                                    {activeEyebrow}
                                </p>
                            ) : null}

                            <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
                                <span className={activeModeColor === "violet" ? "text-violet-800" : "text-emerald-800"}>
                                    {activeTitle}
                                </span>
                            </h1>

                            <p className="mt-2 text-lg font-semibold text-stone-700">
                                {activeSubtitle}
                            </p>

                            <p className="mt-4 text-sm leading-7 text-stone-600">
                                {activeDescription}
                            </p>

                            {timerPanel}

                            {saveSessionForm}
                            {progressUpdatePanel}
                        </div>
                    </div>
                </section>
        </>
    );

    if (embedded) {
        return <div className="space-y-5">{content}</div>;
    }

    return (
        <main className="min-h-screen bg-stone-50 p-6">
            <div className="mx-auto max-w-4xl space-y-5">
                {content}
            </div>
        </main>
    );
}
