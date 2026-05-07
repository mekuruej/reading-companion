// Simple Timed Session Page
//

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SessionMode = "fluid" | "listening";

type SimpleTimedSessionPageProps = {
    sessionMode: SessionMode;
    eyebrow: string;
    title: string;
    subtitle: string;
    description: string;
    saveSuccessMessage: string;
    backLabel?: string;
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

export default function SimpleTimedSessionPage({
    sessionMode,
    eyebrow,
    title,
    subtitle,
    description,
    saveSuccessMessage,
    backLabel = "Back to Book Hub",
}: SimpleTimedSessionPageProps) {
    const router = useRouter();
    const params = useParams<{ userBookId: string }>();
    const userBookId = params.userBookId;

    const [loading, setLoading] = useState(true);
    const [bookTitle, setBookTitle] = useState("");
    const [bookCover, setBookCover] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

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

    useEffect(() => {
        let cancelled = false;

        async function loadBook() {
            if (!userBookId) return;

            setLoading(true);
            setErrorMessage("");

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (cancelled) return;

            if (userError || !user) {
                setErrorMessage("Please sign in.");
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("user_books")
                .select(`
          id,
          books (
            title,
            cover_url
          )
        `)
                .eq("id", userBookId)
                .single();

            if (cancelled) return;

            if (error) {
                console.error("Error loading timed session book:", error);
                setErrorMessage("Could not load this book.");
                setLoading(false);
                return;
            }

            const book = Array.isArray((data as any)?.books)
                ? (data as any).books[0]
                : (data as any)?.books;

            setBookTitle(book?.title ?? "Untitled book");
            setBookCover(book?.cover_url ?? "");
            setLoading(false);
        }

        loadBook();

        return () => {
            cancelled = true;
        };
    }, [userBookId]);

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
            setShowTimedSessionForm(true);
            return;
        }

        const latest = data?.[0];
        const nextStart =
            latest?.end_page != null && Number.isFinite(Number(latest.end_page))
                ? String(Number(latest.end_page) + 1)
                : "";

        setSessionStartPage(nextStart);
        setSessionEndPage(nextStart);
        setShowTimedSessionForm(true);
    }

    async function saveTimedSession() {
        if (!userBookId) return;

        const trimmedStartPage = sessionStartPage.trim();
        const trimmedEndPage = sessionEndPage.trim();
        const hasAnyPageInput = trimmedStartPage !== "" || trimmedEndPage !== "";

        let startPageNum: number | null = null;
        let endPageNum: number | null = null;

        if (hasAnyPageInput) {
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

        const readOn = sessionDate || new Date().toISOString().slice(0, 10);

        const { error } = await supabase.from("user_book_reading_sessions").insert({
            user_book_id: userBookId,
            read_on: readOn,
            start_page: startPageNum,
            end_page: endPageNum,
            minutes_read: minutesNum,
            session_mode: sessionMode,
        });

        if (error) {
            console.error("Error saving timed session:", error);
            alert(`Could not save timed session.\n${error.message}`);
            return;
        }

        setShowTimedSessionForm(false);
        setElapsed(0);
        setStartTime(null);
        setIsRunning(false);
        setIsPaused(false);
        setSessionMinutesRead("");
        setTimerSaveMessage(saveSuccessMessage);

        setTimeout(() => {
            setTimerSaveMessage("");
        }, 4000);
    }

    function startTimer() {
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
    }

    function pauseTimer() {
        if (startTime) {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }

        setIsRunning(false);
        setIsPaused(true);
    }

    function resumeTimer() {
        setStartTime(Date.now() - elapsed * 1000);
        setIsRunning(true);
        setIsPaused(false);
    }

    function finishTimer() {
        if (startTime) {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }

        setIsRunning(false);
        setIsPaused(false);
        setHasFinishedTimer(true);
        void openTimedSessionFormWithDefaults();
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-50 p-6">
                <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
                    Loading...
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50 p-6">
            <div className="mx-auto max-w-4xl space-y-5">
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

                <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                    <div className="grid gap-6 p-6 md:grid-cols-[280px_minmax(0,1fr)] md:p-8">
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

                        <div className="flex flex-col justify-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                                {eyebrow}
                            </p>

                            <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
                                {title}
                            </h1>

                            <p className="mt-2 text-lg font-semibold text-stone-700">
                                {subtitle}
                            </p>

                            <p className="mt-4 text-sm leading-7 text-stone-600">
                                {description}
                            </p>

                            <div className="mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-5 text-center">
                                <div className="text-sm font-medium text-stone-500">Timer</div>
                                <div className="mt-2 text-6xl font-black tracking-tight text-stone-900">
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

                            {showTimedSessionForm && !isRunning ? (
                                <div className="mt-5 rounded-3xl border border-stone-300 bg-white p-5">
                                    <div className="mb-3 text-sm font-semibold text-stone-800">
                                        Save this session
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <div className="mb-1 text-sm text-stone-600">Start page optional</div>
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
                                            <div className="mb-1 text-sm text-stone-600">End page optional</div>
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

                                    <div className="mt-3 space-y-1 text-sm text-stone-500">
                                        <div>Time: {formatTimer(elapsed)}</div>
                                        <div className="text-xs">
                                            Page numbers are optional. If you leave them blank, only the time will be saved. Pace stats can only be generated with page numbers.
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
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}