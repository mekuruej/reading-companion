// Teacher Students
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileRole = "teacher" | "super_teacher" | "member" | "student" | string | null;
type StudentRelationshipStatus = "future" | "current" | "past";

type StudentProfile = {
    id: string;
    display_name: string | null;
    username: string | null;
    level: string | null;
    role: ProfileRole;
    lesson_day: string | null;
    app_access_type: string | null;
    app_access_expires_at: string | null;
};

type TeacherStudentLink = {
    teacher_id?: string | null;
    student_id?: string | null;
    relationship_status?: string | null;
    student_status?: string | null;
    status?: string | null;
};

type UserBookRow = {
    id: string;
    user_id: string;
    started_at: string | null;
    finished_at: string | null;
    dnf_at: string | null;
    assigned_from_prep_at: string | null;
    source_user_book_id: string | null;
    books:
    | {
        id: string;
        title: string | null;
        cover_url: string | null;
        book_type: string | null;
    }
    | {
        id: string;
        title: string | null;
        cover_url: string | null;
        book_type: string | null;
    }[]
    | null;
};

type StudentCard = StudentProfile & {
    relationshipStatus: StudentRelationshipStatus;
    currentBookTitle: string | null;
    currentBookCoverUrl: string | null;
    currentBookId: string | null;
    totalBooks: number;
    assignedPrepCount: number;
    lastEngagedAt: string | null;
};

type TaskBookOption = {
    id: string;
    userId: string;
    title: string;
};

type RereadTaskMode =
    | "reader_choice"
    | "fluid_reading_saved_words"
    | "curiosity_reading"
    | "just_reading";

const REREAD_TASK_MODE_OPTIONS: { value: RereadTaskMode; label: string }[] = [
    { value: "fluid_reading_saved_words", label: "Fluid Reading with Saved Word Support" },
    { value: "curiosity_reading", label: "Curiosity Reading" },
    { value: "just_reading", label: "Just Reading" },
    { value: "reader_choice", label: "Reader’s choice / Book Hub" },
];

function getBook(bookRow: UserBookRow["books"]) {
    if (Array.isArray(bookRow)) return bookRow[0] ?? null;
    return bookRow ?? null;
}

function formatLessonDay(value: string | null) {
    if (!value) return "No lesson day";
    return value;
}

function formatRelativeDate(dateStr: string | null) {
    if (!dateStr) return "No recent activity";

    const d = new Date(dateStr);
    const now = new Date();

    if (Number.isNaN(d.getTime())) return "No recent activity";

    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return d.toLocaleDateString();
}

function isStudentProfile(profile: StudentProfile) {
    const isStudentRole = profile.role === "member" || profile.role === "student";

    return isStudentRole;
}

function getStudentRelationshipStatus(profile: StudentProfile): StudentRelationshipStatus {
    const expiresAt = profile.app_access_expires_at
        ? new Date(profile.app_access_expires_at)
        : null;
    const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;

    if (isExpired) return "past";
    if (profile.app_access_type === "trial") return "future";

    return "current";
}

function normalizeRelationshipStatus(value: string | null | undefined): StudentRelationshipStatus | null {
    const normalized = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

    if (
        normalized === "future" ||
        normalized === "prospective" ||
        normalized === "trial" ||
        normalized === "invited" ||
        normalized === "upcoming"
    ) {
        return "future";
    }

    if (
        normalized === "past" ||
        normalized === "former" ||
        normalized === "archived" ||
        normalized === "inactive" ||
        normalized === "complete" ||
        normalized === "completed"
    ) {
        return "past";
    }

    if (normalized === "current" || normalized === "active") {
        return "current";
    }

    return null;
}

function getLinkRelationshipStatus(link: TeacherStudentLink | null | undefined) {
    return (
        normalizeRelationshipStatus(link?.relationship_status) ??
        normalizeRelationshipStatus(link?.student_status) ??
        normalizeRelationshipStatus(link?.status)
    );
}

function relationshipLabel(status: StudentRelationshipStatus) {
    if (status === "future") return "Future";
    if (status === "past") return "Past";
    return "Current";
}

