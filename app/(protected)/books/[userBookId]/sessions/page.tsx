// Reading Sessions Page
//
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { supabase } from "@/lib/supabaseClient";
import { todayYmdAppTimeZone } from "@/lib/timeZone";

type ProfileRole = "teacher" | "member" | "student" | "super_teacher" | "admin";

type BookRow = {
  title: string | null;
  title_reading: string | null;
  author: string | null;
  cover_url: string | null;
  page_count: number | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  dnf_reason: string | null;
  dnf_note: string | null;
  would_retry: string | null;
  progress_mode: string | null;
  books: BookRow | null;
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

const DNF_REASON_OPTIONS = [
  { value: "", label: "Choose a reason" },
  { value: "too_difficult_right_now", label: "Too difficult right now" },
  { value: "wrong_timing_mood", label: "Wrong timing or mood" },
  { value: "too_much_unknown_vocabulary", label: "Too much unknown vocabulary" },
  { value: "too_dense_slow", label: "Too dense or slow" },
  { value: "lost_interest", label: "Lost interest" },
  { value: "did_not_like_it", label: "Did not like it" },
  { value: "other", label: "Other" },
];

const WOULD_RETRY_OPTIONS = [
  { value: "", label: "Choose retry intent" },
  { value: "yes", label: "Yes, I want to try again" },
  { value: "maybe", label: "Maybe later" },
  { value: "no", label: "No, probably not" },
];

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
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

function formatYmd(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function ReadingSessionsPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params?.userBookId;

  const [loading, setLoading] = useState(true);
  const [accessMessage, setAccessMessage] = useState("");
  const [row, setRow] = useState<UserBookRow | null>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [dnfAt, setDnfAt] = useState("");
  const [dnfReason, setDnfReason] = useState("");
  const [dnfNote, setDnfNote] = useState("");
  const [wouldRetry, setWouldRetry] = useState("");
  const [sessionDate, setSessionDate] = useState(todayYmdAppTimeZone());
  const [sessionMode, setSessionMode] = useState<"fluid" | "curiosity" | "listening">("fluid");
  const [sessionStartPage, setSessionStartPage] = useState("");
  const [sessionEndPage, setSessionEndPage] = useState("");
  const [sessionMinutesRead, setSessionMinutesRead] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const book = row?.books ?? null;
  const usePercentMode = row?.progress_mode === "percent" && !!book?.page_count && book.page_count > 0;
  const useListeningPercentMode = !!book?.page_count && book.page_count > 0;
  const realSessions = useMemo(() => sessions.filter((session) => !session.is_filler), [sessions]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAccessMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user || !userBookId) {
        setAccessMessage("Please sign in to view reading sessions.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading Reading Sessions profile:", profileError);
      }

      const role = (profile?.role as ProfileRole | null) ?? "member";
      const isSuperTeacher = role === "super_teacher" || role === "admin" || isSuperTeacherFlag(profile?.is_super_teacher);

      const { data, error } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          started_at,
          finished_at,
          dnf_at,
          dnf_reason,
          dnf_note,
          would_retry,
          progress_mode,
          books (
            title,
            title_reading,
            author,
            cover_url,
            page_count
          )
        `
        )
        .eq("id", userBookId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error loading Reading Sessions book:", error);
        setAccessMessage("This book could not be found.");
        setLoading(false);
        return;
      }

      if (!data) {
        setAccessMessage("You do not have access to this book.");
        setLoading(false);
        return;
      }

      const loadedRow = data as unknown as UserBookRow;
      let canAccessBook = loadedRow.user_id === user.id || isSuperTeacher;

      if (!canAccessBook && role === "teacher") {
        const { data: teacherStudentLink, error: teacherStudentError } = await supabase
          .from("teacher_students")
          .select("id")
          .eq("teacher_id", user.id)
          .eq("student_id", loadedRow.user_id)
          .limit(1)
          .maybeSingle();

        if (teacherStudentError) {
          console.error("Error checking Reading Sessions teacher access:", teacherStudentError);
        }

        canAccessBook = !!teacherStudentLink;
      }

      if (!canAccessBook) {
        setAccessMessage("You do not have access to this book.");
        setLoading(false);
        return;
      }

      setRow(loadedRow);
      setStartedAt(formatYmd(loadedRow.started_at));
      setFinishedAt(formatYmd(loadedRow.finished_at));
      setDnfAt(formatYmd(loadedRow.dnf_at));
      setDnfReason(loadedRow.dnf_reason ?? "");
      setDnfNote(loadedRow.dnf_note ?? "");
      setWouldRetry(loadedRow.would_retry ?? "");
      await loadSessions(loadedRow.id);

      if (!cancelled) setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  async function loadSessions(id: string) {
    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("id, user_book_id, read_on, start_page, end_page, minutes_read, is_filler, created_at, session_mode")
      .eq("user_book_id", id)
      .order("read_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reading sessions:", error);
      setSessions([]);
      return;
    }

    setSessions((data as ReadingSession[]) ?? []);
  }

  function startEditingSession(session: ReadingSession) {
    setEditingSessionId(session.id);
    setSessionDate(session.read_on);
    setSessionMode(
      session.session_mode === "listening" || session.session_mode === "curiosity"
        ? session.session_mode
        : "fluid"
    );
    setSessionStartPage(session.start_page != null ? String(session.start_page) : "");
    setSessionEndPage(session.end_page != null ? String(session.end_page) : "");
    setSessionMinutesRead(session.minutes_read != null ? String(session.minutes_read) : "");
  }

  function clearForm() {
    setEditingSessionId(null);
    setSessionDate(todayYmdAppTimeZone());
    setSessionMode("fluid");
    setSessionStartPage("");
    setSessionEndPage("");
    setSessionMinutesRead("");
  }

  async function saveSession() {
    if (!row?.id) return;

    const usingPercentMode = row.progress_mode === "percent";
    const usingListeningPercentMode =
      sessionMode === "listening" && book?.page_count != null && book.page_count > 0;
    const endInputIsPercent =
      sessionMode === "listening" ? usingListeningPercentMode : usingPercentMode;
    const parsedStart =
      sessionMode === "listening" || sessionStartPage.trim() === ""
        ? null
        : Number(sessionStartPage);
    const parsedEnd = sessionEndPage.trim() === "" ? null : Number(sessionEndPage);

    const start =
      usingPercentMode && sessionMode !== "listening"
        ? percentToPage(parsedStart, book?.page_count ?? null)
        : parsedStart;
    const end =
      endInputIsPercent
        ? percentToPage(parsedEnd, book?.page_count ?? null)
        : parsedEnd;
    const minutes = sessionMinutesRead.trim() === "" ? null : Number(sessionMinutesRead);

    if (!sessionDate) {
      alert("Please fill in the date.");
      return;
    }

    if (sessionMode !== "listening") {
      if (usingPercentMode && (!book?.page_count || book.page_count <= 0)) {
        alert("Percent progress needs a page count for this book.");
        return;
      }

      if (
        (usingPercentMode && (!Number.isFinite(parsedStart) || !Number.isFinite(parsedEnd))) ||
        (!usingPercentMode && (!Number.isFinite(start) || !Number.isFinite(end)))
      ) {
        alert(usingPercentMode ? "Please fill in start and end percent." : "Please fill in start and end page.");
        return;
      }

      if ((end as number) < (start as number)) {
        alert(usingPercentMode ? "End percent must be greater than or equal to start percent." : "End page must be greater than or equal to start page.");
        return;
      }
    } else if (
      endInputIsPercent &&
      parsedEnd !== null &&
      (!Number.isFinite(parsedEnd) || parsedEnd < 0 || parsedEnd > 100)
    ) {
      alert("Listening end percent must be between 0 and 100 if provided.");
      return;
    }

    if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) {
      alert("Minutes must be greater than 0 if provided.");
      return;
    }

    const payload = {
      user_book_id: row.id,
      read_on: sessionDate,
      start_page: sessionMode === "listening" ? null : start,
      end_page: end,
      minutes_read: minutes,
      session_mode: sessionMode,
    };

    const result = editingSessionId
      ? await supabase
          .from("user_book_reading_sessions")
          .update(payload)
          .eq("id", editingSessionId)
          .eq("user_book_id", row.id)
      : await supabase.from("user_book_reading_sessions").insert(payload);

    if (result.error) {
      console.error("Error saving reading session:", result.error);
      alert(`Could not save reading session.\n${result.error.message || "Unknown error"}`);
      return;
    }

    if (!row.started_at) {
      const { error } = await supabase
        .from("user_books")
        .update({ status: "reading", started_at: sessionDate })
        .eq("id", row.id);

      if (!error) {
        setRow((prev) => (prev ? { ...prev, started_at: sessionDate } : prev));
      }
    }

    await loadSessions(row.id);
    clearForm();
  }

  async function saveBookDates() {
    if (!row?.id) return;

    const started_at = startedAt.trim() || null;
    const finished_at = finishedAt.trim() || null;
    const dnf_at = dnfAt.trim() || null;
    const nextDnfReason = dnf_at && dnfReason.trim() ? dnfReason.trim() : null;
    const nextDnfNote = dnf_at && dnfNote.trim() ? dnfNote.trim() : null;
    const nextWouldRetry = dnf_at && wouldRetry.trim() ? wouldRetry.trim() : null;
    const status = dnf_at
      ? "did_not_finish"
      : finished_at
        ? "finished"
        : started_at
          ? "reading"
          : "what_to_read";

    const { error } = await supabase
      .from("user_books")
      .update({
        status,
        started_at,
        finished_at,
        dnf_at,
        dnf_reason: nextDnfReason,
        dnf_note: nextDnfNote,
        would_retry: nextWouldRetry,
      })
      .eq("id", row.id);

    if (error) {
      console.error("Error saving book dates:", error);
      alert(`Could not save book dates.\n${error.message || "Unknown error"}`);
      return;
    }

    setRow((prev) =>
      prev
        ? {
            ...prev,
            started_at,
            finished_at,
            dnf_at,
            dnf_reason: nextDnfReason,
            dnf_note: nextDnfNote,
            would_retry: nextWouldRetry,
          }
        : prev
    );
    setDnfReason(nextDnfReason ?? "");
    setDnfNote(nextDnfNote ?? "");
    setWouldRetry(nextWouldRetry ?? "");
  }

  async function deleteSession(id: string) {
    const ok = window.confirm("Delete this reading session?");
    if (!ok || !row?.id) return;

    const { error } = await supabase
      .from("user_book_reading_sessions")
      .delete()
      .eq("id", id)
      .eq("user_book_id", row.id);

    if (error) {
      console.error("Error deleting reading session:", error);
      alert(`Could not delete reading session.\n${error.message || "Unknown error"}`);
      return;
    }

    await loadSessions(row.id);
  }

  function sessionProgressLabel(session: ReadingSession) {
    if (session.session_mode === "listening") {
      if (session.end_page == null) return "Listening session";
      const percent = pageToPercent(session.end_page, book?.page_count ?? null);
      return percent != null ? `Listening · up to ${percent}%` : `Listening · up to p. ${session.end_page}`;
    }

    if (session.start_page == null || session.end_page == null) return "Pages not recorded";
    return usePercentMode
      ? `${pageToPercent(session.start_page, book?.page_count ?? null)}% -> ${pageToPercent(session.end_page, book?.page_count ?? null)}%`
      : `p. ${session.start_page} -> ${session.end_page}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-600">Loading reading sessions...</p>
        </div>
      </main>
    );
  }

  if (!row) {
    return (
      <AccessDeniedMessage
        message={accessMessage || "You do not have access to these reading sessions."}
        backHref={userBookId ? `/books/${userBookId}` : "/books"}
        backLabel="Back to Book Hub"
      />
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link
          href={`/books/${row.id}`}
          className="inline-flex text-sm font-semibold text-stone-500 hover:text-stone-900"
        >
          &larr; Back to Book Hub
        </Link>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
            Reading Sessions
          </p>
          <h1 className="mt-1 text-3xl font-black text-stone-950">
            {book?.title ?? "Untitled book"}
          </h1>
          {book?.author ? (
            <p className="mt-1 text-sm font-semibold text-stone-600">{book.author}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 text-sm font-semibold text-stone-900">Book Dates</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="rounded border bg-white p-3 text-sm">
              <span className="block text-stone-600">Start Date</span>
              <input
                type="date"
                value={startedAt}
                onChange={(event) => setStartedAt(event.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <label className="rounded border bg-white p-3 text-sm">
              <span className="block text-stone-600">Finish Date</span>
              <input
                type="date"
                value={finishedAt}
                onChange={(event) => setFinishedAt(event.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <label className="rounded border bg-white p-3 text-sm">
              <span className="block text-stone-600">DNF Date</span>
              <input
                type="date"
                value={dnfAt}
                onChange={(event) => setDnfAt(event.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void saveBookDates()}
            className="mt-3 rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
          >
            Save Book Dates
          </button>

          {dnfAt ? (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-stone-900">DNF reason</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  This helps separate “not right now” from “not for me.”
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                    Reason
                  </span>
                  <select
                    value={dnfReason}
                    onChange={(event) => setDnfReason(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
                  >
                    {DNF_REASON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                    Try again?
                  </span>
                  <select
                    value={wouldRetry}
                    onChange={(event) => setWouldRetry(event.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
                  >
                    {WOULD_RETRY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Note
                </span>
                <textarea
                  value={dnfNote}
                  onChange={(event) => setDnfNote(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-stone-900"
                  placeholder="Optional note about why you stopped."
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 text-sm font-semibold text-stone-900">
            {editingSessionId ? "Edit Reading Session" : "Log Reading Session"}
          </div>
          <p className="mb-4 text-sm leading-6 text-stone-500">
            Timers are still the best way to track new reading and listening. Use this page to edit session records or add a missed session when needed.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="rounded border bg-white p-3 text-sm">
              <span className="block text-stone-600">Session Type</span>
              <select
                value={sessionMode}
                onChange={(event) => setSessionMode(event.target.value as "fluid" | "curiosity" | "listening")}
                className="mt-1 w-full rounded border px-2 py-1"
              >
                <option value="fluid">Fluid Reading</option>
                <option value="curiosity">Curiosity Reading</option>
                <option value="listening">{useListeningPercentMode ? "Listening (%)" : "Listening"}</option>
              </select>
            </label>

            <label className="rounded border bg-white p-3 text-sm">
              <span className="block text-stone-600">Date</span>
              <input
                type="date"
                value={sessionDate}
                onChange={(event) => setSessionDate(event.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>

            <label className="rounded border bg-white p-3 text-sm">
              <span className="block text-stone-600">
                {sessionMode === "listening" ? "Minutes listened" : "Minutes read"}
              </span>
              <input
                type="number"
                min={1}
                value={sessionMinutesRead}
                onChange={(event) => setSessionMinutesRead(event.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
                placeholder="e.g. 25"
              />
            </label>

            {sessionMode !== "listening" ? (
              <>
                <label className="rounded border bg-white p-3 text-sm">
                  <span className="block text-stone-600">
                    {usePercentMode ? "Start percent" : "Start page"}
                  </span>
                  <input
                    type="number"
                    min={usePercentMode ? 0 : 1}
                    max={usePercentMode ? 100 : undefined}
                    value={sessionStartPage}
                    onChange={(event) => setSessionStartPage(event.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1"
                  />
                </label>

                <label className="rounded border bg-white p-3 text-sm">
                  <span className="block text-stone-600">
                    {usePercentMode ? "End percent" : "End page"}
                  </span>
                  <input
                    type="number"
                    min={usePercentMode ? 0 : 1}
                    max={usePercentMode ? 100 : undefined}
                    value={sessionEndPage}
                    onChange={(event) => setSessionEndPage(event.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1"
                  />
                </label>
              </>
            ) : (
              <label className="rounded border bg-white p-3 text-sm">
                <span className="block text-stone-600">
                  {useListeningPercentMode ? "Listening end percent (optional)" : "Listening end page (optional)"}
                </span>
                <input
                  type="number"
                  min={useListeningPercentMode ? 0 : 1}
                  max={useListeningPercentMode ? 100 : undefined}
                  value={sessionEndPage}
                  onChange={(event) => setSessionEndPage(event.target.value)}
                  className="mt-1 w-full rounded border px-2 py-1"
                />
              </label>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveSession()}
              className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              {editingSessionId ? "Update Session" : "Save Session"}
            </button>
            {editingSessionId ? (
              <button
                type="button"
                onClick={clearForm}
                className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 text-sm font-semibold text-stone-900">Reading Session History</div>

          {realSessions.length === 0 ? (
            <p className="text-sm text-stone-500">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {realSessions.map((session) => {
                const pagesRead =
                  session.start_page != null && session.end_page != null
                    ? session.end_page - session.start_page + 1
                    : null;

                return (
                  <div key={session.id} className="rounded-xl border bg-white p-3 text-sm text-stone-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{session.read_on}</div>
                        <div className="mt-1">{sessionProgressLabel(session)}</div>
                        <div className="mt-1 text-stone-500">
                          {session.minutes_read != null ? `${session.minutes_read} min` : "Untimed"}
                          {pagesRead != null ? ` · ${pagesRead} pages` : ""}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingSession(session)}
                          className="rounded bg-stone-200 px-2 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSession(session.id)}
                          className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
