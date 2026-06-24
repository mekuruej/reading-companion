// Teacher Students
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import TeacherStudentsAccessState from "./components/TeacherStudentsAccessState";
import TeacherStudentsErrorBanner from "./components/TeacherStudentsErrorBanner";
import TeacherStudentsHeader from "./components/TeacherStudentsHeader";
import TeacherStudentsLoadingState from "./components/TeacherStudentsLoadingState";
import TeacherStudentsSummaryCards from "./components/TeacherStudentsSummaryCards";
import TeacherStudentsEmptyState from "./components/TeacherStudentsEmptyState";
import TeacherStudentsFuturePanels from "./components/TeacherStudentsFuturePanels";
import TeacherStudentsSearchPanel from "./components/TeacherStudentsSearchPanel";
import TeacherStudentGroupsPanel from "./components/TeacherStudentGroupsPanel";
import TeacherStudentsListHeader from "./components/TeacherStudentsListHeader";
import TeacherLearningTaskModal from "./components/TeacherLearningTaskModal";

type ProfileRole = "teacher" | "super_teacher" | "member" | "student" | string | null;
type StudentRelationshipStatus = "future" | "current" | "past" | "archived";
type StudentGroupKey = StudentRelationshipStatus;

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
    archived_at?: string | null;
    archived_by?: string | null;
    archive_reason?: string | null;
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
    teacherStudentTeacherId: string | null;
    archivedAt: string | null;
    archiveReason: string | null;
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

type ActiveLearningTask = {
    id: string;
    learner_id: string;
    user_book_id: string | null;
    task_type: string;
    title: string;
    instructions: string | null;
    due_on: string | null;
    created_at: string;
};

type LearningTaskType =
    | "reread_pages"
    | "review_book_words"
    | "kanji_reading_practice"
    | "listening";

type RereadTaskMode =
    | "reader_choice"
    | "fluid_reading_saved_words"
    | "curiosity_reading"
    | "just_reading";

type BookFlashcardFilter = "whole_book" | "chapter" | "page_range" | "saved_date_range";

const DEFAULT_TASK_COPY: Record<LearningTaskType, { title: string; instructions: string }> = {
    reread_pages: {
        title: "Reread today’s lesson pages",
        instructions: "Reread using Fluid Reading with Saved Word Support.",
    },
    review_book_words: {
        title: "Study book flashcards",
        instructions: "Review the selected words from this book.",
    },
    kanji_reading_practice: {
        title: "Do Kanji Reading practice",
        instructions: "Practice a short set of global Kanji Reading cards.",
    },
    listening: {
        title: "Listen to today’s section",
        instructions: "Listen to the book or audiobook and log the session.",
    },
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
    if (status === "archived") return "Archived";
    if (status === "future") return "Future";
    if (status === "past") return "Past";
    return "Current";
}