function relationshipClasses(status: StudentRelationshipStatus) {
    if (status === "future") return "border-sky-200 bg-sky-50 text-sky-800";
    if (status === "past") return "border-stone-200 bg-stone-100 text-stone-500";
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function StudentCardArticle({ student }: { student: StudentCard }) {
    const displayName = student.display_name || student.username || "Unnamed student";

    return (
        <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-3xl font-black text-stone-500">
                        {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-2xl font-black leading-tight text-stone-900">
                                    {displayName}
                                </h3>

                                {student.username ? (
                                    <p className="mt-1 text-base text-stone-500">
                                        @{student.username}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <span
                                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${relationshipClasses(
                                        student.relationshipStatus
                                    )}`}
                                >
                                    {relationshipLabel(student.relationshipStatus)}
                                </span>
                                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-stone-500">
                                    {student.level || "No level"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                            Lesson
                        </p>
                        <p className="mt-2 text-lg font-medium text-stone-700">
                            {formatLessonDay(student.lesson_day)}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                            Last engaged
                        </p>
                        <p className="mt-2 text-lg font-medium text-stone-700">
                            {formatRelativeDate(student.lastEngagedAt)}
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                        Current / recent book
                    </p>

                    {student.currentBookTitle ? (
                        <div className="mt-3 flex items-center gap-4">
                            {student.currentBookCoverUrl ? (
                                <img
                                    src={student.currentBookCoverUrl}
                                    alt=""
                                    className="h-20 w-14 rounded object-cover"
                                />
                            ) : (
                                <div className="h-20 w-14 rounded bg-stone-100" />
                            )}

                            <div className="min-w-0">
                                <p className="truncate text-lg font-semibold text-stone-800">
                                    {student.currentBookTitle}
                                </p>
                                <p className="mt-1 text-sm text-stone-500">
                                    {student.totalBooks} library{" "}
                                    {student.totalBooks === 1 ? "book" : "books"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-stone-500">
                            No books in this student’s library yet.
                        </p>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {student.username ? (
                        <Link
                            href={`/users/${student.username}/books`}
                            className="rounded-2xl border border-stone-900 bg-stone-900 px-4 py-3 text-center text-base font-semibold text-white hover:bg-black"
                        >
                            Library
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base font-semibold text-stone-400"
                        >
                            No username
                        </button>
                    )}

                    {student.currentBookId ? (
                        <Link
                            href={`/books/${student.currentBookId}`}
                            className="rounded-2xl border border-emerald-700 bg-emerald-700 px-4 py-3 text-center text-base font-semibold text-white hover:bg-emerald-800"
                        >
                            Book Hub
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base font-semibold text-stone-400"
                        >
                            No Book Hub
                        </button>
                    )}

                    <button
                        type="button"
                        disabled
                        className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base font-semibold text-stone-400"
                    >
                        Notes later
                    </button>

                    <button
                        type="button"
                        disabled
                        className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base font-semibold text-stone-400"
                    >
                        Stats later
                    </button>
                </div>
            </div>
        </article>
    );
}

export default function TeacherStudentsPage() {
    const [loading, setLoading] = useState(true);
    const [canAccess, setCanAccess] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [students, setStudents] = useState<StudentCard[]>([]);
    const [taskBooksByStudentId, setTaskBooksByStudentId] = useState<
        Record<string, TaskBookOption[]>
    >({});
    const [error, setError] = useState<string | null>(null);
    const [taskLearnerId, setTaskLearnerId] = useState("");
    const [taskUserBookId, setTaskUserBookId] = useState("");
    const [taskTitle, setTaskTitle] = useState("Reread today’s lesson pages");
    const [taskInstructions, setTaskInstructions] = useState(
        "Reread using Fluid Reading with Saved Word Support."
    );
    const [taskPageStart, setTaskPageStart] = useState("");
    const [taskPageEnd, setTaskPageEnd] = useState("");
    const [taskReadingMode, setTaskReadingMode] =
        useState<RereadTaskMode>("fluid_reading_saved_words");
    const [taskSaving, setTaskSaving] = useState(false);
    const [taskMessage, setTaskMessage] = useState<string | null>(null);

    async function loadStudents() {
        setLoading(true);
        setError(null);

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) throw userError;

            if (!user) {
                setCanAccess(false);
                setCurrentUserId(null);
                setStudents([]);
                setError("Please sign in.");
                return;
            }

            setCurrentUserId(user.id);

            const { data: meProfile, error: meProfileError } = await supabase
                .from("profiles")
                .select("id, display_name, username, level, role, lesson_day, is_super_teacher")
                .eq("id", user.id)
                .maybeSingle();

            if (meProfileError) throw meProfileError;

            const isTeacher =
                meProfile?.role === "teacher" ||
                meProfile?.role === "super_teacher" ||
                !!meProfile?.is_super_teacher;

            setCanAccess(isTeacher);

            if (!isTeacher) {
                setStudents([]);
                return;
            }

            let studentProfiles: StudentProfile[] = [];
            const relationshipStatusByStudentId = new Map<string, StudentRelationshipStatus>();

            if (meProfile?.role === "super_teacher" || meProfile?.is_super_teacher) {
                const { data: links, error: linksError } = await supabase
                    .from("teacher_students")
                    .select("*");

                if (linksError) throw linksError;

                const studentIds = Array.from(
                    new Set(
                        ((links ?? []) as TeacherStudentLink[])
                            .map((row) => row.student_id)
                            .filter(Boolean) as string[]
                    )
                );

                for (const link of (links ?? []) as TeacherStudentLink[]) {
                    const studentId = link.student_id;
                    if (!studentId || relationshipStatusByStudentId.has(studentId)) continue;

                    const status = getLinkRelationshipStatus(link);
                    if (status) relationshipStatusByStudentId.set(studentId, status);
                }

                if (studentIds.length > 0) {
                    const { data: linkedProfiles, error: linkedProfilesError } = await supabase
                        .from("profiles")
                        .select("id, display_name, username, level, role, lesson_day, app_access_type, app_access_expires_at")
                        .in("id", studentIds)
                        .order("display_name", { ascending: true });

                    if (linkedProfilesError) throw linkedProfilesError;

                    studentProfiles = ((linkedProfiles ?? []) as StudentProfile[]).filter(
                        (profile) => profile.id !== user.id && isStudentProfile(profile)
                    );
                } else {
                    const { data: allProfiles, error: allProfilesError } = await supabase
                        .from("profiles")
                        .select("id, display_name, username, level, role, lesson_day, app_access_type, app_access_expires_at")
                        .order("display_name", { ascending: true });

                    if (allProfilesError) throw allProfilesError;

                    studentProfiles = ((allProfiles ?? []) as StudentProfile[]).filter(
                        (profile) => profile.id !== user.id && isStudentProfile(profile)
                    );
                }
            } else {
                const { data: links, error: linksError } = await supabase
                    .from("teacher_students")
                    .select("*")
                    .eq("teacher_id", user.id);

                if (linksError) throw linksError;

                const studentIds = Array.from(
                    new Set(
                        ((links ?? []) as TeacherStudentLink[])
                            .map((row) => row.student_id)
                            .filter(Boolean) as string[]
                    )
                );

                for (const link of (links ?? []) as TeacherStudentLink[]) {
                    const studentId = link.student_id;
                    if (!studentId) continue;

                    const status = getLinkRelationshipStatus(link);
                    if (status) relationshipStatusByStudentId.set(studentId, status);
                }

                if (studentIds.length > 0) {
                    const { data: linkedProfiles, error: linkedProfilesError } = await supabase
                        .from("profiles")
                        .select("id, display_name, username, level, role, lesson_day, app_access_type, app_access_expires_at")
                        .in("id", studentIds)
                        .order("display_name", { ascending: true });

                    if (linkedProfilesError) throw linkedProfilesError;

                    studentProfiles = ((linkedProfiles ?? []) as StudentProfile[]).filter(
                        (profile) => isStudentProfile(profile)
                    );
                }
            }

            if (studentProfiles.length === 0) {
                setStudents([]);
                return;
            }

            const studentIds = studentProfiles.map((student) => student.id);

            const { data: userBooks, error: userBooksError } = await supabase
                .from("user_books")
                .select(
                    `
          id,
          user_id,
          started_at,
          finished_at,
          dnf_at,
          assigned_from_prep_at,
          source_user_book_id,
          books:book_id (
            id,
            title,
            cover_url,
            book_type
          )
        `
                )
                .in("user_id", studentIds)
                .order("created_at", { ascending: false });

            if (userBooksError) throw userBooksError;

            const booksByStudentId = new Map<string, UserBookRow[]>();
            const nextTaskBookOptions: Record<string, TaskBookOption[]> = {};

            for (const row of (userBooks ?? []) as UserBookRow[]) {
                const existing = booksByStudentId.get(row.user_id) ?? [];
                existing.push(row);
                booksByStudentId.set(row.user_id, existing);

                const book = getBook(row.books);
                if (book?.title) {
                    const options = nextTaskBookOptions[row.user_id] ?? [];
                    options.push({
                        id: row.id,
                        userId: row.user_id,
                        title: book.title,
                    });
                    nextTaskBookOptions[row.user_id] = options;
                }
            }

            setTaskBooksByStudentId(nextTaskBookOptions);

            const userBookIds = ((userBooks ?? []) as UserBookRow[]).map((row) => row.id);

            const lastEngagedByUserBookId = new Map<string, string>();

            if (userBookIds.length > 0) {
                const { data: sessions, error: sessionsError } = await supabase
                    .from("user_book_reading_sessions")
                    .select("user_book_id, read_on")
                    .in("user_book_id", userBookIds)
                    .order("read_on", { ascending: false });

                if (sessionsError) {
                    console.error("Error loading student reading sessions:", sessionsError);
                }

                for (const session of sessions ?? []) {
                    const userBookId = (session as any).user_book_id as string;
                    const readOn = (session as any).read_on as string | null;
                    if (!userBookId || !readOn) continue;

                    if (!lastEngagedByUserBookId.has(userBookId)) {
                        lastEngagedByUserBookId.set(userBookId, readOn);
                    }
                }
            }

            const nextCards: StudentCard[] = studentProfiles.map((student) => {
                const books = booksByStudentId.get(student.id) ?? [];

                const currentBook =
                    books.find((row) => row.started_at && !row.finished_at && !row.dnf_at) ??
                    books[0] ??
                    null;

                const currentBookData = currentBook ? getBook(currentBook.books) : null;

                const lastEngagedAt = books
                    .map((row) => lastEngagedByUserBookId.get(row.id) ?? null)
                    .filter(Boolean)
                    .sort((a, b) => String(b).localeCompare(String(a)))[0] ?? null;

                return {
                    ...student,
                    relationshipStatus:
                        relationshipStatusByStudentId.get(student.id) ??
                        getStudentRelationshipStatus(student),
                    currentBookTitle: currentBookData?.title ?? null,
                    currentBookCoverUrl: currentBookData?.cover_url ?? null,
                    currentBookId: currentBook?.id ?? null,
                    totalBooks: books.length,
                    assignedPrepCount: books.filter((row) => !!row.assigned_from_prep_at).length,
                    lastEngagedAt,
                };
            });

            nextCards.sort((a, b) => {
                const aName = a.display_name || a.username || "";
                const bName = b.display_name || b.username || "";
                return aName.localeCompare(bName);
            });

            setStudents(nextCards);
        } catch (err: any) {
            console.error("Error loading teacher students:", err);
            setError(err?.message ?? "Could not load students.");
            setStudents([]);
            setTaskBooksByStudentId({});
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadStudents();
    }, []);

    useEffect(() => {
        if (students.length === 0) return;
        if (taskLearnerId && students.some((student) => student.id === taskLearnerId)) return;

        const firstCurrentStudent =
            students.find((student) => student.relationshipStatus === "current") ?? students[0];

        setTaskLearnerId(firstCurrentStudent.id);
        setTaskUserBookId(firstCurrentStudent.currentBookId ?? "");
    }, [students, taskLearnerId]);

    useEffect(() => {
        if (!taskLearnerId) {
            setTaskUserBookId("");
            return;
        }

        const options = taskBooksByStudentId[taskLearnerId] ?? [];
        if (!taskUserBookId || !options.some((book) => book.id === taskUserBookId)) {
            setTaskUserBookId(options[0]?.id ?? "");
        }
    }, [taskBooksByStudentId, taskLearnerId, taskUserBookId]);

    async function createRereadTask() {
        setTaskMessage(null);

        if (!currentUserId) {
            setTaskMessage("Please sign in again.");
            return;
        }

        if (!taskLearnerId) {
            setTaskMessage("Choose a learner.");
            return;
        }

        const cleanTitle = taskTitle.trim();
        if (!cleanTitle) {
            setTaskMessage("Add a task title.");
            return;
        }

        const cleanInstructions = taskInstructions.trim();
        const pageStart =
            taskPageStart.trim() === "" ? null : Number(taskPageStart.trim());
        const pageEnd = taskPageEnd.trim() === "" ? null : Number(taskPageEnd.trim());

        if (
            (pageStart != null && (!Number.isFinite(pageStart) || pageStart <= 0)) ||
            (pageEnd != null && (!Number.isFinite(pageEnd) || pageEnd <= 0))
        ) {
            setTaskMessage("Page numbers should be positive numbers.");
            return;
        }

        if ((pageStart == null) !== (pageEnd == null)) {
            setTaskMessage("Use both page fields, or leave both blank.");
            return;
        }

        if (pageStart != null && pageEnd != null && pageEnd < pageStart) {
            setTaskMessage("End page cannot be before start page.");
            return;
        }

        const taskPayload: Record<string, unknown> = {
            mode: taskReadingMode,
        };

        if (pageStart != null && pageEnd != null) {
            taskPayload.page_start = pageStart;
            taskPayload.page_end = pageEnd;
        }

        setTaskSaving(true);

        try {
            const { error: insertError } = await supabase.from("learning_tasks").insert({
                created_by: currentUserId,
                learner_id: taskLearnerId,
                user_book_id: taskUserBookId || null,
                task_type: "reread_pages",
                title: cleanTitle,
                instructions: cleanInstructions || null,
                task_payload: taskPayload,
                status: "assigned",
            });

            if (insertError) throw insertError;

            setTaskMessage("Learning task created.");
            setTaskPageStart("");
            setTaskPageEnd("");
        } catch (err: any) {
            console.error("Error creating learning task:", err);
            setTaskMessage(err?.message ?? "Could not create learning task.");
        } finally {
            setTaskSaving(false);
        }
    }

    const summary = useMemo(() => {
        return {
            totalStudents: students.length,
            futureStudents: students.filter((student) => student.relationshipStatus === "future").length,
            currentStudents: students.filter((student) => student.relationshipStatus === "current").length,
            pastStudents: students.filter((student) => student.relationshipStatus === "past").length,
            activeReaders: students.filter((student) => !!student.currentBookId).length,
            assignedPrepBooks: students.reduce(
                (total, student) => total + student.assignedPrepCount,
                0
            ),
            withRecentActivity: students.filter((student) => !!student.lastEngagedAt).length,
        };
    }, [students]);

    const groupedStudents = useMemo(() => {
        return {
            future: students.filter((student) => student.relationshipStatus === "future"),
            current: students.filter((student) => student.relationshipStatus === "current"),
            past: students.filter((student) => student.relationshipStatus === "past"),
        };
    }, [students]);

    return (
        <main className="mx-auto max-w-6xl px-4 py-8">
            <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                            Teacher Workspace
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
                            My Students
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                            Choose a learner, open their library, check assigned books, and eventually
                            keep lesson notes and student-specific reading stats in one place.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/teacher/assign"
                            className="rounded-2xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                        >
                            Assign Book
                        </Link>

                        <Link
                            href="/teacher"
                            className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                        >
                            ← Teacher Home
                        </Link>
                    </div>
                </div>
            </section>

            {loading ? (
                <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
                    Loading students…
                </section>
            ) : !canAccess ? (
                <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
                    This page is only available to teachers.
                </section>
            ) : (
                <>
                    {error ? (
                        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </section>
                    ) : null}

                    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                            <p className="text-xs text-emerald-700">Current students</p>
                            <p className="mt-1 text-2xl font-black text-stone-900">
                                {summary.currentStudents}
                            </p>
                            <p className="mt-1 text-xs text-emerald-700">Active teacher relationships.</p>
                        </div>

                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
                            <p className="text-xs text-sky-700">Future students</p>
                            <p className="mt-1 text-2xl font-black text-emerald-900">
                                {summary.futureStudents}
                            </p>
                            <p className="mt-1 text-xs text-sky-700">Trials, prep, and upcoming learners.</p>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                            <p className="text-xs text-amber-700">Assigned prep books</p>
                            <p className="mt-1 text-2xl font-black text-amber-900">
                                {summary.assignedPrepBooks}
                            </p>
                            <p className="mt-1 text-xs text-amber-700">Books assigned from prep.</p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-stone-500">Past students</p>
                            <p className="mt-1 text-2xl font-black text-stone-900">
                                {summary.pastStudents}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">Archived or expired access.</p>
                        </div>
                    </section>

                    <section className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                    Learning Tasks
                                </p>
                                <h2 className="mt-1 text-lg font-black text-stone-900">
                                    Create a reread task
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-stone-600">
                                    A small manual task for a learner. For now, tasks appear on the learner’s Library page.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <label className="grid gap-1 text-sm font-semibold text-stone-700">
                                Learner
                                <select
                                    value={taskLearnerId}
                                    onChange={(event) => setTaskLearnerId(event.target.value)}
                                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                                >
                                    {students.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.display_name || student.username || "Unnamed learner"}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="grid gap-1 text-sm font-semibold text-stone-700">
                                Linked book
                                <select
                                    value={taskUserBookId}
                                    onChange={(event) => setTaskUserBookId(event.target.value)}
                                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                                >
                                    <option value="">No linked book</option>
                                    {(taskBooksByStudentId[taskLearnerId] ?? []).map((book) => (
                                        <option key={book.id} value={book.id}>
                                            {book.title}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="grid gap-1 text-sm font-semibold text-stone-700 lg:col-span-2">
                                Reading type
                                <select
                                    value={taskReadingMode}
                                    onChange={(event) =>
                                        setTaskReadingMode(event.target.value as RereadTaskMode)
                                    }
                                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                                >
                                    {REREAD_TASK_MODE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="grid gap-1 text-sm font-semibold text-stone-700 lg:col-span-2">
                                Title
                                <input
                                    value={taskTitle}
                                    onChange={(event) => setTaskTitle(event.target.value)}
                                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                                />
                            </label>

                            <label className="grid gap-1 text-sm font-semibold text-stone-700 lg:col-span-2">
                                Instructions
                                <textarea
                                    value={taskInstructions}
                                    onChange={(event) => setTaskInstructions(event.target.value)}
                                    rows={3}
                                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                                />
                            </label>

                            <label className="grid gap-1 text-sm font-semibold text-stone-700">
                                Start page
                                <input
                                    value={taskPageStart}
                                    onChange={(event) => setTaskPageStart(event.target.value)}
                                    inputMode="numeric"
                                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                                    placeholder="Optional"
                                />
                            </label>

                            <label className="grid gap-1 text-sm font-semibold text-stone-700">
                                End page
                                <input
                                    value={taskPageEnd}
                                    onChange={(event) => setTaskPageEnd(event.target.value)}
                                    inputMode="numeric"
                                    className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-sm font-normal text-stone-900"
                                    placeholder="Optional"
                                />
                            </label>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={createRereadTask}
                                disabled={taskSaving || students.length === 0}
                                className="rounded-2xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50"
                            >
                                {taskSaving ? "Creating..." : "Create Task"}
                            </button>

                            {taskMessage ? (
                                <p className="text-sm font-medium text-emerald-900">{taskMessage}</p>
                            ) : null}
                        </div>
                    </section>

                    <section className="mt-8">
                        <div className="mb-3">
                            <h2 className="text-lg font-black text-stone-900">Student List</h2>
                            <p className="mt-1 text-sm text-stone-500">
                                View a student’s library, assign books, and check their reading setup from one place.
                            </p>
                        </div>

                        {students.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                                <p className="text-lg font-black text-stone-900">No linked students yet.</p>
                                <p className="mt-2 text-sm text-stone-500">
                                    Students linked to your teacher account will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {([
                                    {
                                        key: "future",
                                        title: "Future Students",
                                        detail: "Trial, prep, and upcoming learners.",
                                        items: groupedStudents.future,
                                    },
                                    {
                                        key: "current",
                                        title: "Current Students",
                                        detail: "Learners you are actively working with now.",
                                        items: groupedStudents.current,
                                    },
                                    {
                                        key: "past",
                                        title: "Past Students",
                                        detail: "Expired or archived student relationships.",
                                        items: groupedStudents.past,
                                    },
                                ] as const).map((group) => (
                                    <div key={group.key}>
                                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                            <div>
                                                <h3 className="text-base font-black text-stone-900">
                                                    {group.title}
                                                </h3>
                                                <p className="text-sm text-stone-500">{group.detail}</p>
                                            </div>
                                            <span className="text-sm font-semibold text-stone-400">
                                                {group.items.length}
                                            </span>
                                        </div>

                                        {group.items.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                                                No {group.title.toLowerCase()} yet.
                                            </div>
                                        ) : (
                                            <div className="grid gap-4 md:grid-cols-2">
                                                {group.items.map((student) => (
                                                    <StudentCardArticle key={student.id} student={student} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="mt-10 grid gap-4 md:grid-cols-3">
                        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                            <h2 className="text-base font-black text-stone-900">Lesson Notes</h2>
                            <p className="mt-2 text-sm leading-6 text-stone-600">
                                Later, each student can have dated lesson notes, things you reviewed,
                                what they struggled with, and next steps.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                            <h2 className="text-base font-black text-stone-900">Assigned Books</h2>
                            <p className="mt-2 text-sm leading-6 text-stone-600">
                                Track books assigned from trial prep, teacher prep, or book club prep.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                            <h2 className="text-base font-black text-stone-900">Student Stats</h2>
                            <p className="mt-2 text-sm leading-6 text-stone-600">
                                Eventually show library stats, reading activity, saved words, and study
                                patterns for each learner.
                            </p>
                        </div>
                    </section>
                </>
            )}
        </main>
    );
}
