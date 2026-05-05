// Teacher Students
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileRole = "teacher" | "super_teacher" | "member" | "student" | string | null;

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
    currentBookTitle: string | null;
    currentBookCoverUrl: string | null;
    currentBookId: string | null;
    totalBooks: number;
    assignedPrepCount: number;
    lastEngagedAt: string | null;
};

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

function isActiveStudentProfile(profile: StudentProfile) {
    const isStudentRole = profile.role === "member" || profile.role === "student";
    const isTrialAccess = profile.app_access_type === "trial";

    return isStudentRole && !isTrialAccess;
}

export default function TeacherStudentsPage() {
    const [loading, setLoading] = useState(true);
    const [canAccess, setCanAccess] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [students, setStudents] = useState<StudentCard[]>([]);
    const [error, setError] = useState<string | null>(null);

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

            if (meProfile?.role === "super_teacher" || meProfile?.is_super_teacher) {
                const { data: allProfiles, error: allProfilesError } = await supabase
                    .from("profiles")
                    .select("id, display_name, username, level, role, lesson_day, app_access_type, app_access_expires_at")
                    .order("display_name", { ascending: true });

                if (allProfilesError) throw allProfilesError;

                studentProfiles = ((allProfiles ?? []) as StudentProfile[]).filter(
                    (profile) => profile.id !== user.id && isActiveStudentProfile(profile)
                );
            } else {
                const { data: links, error: linksError } = await supabase
                    .from("teacher_students")
                    .select("student_id")
                    .eq("teacher_id", user.id);

                if (linksError) throw linksError;

                const studentIds = (links ?? [])
                    .map((row: any) => row.student_id)
                    .filter(Boolean) as string[];

                if (studentIds.length > 0) {
                    const { data: linkedProfiles, error: linkedProfilesError } = await supabase
                        .from("profiles")
                        .select("id, display_name, username, level, role, lesson_day, app_access_type, app_access_expires_at")
                        .in("id", studentIds)
                        .order("display_name", { ascending: true });

                    if (linkedProfilesError) throw linkedProfilesError;

                    studentProfiles = ((linkedProfiles ?? []) as StudentProfile[]).filter(
                        (profile) => isActiveStudentProfile(profile)
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

            for (const row of (userBooks ?? []) as UserBookRow[]) {
                const existing = booksByStudentId.get(row.user_id) ?? [];
                existing.push(row);
                booksByStudentId.set(row.user_id, existing);
            }

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
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadStudents();
    }, []);

    const summary = useMemo(() => {
        return {
            totalStudents: students.length,
            activeReaders: students.filter((student) => !!student.currentBookId).length,
            assignedPrepBooks: students.reduce(
                (total, student) => total + student.assignedPrepCount,
                0
            ),
            withRecentActivity: students.filter((student) => !!student.lastEngagedAt).length,
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
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-stone-500">Students</p>
                            <p className="mt-1 text-2xl font-black text-stone-900">
                                {summary.totalStudents}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">Linked learners.</p>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                            <p className="text-xs text-emerald-700">With books</p>
                            <p className="mt-1 text-2xl font-black text-emerald-900">
                                {summary.activeReaders}
                            </p>
                            <p className="mt-1 text-xs text-emerald-700">Students with library items.</p>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                            <p className="text-xs text-amber-700">Assigned prep</p>
                            <p className="mt-1 text-2xl font-black text-amber-900">
                                {summary.assignedPrepBooks}
                            </p>
                            <p className="mt-1 text-xs text-amber-700">Books assigned from prep.</p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <p className="text-xs text-stone-500">Recent activity</p>
                            <p className="mt-1 text-2xl font-black text-stone-900">
                                {summary.withRecentActivity}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">Students with reading sessions.</p>
                        </div>
                    </section>

                    <section className="mt-8">
                        <div className="mb-3">
                            <h2 className="text-lg font-black text-stone-900">Student List</h2>
                            <p className="mt-1 text-sm text-stone-500">
                                Open a student’s library from here instead of using the Library dropdown.
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
                            <div className="grid gap-4 md:grid-cols-2">
                                {students.map((student) => {
                                    const displayName =
                                        student.display_name || student.username || "Unnamed student";

                                    return (
                                        <article
                                            key={student.id}
                                            className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
                                        >
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

                                                            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-stone-500">
                                                                {student.level || "No level"}
                                                            </span>
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
                                })}
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