function relationshipClasses(status: StudentRelationshipStatus) {
    if (status === "archived") return "border-rose-200 bg-rose-50 text-rose-800";
    if (status === "future") return "border-sky-200 bg-sky-50 text-sky-800";
    if (status === "past") return "border-stone-200 bg-stone-100 text-stone-500";
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function learningTaskTypeLabel(taskType: string) {
    if (taskType === "reread_pages") return "Reread pages";
    if (taskType === "review_book_words") return "Book flashcards";
    if (taskType === "kanji_reading_practice") return "Kanji Reading";
    if (taskType === "listening") return "Listening";
    return "Learning task";
}

function StudentCardArticle({
    student,
    onCreateTask,
    onArchive,
    onRestore,
    isUpdatingArchive,
}: {
    student: StudentCard;
    onCreateTask: (student: StudentCard) => void;
    onArchive: (student: StudentCard) => void;
    onRestore: (student: StudentCard) => void;
    isUpdatingArchive: boolean;
}) {
    const displayName = student.display_name || student.username || "Unnamed student";
    const isArchived = student.relationshipStatus === "archived";

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

                {isArchived ? (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        <p className="font-semibold">Archived relationship</p>
                        <p className="mt-1">
                            {student.archiveReason || "Hidden from active teacher lists and alerts."}
                        </p>
                        {student.archivedAt ? (
                            <p className="mt-1 text-xs text-rose-600">
                                Archived {new Date(student.archivedAt).toLocaleDateString()}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

                    {student.currentBookId ? (
                        <Link
                            href={`/vocab/bulk?userBookId=${student.currentBookId}`}
                            className="rounded-2xl border border-amber-600 bg-amber-50 px-4 py-3 text-center text-base font-semibold text-amber-800 hover:bg-amber-100"
                        >
                            Add Words
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base font-semibold text-stone-400"
                        >
                            No Add Words
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => onCreateTask(student)}
                        disabled={isArchived}
                        className="rounded-2xl border border-sky-700 bg-sky-700 px-4 py-3 text-base font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
                    >
                        Assign Task
                    </button>

                    {isArchived ? (
                        <button
                            type="button"
                            onClick={() => onRestore(student)}
                            disabled={isUpdatingArchive || !student.teacherStudentTeacherId}
                            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                        >
                            {isUpdatingArchive ? "Restoring..." : "Restore"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onArchive(student)}
                            disabled={isUpdatingArchive || !student.teacherStudentTeacherId}
                            className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-base font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                            {isUpdatingArchive ? "Archiving..." : "Archive"}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

export default function TeacherStudentsPage() {
    const [loading, setLoading] = useState(true);
    const [canAccess, setCanAccess] = useState(false);
    const [viewerIsSuperTeacher, setViewerIsSuperTeacher] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [students, setStudents] = useState<StudentCard[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [myStudentsOpen, setMyStudentsOpen] = useState(true);
    const [otherUsersOpen, setOtherUsersOpen] = useState(false);
    const [myOpenGroups, setMyOpenGroups] = useState<Record<StudentGroupKey, boolean>>({
        current: true,
        future: false,
        past: false,
        archived: false,
    });
    const [taskBooksByStudentId, setTaskBooksByStudentId] = useState<
        Record<string, TaskBookOption[]>
    >({});
    const [error, setError] = useState<string | null>(null);
    const [taskLearnerId, setTaskLearnerId] = useState("");
    const [taskUserBookId, setTaskUserBookId] = useState("");
    const [taskType, setTaskType] = useState<LearningTaskType>("reread_pages");
    const [taskTitle, setTaskTitle] = useState(DEFAULT_TASK_COPY.reread_pages.title);
    const [taskInstructions, setTaskInstructions] = useState(
        DEFAULT_TASK_COPY.reread_pages.instructions
    );
    const [taskPageStart, setTaskPageStart] = useState("");
    const [taskPageEnd, setTaskPageEnd] = useState("");
    const [taskReadingMode, setTaskReadingMode] =
        useState<RereadTaskMode>("fluid_reading_saved_words");
    const [taskFlashcardFilter, setTaskFlashcardFilter] =
        useState<BookFlashcardFilter>("whole_book");
    const [taskChapterNumber, setTaskChapterNumber] = useState("");
    const [taskSavedFrom, setTaskSavedFrom] = useState("");
    const [taskSavedTo, setTaskSavedTo] = useState("");
    const [taskKanjiCardCount, setTaskKanjiCardCount] = useState("10");
    const [taskSaving, setTaskSaving] = useState(false);
    const [taskMessage, setTaskMessage] = useState<string | null>(null);
    const [taskModalStudent, setTaskModalStudent] = useState<StudentCard | null>(null);
    const [activeLearningTasks, setActiveLearningTasks] = useState<ActiveLearningTask[]>([]);
    const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null);
    const [updatingArchiveStudentId, setUpdatingArchiveStudentId] = useState<string | null>(null);

    async function loadActiveLearningTasks(teacherId: string, learnerIds: string[]) {
        if (learnerIds.length === 0) {
            setActiveLearningTasks([]);
            return;
        }

        const { data, error } = await supabase
            .from("learning_tasks")
            .select("id, learner_id, user_book_id, task_type, title, instructions, due_on, created_at")
            .eq("created_by", teacherId)
            .eq("status", "assigned")
            .is("cancelled_at", null)
            .in("learner_id", learnerIds)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error loading active learning tasks:", error);
            setActiveLearningTasks([]);
            return;
        }

        setActiveLearningTasks((data ?? []) as ActiveLearningTask[]);
    }

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
                setViewerIsSuperTeacher(false);
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
            const isSuperTeacher = meProfile?.role === "super_teacher" || !!meProfile?.is_super_teacher;

            setCanAccess(isTeacher);
            setViewerIsSuperTeacher(isSuperTeacher);

            if (!isTeacher) {
                setStudents([]);
                return;
            }

            let studentProfiles: StudentProfile[] = [];
            const relationshipStatusByStudentId = new Map<string, StudentRelationshipStatus>();
            const relationshipTeacherIdByStudentId = new Map<string, string>();
            const archivedAtByStudentId = new Map<string, string>();
            const archiveReasonByStudentId = new Map<string, string>();
            const studentsWithActiveTeacherLink = new Set<string>();

            if (isSuperTeacher) {
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
                    if (!studentId) continue;
                    if (link.teacher_id && !relationshipTeacherIdByStudentId.has(studentId)) {
                        relationshipTeacherIdByStudentId.set(studentId, link.teacher_id);
                    }

                    if (link.archived_at) {
                        if (!archivedAtByStudentId.has(studentId)) {
                            archivedAtByStudentId.set(studentId, link.archived_at);
                            archiveReasonByStudentId.set(studentId, link.archive_reason ?? "");
                        }
                        continue;
                    }

                    studentsWithActiveTeacherLink.add(studentId);

                    const status = getLinkRelationshipStatus(link);
                    if (status && !relationshipStatusByStudentId.has(studentId)) {
                        relationshipStatusByStudentId.set(studentId, status);
                    }
                }

                const { data: allProfiles, error: allProfilesError } = await supabase
                    .from("profiles")
                    .select("id, display_name, username, level, role, lesson_day, app_access_type, app_access_expires_at")
                    .order("display_name", { ascending: true });

                if (allProfilesError) throw allProfilesError;

                studentProfiles = ((allProfiles ?? []) as StudentProfile[]).filter(
                    (profile) => profile.id !== user.id && isStudentProfile(profile)
                );
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
                    if (link.teacher_id) {
                        relationshipTeacherIdByStudentId.set(studentId, link.teacher_id);
                    }

                    if (link.archived_at) {
                        archivedAtByStudentId.set(studentId, link.archived_at);
                        archiveReasonByStudentId.set(studentId, link.archive_reason ?? "");
                        continue;
                    }

                    studentsWithActiveTeacherLink.add(studentId);

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
                setActiveLearningTasks([]);
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
                const archivedAt = studentsWithActiveTeacherLink.has(student.id)
                    ? null
                    : archivedAtByStudentId.get(student.id) ?? null;

                return {
                    ...student,
                    relationshipStatus:
                        archivedAt
                            ? "archived"
                            : relationshipStatusByStudentId.get(student.id) ??
                            getStudentRelationshipStatus(student),
                    teacherStudentTeacherId: relationshipTeacherIdByStudentId.get(student.id) ?? null,
                    archivedAt,
                    archiveReason: archivedAt ? archiveReasonByStudentId.get(student.id) ?? null : null,
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
            const activeStudentIds = nextCards
                .filter((student) => student.relationshipStatus !== "archived")
                .map((student) => student.id);
            await loadActiveLearningTasks(user.id, activeStudentIds);
        } catch (err: any) {
            console.error("Error loading teacher students:", err);
            setError(err?.message ?? "Could not load students.");
            setStudents([]);
            setTaskBooksByStudentId({});
            setActiveLearningTasks([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadStudents();
    }, []);

    useEffect(() => {
        if (students.length === 0) return;
        const activeStudents = students.filter((student) => student.relationshipStatus !== "archived");
        if (
            taskLearnerId &&
            activeStudents.some((student) => student.id === taskLearnerId)
        ) {
            return;
        }

        const firstCurrentStudent =
            activeStudents.find((student) => student.relationshipStatus === "current") ??
            activeStudents[0];

        setTaskLearnerId(firstCurrentStudent?.id ?? "");
        setTaskUserBookId(firstCurrentStudent?.currentBookId ?? "");
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

    function updateTaskType(nextType: LearningTaskType) {
        setTaskType(nextType);
        setTaskTitle(DEFAULT_TASK_COPY[nextType].title);
        setTaskInstructions(DEFAULT_TASK_COPY[nextType].instructions);
        setTaskPageStart("");
        setTaskPageEnd("");
        setTaskChapterNumber("");
        setTaskSavedFrom("");
        setTaskSavedTo("");
        setTaskMessage(null);
    }

    function openTaskModal(student: StudentCard) {
        setTaskModalStudent(student);
        setTaskLearnerId(student.id);
        setTaskUserBookId(student.currentBookId ?? taskBooksByStudentId[student.id]?.[0]?.id ?? "");
        setTaskMessage(null);
    }

    function closeTaskModal() {
        if (taskSaving) return;
        setTaskModalStudent(null);
        setTaskMessage(null);
    }

    async function cancelLearningTask(taskId: string) {
        if (!currentUserId) {
            setTaskMessage("Please sign in again.");
            return;
        }

        const ok = window.confirm("Cancel this task for the learner?");
        if (!ok) return;

        setCancellingTaskId(taskId);
        setTaskMessage(null);

        try {
            const { error: updateError } = await supabase
                .from("learning_tasks")
                .update({
                    status: "cancelled",
                    cancelled_at: new Date().toISOString(),
                })
                .eq("id", taskId)
                .eq("created_by", currentUserId)
                .eq("status", "assigned");

            if (updateError) throw updateError;

            setActiveLearningTasks((prev) => prev.filter((task) => task.id !== taskId));
            setTaskMessage("Task cancelled.");
        } catch (err: any) {
            console.error("Error cancelling learning task:", err);
            setTaskMessage(err?.message ?? "Could not cancel this task.");
        } finally {
            setCancellingTaskId(null);
        }
    }

    async function archiveStudent(student: StudentCard) {
        if (!currentUserId || !student.teacherStudentTeacherId) {
            setError("This student relationship could not be archived.");
            return;
        }

        const displayName = student.display_name || student.username || "this student";
        const ok = window.confirm(
            `Archive ${displayName}? They will be hidden from active teacher lists and alerts, but their data will stay in Mekuru.`
        );
        if (!ok) return;

        const reason = window.prompt("Optional archive note", "Student quit");

        setUpdatingArchiveStudentId(student.id);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("teacher_students")
                .update({
                    archived_at: new Date().toISOString(),
                    archived_by: currentUserId,
                    archive_reason: reason?.trim() || null,
                })
                .eq("teacher_id", student.teacherStudentTeacherId)
                .eq("student_id", student.id)
                .is("archived_at", null);

            if (updateError) throw updateError;

            await loadStudents();
        } catch (err: any) {
            console.error("Error archiving student:", err);
            setError(err?.message ?? "Could not archive this student.");
        } finally {
            setUpdatingArchiveStudentId(null);
        }
    }

    async function restoreStudent(student: StudentCard) {
        if (!currentUserId || !student.teacherStudentTeacherId) {
            setError("This student relationship could not be restored.");
            return;
        }

        const displayName = student.display_name || student.username || "this student";
        const ok = window.confirm(`Restore ${displayName} to active student lists?`);
        if (!ok) return;

        setUpdatingArchiveStudentId(student.id);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("teacher_students")
                .update({
                    archived_at: null,
                    archived_by: null,
                    archive_reason: null,
                })
                .eq("teacher_id", student.teacherStudentTeacherId)
                .eq("student_id", student.id);

            if (updateError) throw updateError;

            await loadStudents();
        } catch (err: any) {
            console.error("Error restoring student:", err);
            setError(err?.message ?? "Could not restore this student.");
        } finally {
            setUpdatingArchiveStudentId(null);
        }
    }

    async function createLearningTask() {
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
        const chapterNumber =
            taskChapterNumber.trim() === "" ? null : Number(taskChapterNumber.trim());
        const kanjiCardCount =
            taskKanjiCardCount.trim() === "" ? null : Number(taskKanjiCardCount.trim());

        const needsBook =
            taskType === "reread_pages" ||
            taskType === "review_book_words" ||
            taskType === "listening";

        if (needsBook && !taskUserBookId) {
            setTaskMessage("Choose a linked book for this task.");
            return;
        }

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

        if (
            taskType === "review_book_words" &&
            taskFlashcardFilter === "chapter" &&
            (chapterNumber == null || !Number.isFinite(chapterNumber) || chapterNumber <= 0)
        ) {
            setTaskMessage("Add a positive chapter number.");
            return;
        }

        if (
            taskType === "kanji_reading_practice" &&
            (kanjiCardCount == null || !Number.isFinite(kanjiCardCount) || kanjiCardCount <= 0)
        ) {
            setTaskMessage("Add a positive number of Kanji Reading cards.");
            return;
        }

        if (
            taskType === "review_book_words" &&
            taskFlashcardFilter === "saved_date_range" &&
            ((taskSavedFrom && taskSavedTo && taskSavedTo < taskSavedFrom) ||
                (!taskSavedFrom && !taskSavedTo))
        ) {
            setTaskMessage("Add a saved date range, or choose a different flashcard filter.");
            return;
        }

        const taskPayload: Record<string, unknown> = {};

        if (taskType === "reread_pages") {
            taskPayload.mode = taskReadingMode;
        }

        if (taskType === "review_book_words") {
            taskPayload.mode = "book_flashcards";
            taskPayload.filter_type = taskFlashcardFilter;

            if (taskFlashcardFilter === "chapter" && chapterNumber != null) {
                taskPayload.chapter_number = chapterNumber;
            }

            if (taskFlashcardFilter === "saved_date_range") {
                if (taskSavedFrom) taskPayload.saved_from = taskSavedFrom;
                if (taskSavedTo) taskPayload.saved_to = taskSavedTo;
            }
        }

        if (taskType === "kanji_reading_practice") {
            taskPayload.mode = "kanji_reading_practice";
            taskPayload.card_count = kanjiCardCount ?? 10;
        }

        if (taskType === "listening") {
            taskPayload.mode = "listening";
        }

        const shouldIncludePageRange =
            taskType === "reread_pages" ||
            taskType === "listening" ||
            (taskType === "review_book_words" && taskFlashcardFilter === "page_range");

        if (shouldIncludePageRange && pageStart != null && pageEnd != null) {
            taskPayload.page_start = pageStart;
            taskPayload.page_end = pageEnd;
        }

        setTaskSaving(true);

        try {
            const { data: insertedTask, error: insertError } = await supabase
                .from("learning_tasks")
                .insert({
                    created_by: currentUserId,
                    learner_id: taskLearnerId,
                    user_book_id: taskUserBookId || null,
                    task_type: taskType,
                    title: cleanTitle,
                    instructions: cleanInstructions || null,
                    task_payload: taskPayload,
                    status: "assigned",
                })
                .select("id, learner_id, user_book_id, task_type, title, instructions, due_on, created_at")
                .single();

            if (insertError) throw insertError;

            if (insertedTask) {
                setActiveLearningTasks((prev) => [insertedTask as ActiveLearningTask, ...prev]);
            }
            setTaskMessage("Learning task created.");
            setTaskPageStart("");
            setTaskPageEnd("");
            setTaskChapterNumber("");
            setTaskSavedFrom("");
            setTaskSavedTo("");
        } catch (err: any) {
            console.error("Error creating learning task:", err);
            setTaskMessage(err?.message ?? "Could not create learning task.");
        } finally {
            setTaskSaving(false);
        }
    }

    const summary = useMemo(() => {
        const linkedStudents = students.filter((student) => Boolean(student.teacherStudentTeacherId));
        const activeStudents = linkedStudents.filter((student) => student.relationshipStatus !== "archived");

        return {
            totalUsers: students.length,
            totalStudents: activeStudents.length,
            currentStudents: activeStudents.filter((student) => student.relationshipStatus === "current").length,
            pastStudents:
                activeStudents.filter((student) => student.relationshipStatus === "past").length +
                linkedStudents.filter((student) => student.relationshipStatus === "archived").length,
            activeReaders: activeStudents.filter((student) => !!student.currentBookId).length,
            withRecentActivity: activeStudents.filter((student) => !!student.lastEngagedAt).length,
        };
    }, [students]);

    const filteredStudents = useMemo(() => {
        const q = studentSearch.trim().toLowerCase();
        if (!q) return students;

        return students.filter((student) => {
            const searchable = [
                student.display_name,
                student.username,
                student.level,
                student.lesson_day,
                relationshipLabel(student.relationshipStatus),
                student.currentBookTitle,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(q);
        });
    }, [studentSearch, students]);

    const myFilteredStudents = useMemo(() => {
        return filteredStudents.filter((student) => Boolean(student.teacherStudentTeacherId));
    }, [filteredStudents]);

    const otherFilteredUsers = useMemo(() => {
        return filteredStudents.filter((student) => !student.teacherStudentTeacherId);
    }, [filteredStudents]);

    const groupedStudents = useMemo(() => {
        return {
            future: myFilteredStudents.filter((student) => student.relationshipStatus === "future"),
            current: myFilteredStudents.filter((student) => student.relationshipStatus === "current"),
            past: myFilteredStudents.filter((student) => student.relationshipStatus === "past"),
            archived: myFilteredStudents.filter((student) => student.relationshipStatus === "archived"),
        };
    }, [myFilteredStudents]);

    function toggleMyGroup(group: StudentGroupKey) {
        setMyOpenGroups((current) => ({
            ...current,
            [group]: !current[group],
        }));
    }

    const searchSingularNounLabel = viewerIsSuperTeacher ? "account" : "student";
    const searchPluralNounLabel = viewerIsSuperTeacher ? "accounts" : "students";

    const activeTasksForModalStudent = useMemo(() => {
        if (!taskModalStudent) return [];
        return activeLearningTasks.filter((task) => task.learner_id === taskModalStudent.id);
    }, [activeLearningTasks, taskModalStudent]);

    return (
        <main className="mx-auto max-w-6xl px-4 py-8">
            <TeacherStudentsHeader />

            {loading ? (
                <TeacherStudentsLoadingState />
            ) : !canAccess ? (
                <TeacherStudentsAccessState />
            ) : (
                <>
                    <TeacherStudentsErrorBanner message={error} />

                    <TeacherStudentsSummaryCards
                        summary={summary}
                        showTotalUsers={viewerIsSuperTeacher}
                    />

                    {taskModalStudent ? (
                        <TeacherLearningTaskModal
                            student={taskModalStudent}
                            taskType={taskType}
                            onTaskTypeChange={(value) => updateTaskType(value as LearningTaskType)}
                            taskUserBookId={taskUserBookId}
                            onTaskUserBookIdChange={setTaskUserBookId}
                            taskLearnerId={taskLearnerId}
                            taskBooks={taskBooksByStudentId[taskLearnerId] ?? []}
                            taskReadingMode={taskReadingMode}
                            onTaskReadingModeChange={(value) => setTaskReadingMode(value as RereadTaskMode)}
                            taskFlashcardFilter={taskFlashcardFilter}
                            onTaskFlashcardFilterChange={(value) =>
                                setTaskFlashcardFilter(value as BookFlashcardFilter)
                            }
                            taskChapterNumber={taskChapterNumber}
                            onTaskChapterNumberChange={setTaskChapterNumber}
                            taskSavedFrom={taskSavedFrom}
                            onTaskSavedFromChange={setTaskSavedFrom}
                            taskSavedTo={taskSavedTo}
                            onTaskSavedToChange={setTaskSavedTo}
                            taskKanjiCardCount={taskKanjiCardCount}
                            onTaskKanjiCardCountChange={setTaskKanjiCardCount}
                            taskTitle={taskTitle}
                            onTaskTitleChange={setTaskTitle}
                            taskInstructions={taskInstructions}
                            onTaskInstructionsChange={setTaskInstructions}
                            taskPageStart={taskPageStart}
                            onTaskPageStartChange={setTaskPageStart}
                            taskPageEnd={taskPageEnd}
                            onTaskPageEndChange={setTaskPageEnd}
                            taskSaving={taskSaving}
                            taskMessage={taskMessage}
                            activeTasks={activeTasksForModalStudent}
                            taskBooksByStudentId={taskBooksByStudentId}
                            cancellingTaskId={cancellingTaskId}
                            learningTaskTypeLabel={learningTaskTypeLabel}
                            onClose={closeTaskModal}
                            onCreateTask={() => void createLearningTask()}
                            onCancelTask={(taskId) => void cancelLearningTask(taskId)}
                        />
                    ) : null}

                    <section className="mt-8">
                        <TeacherStudentsListHeader />

                        {students.length === 0 ? (
                            <TeacherStudentsEmptyState
                                title="No linked students yet."
                                description="Students linked to your teacher account will appear here."
                            />
                        ) : (
                            <div className="space-y-8">
                                <TeacherStudentsSearchPanel
                                    value={studentSearch}
                                    onChange={setStudentSearch}
                                    filteredCount={filteredStudents.length}
                                    totalCount={students.length}
                                    singularNounLabel={searchSingularNounLabel}
                                    pluralNounLabel={searchPluralNounLabel}
                                />

                                {filteredStudents.length === 0 ? (
                                    <TeacherStudentsEmptyState
                                        title={`No ${searchPluralNounLabel} match that search.`}
                                        actionLabel="Clear search"
                                        onAction={() => setStudentSearch("")}
                                    />
                                ) : null}

                                {filteredStudents.length > 0 ? (
                                    <div className="space-y-10">
                                        {myFilteredStudents.length > 0 ? (
                                            <section className="space-y-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setMyStudentsOpen((current) => !current)}
                                                    className="flex w-full flex-col gap-2 rounded-3xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
                                                    aria-expanded={myStudentsOpen}
                                                >
                                                    <div>
                                                        <h2 className="text-2xl font-black text-stone-900">
                                                            <span className="mr-2 text-stone-400">
                                                                {myStudentsOpen ? "▾" : "▸"}
                                                            </span>
                                                            My Students
                                                        </h2>
                                                        <p className="mt-1 text-sm text-stone-600">
                                                            Learners linked to your teacher account.
                                                        </p>
                                                    </div>

                                                    <span className="text-sm font-semibold text-stone-400">
                                                        {myFilteredStudents.length} student{myFilteredStudents.length === 1 ? "" : "s"}
                                                    </span>
                                                </button>

                                                {myStudentsOpen ? (
                                                    <TeacherStudentGroupsPanel
                                                        groupedStudents={groupedStudents}
                                                        openGroups={myOpenGroups}
                                                        hiddenGroups={["future"]}
                                                        onToggleGroup={toggleMyGroup}
                                                        renderStudent={(student) => (
                                                            <StudentCardArticle
                                                                key={student.id}
                                                                student={student}
                                                                onCreateTask={openTaskModal}
                                                                onArchive={archiveStudent}
                                                                onRestore={restoreStudent}
                                                                isUpdatingArchive={updatingArchiveStudentId === student.id}
                                                            />
                                                        )}
                                                    />
                                                ) : null}
                                            </section>
                                        ) : null}

                                        {otherFilteredUsers.length > 0 ? (
                                            <section className="space-y-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setOtherUsersOpen((current) => !current)}
                                                    className="flex w-full flex-col gap-2 rounded-3xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
                                                    aria-expanded={otherUsersOpen}
                                                >
                                                    <div>
                                                        <h2 className="text-2xl font-black text-stone-900">
                                                            <span className="mr-2 text-stone-400">
                                                                {otherUsersOpen ? "▾" : "▸"}
                                                            </span>
                                                            Other Users
                                                        </h2>
                                                        <p className="mt-1 text-sm text-stone-600">
                                                            Visible because you are a super teacher, but not linked as your students.
                                                        </p>
                                                    </div>

                                                    <span className="text-sm font-semibold text-stone-400">
                                                        {otherFilteredUsers.length} user{otherFilteredUsers.length === 1 ? "" : "s"}
                                                    </span>
                                                </button>

                                                {otherUsersOpen ? (
                                                    <div className="space-y-6">
                                                        <div className="grid gap-3 md:grid-cols-2">
                                                            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-3">
                                                                <p className="text-sm font-bold text-stone-700">Blocked users</p>
                                                                <p className="mt-1 text-xs leading-5 text-stone-500">
                                                                    Placeholder for future account access controls.
                                                                </p>
                                                            </div>

                                                            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-3">
                                                                <p className="text-sm font-bold text-stone-700">Privacy requests</p>
                                                                <p className="mt-1 text-xs leading-5 text-stone-500">
                                                                    Placeholder for future email or account removal workflows.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                                                <div>
                                                                    <h3 className="text-base font-black text-stone-900">
                                                                        Unlinked accounts
                                                                    </h3>
                                                                    <p className="text-sm text-stone-500">
                                                                        Accounts visible to super teachers, but not connected to your teacher list.
                                                                    </p>
                                                                </div>

                                                                <span className="text-sm font-semibold text-stone-400">
                                                                    {otherFilteredUsers.length} user{otherFilteredUsers.length === 1 ? "" : "s"}
                                                                </span>
                                                            </div>

                                                            <div className="grid gap-4">
                                                                {otherFilteredUsers.map((student) => (
                                                                    <StudentCardArticle
                                                                        key={student.id}
                                                                        student={student}
                                                                        onCreateTask={openTaskModal}
                                                                        onArchive={archiveStudent}
                                                                        onRestore={restoreStudent}
                                                                        isUpdatingArchive={updatingArchiveStudentId === student.id}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </section>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </section>

                    <TeacherStudentsFuturePanels />
                </>
            )}
        </main>
    );
}
