"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import TeacherLearningTaskModal from "../../components/TeacherLearningTaskModal";

type StudentProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  level: string | null;
  lesson_day: string | null;
  app_access_type: string | null;
  app_access_expires_at: string | null;
};

type LessonBook = {
  id: string;
  userBookId: string;
  addedAt: string | null;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
    languageCode: string | null;
    pageCount: number | null;
    statusLabel: string;
    lastReadOn: string | null;
    furthestPage: number | null;
  };
};

type EligibleBook = LessonBook["book"];

type NeedsAttentionSession = {
  id: string;
  status: "reviewing" | "deferred";
  userBookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  updatedAt: string | null;
  wordCount: number;
};

type StudentBookRequest = {
  id: string;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  status: string | null;
  createdAt: string | null;
  userId: string | null;
};

type RatingFollowUp = {
  id: string;
  userBookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  finishedAt: string | null;
  missingRatings: string[];
};

type WorkspacePayload = {
  student: StudentProfile;
  relationship: {
    relationship_status?: string | null;
  } | null;
  lastEngagedAt: string | null;
  activeLessonBooks: LessonBook[];
  eligibleBooks: EligibleBook[];
  needsAttention: NeedsAttentionSession[];
  bookRequests: StudentBookRequest[];
  ratingFollowUps: RatingFollowUp[];
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

const LESSON_DAY_OPTIONS = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];

const DEFAULT_TASK_COPY: Record<LearningTaskType, { title: string; instructions: string }> = {
  reread_pages: {
    title: "Reread today's lesson pages",
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
    instructions: "Listen to the audiobook, log any words you hear, and time your session.",
  },
};

function formatDate(value: string | null) {
  if (!value) return "No recent activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No recent activity";
  return date.toLocaleDateString();
}

function relationshipLabel(relationship: WorkspacePayload["relationship"]) {
  return relationship?.relationship_status || "Current student";
}

function normalizeLessonDayForStorage(value: string | null | undefined) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";

  const match = LESSON_DAY_OPTIONS.find(
    (option) => option.value === text || option.label.toLowerCase() === text
  );

  return match?.value ?? "";
}

function formatLessonDay(value: string | null) {
  const normalized = normalizeLessonDayForStorage(value);
  const match = LESSON_DAY_OPTIONS.find((option) => option.value === normalized);
  return match?.label ?? "No lesson day";
}

function learningTaskTypeLabel(taskType: string) {
  if (taskType === "reread_pages") return "Reread pages";
  if (taskType === "review_book_words") return "Book flashcards";
  if (taskType === "kanji_reading_practice") return "Kanji Reading";
  if (taskType === "listening") return "Listening";
  return "Learning task";
}

function taskStatusLabel(task: ActiveLearningTask) {
  if (task.due_on) return `Assigned · due ${formatDate(task.due_on)}`;
  return `Assigned · ${formatDate(task.created_at)}`;
}

function workspaceContext(studentId: string) {
  return `from=student-workspace&studentId=${encodeURIComponent(studentId)}`;
}

export default function StudentWorkspacePage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId ?? "";

  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [chooserOpen, setChooserOpen] = useState(false);
  const [mutatingUserBookId, setMutatingUserBookId] = useState<string | null>(null);
  const [lessonDayEditing, setLessonDayEditing] = useState(false);
  const [lessonDayDraft, setLessonDayDraft] = useState("");
  const [lessonDaySaving, setLessonDaySaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskLearnerId, setTaskLearnerId] = useState(studentId);
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
  const [activeLearningTasks, setActiveLearningTasks] = useState<ActiveLearningTask[]>([]);
  const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null);

  const studentName = data?.student.display_name || data?.student.username || "Student";
  const studentLibraryHref = data?.student.username
    ? `/users/${encodeURIComponent(data.student.username)}/books`
    : "/teacher/students";
  const addBookHref = `/books/add?destination=student&targetUserId=${encodeURIComponent(
    studentId
  )}&from=student-workspace`;

  const addableBooks = useMemo(() => data?.eligibleBooks ?? [], [data?.eligibleBooks]);
  const taskBooks = useMemo(() => {
    if (!data) return [];

    const seen = new Set<string>();
    const books: TaskBookOption[] = [];

    for (const lessonBook of data.activeLessonBooks) {
      if (seen.has(lessonBook.userBookId)) continue;
      seen.add(lessonBook.userBookId);
      books.push({
        id: lessonBook.userBookId,
        userId: studentId,
        title: lessonBook.book.title,
      });
    }

    for (const book of data.eligibleBooks) {
      if (seen.has(book.id)) continue;
      seen.add(book.id);
      books.push({
        id: book.id,
        userId: studentId,
        title: book.title,
      });
    }

    return books;
  }, [data, studentId]);
  const taskBooksByStudentId = useMemo(
    () => ({ [studentId]: taskBooks }),
    [studentId, taskBooks]
  );

  async function apiFetch(method = "GET", body?: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error("Please sign in.");
    }

    const url =
      method === "GET"
        ? `/api/teacher/student-workspace?studentId=${encodeURIComponent(studentId)}`
        : "/api/teacher/student-workspace";

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Student Workspace request failed.");
    }

    return payload;
  }

  async function loadWorkspace() {
    setLoading(true);
    setMessage("");

    try {
      const payload = (await apiFetch("GET")) as WorkspacePayload;
      setData(payload);
    } catch (error: any) {
      console.error("Error loading Student Workspace:", error);
      setMessage(error?.message ?? "Could not load this Student Workspace.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!studentId) return;
    void loadWorkspace();
  }, [studentId]);

  useEffect(() => {
    setTaskLearnerId(studentId);
  }, [studentId]);

  useEffect(() => {
    setLessonDayDraft(normalizeLessonDayForStorage(data?.student.lesson_day));
  }, [data?.student.lesson_day]);

  useEffect(() => {
    if (!taskUserBookId || !taskBooks.some((book) => book.id === taskUserBookId)) {
      setTaskUserBookId(taskBooks[0]?.id ?? "");
    }
  }, [taskBooks, taskUserBookId]);

  async function loadActiveLearningTasks() {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user.id;

    if (!currentUserId || !studentId) {
      setActiveLearningTasks([]);
      return;
    }

    const { data: tasks, error } = await supabase
      .from("learning_tasks")
      .select("id, learner_id, user_book_id, task_type, title, instructions, due_on, created_at")
      .eq("created_by", currentUserId)
      .eq("status", "assigned")
      .is("cancelled_at", null)
      .eq("learner_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading active learning tasks:", error);
      setActiveLearningTasks([]);
      return;
    }

    setActiveLearningTasks((tasks ?? []) as ActiveLearningTask[]);
  }

  useEffect(() => {
    if (!studentId) return;
    void loadActiveLearningTasks();
  }, [studentId]);

  async function addLessonBook(userBookId: string) {
    setMutatingUserBookId(userBookId);
    setMessage("");

    try {
      await apiFetch("POST", { studentId, userBookId });
      setChooserOpen(false);
      await loadWorkspace();
    } catch (error: any) {
      console.error("Error adding lesson book:", error);
      setMessage(error?.message ?? "Could not add this lesson book.");
    } finally {
      setMutatingUserBookId(null);
    }
  }

  async function removeLessonBook(book: LessonBook) {
    const ok = window.confirm(
      `Remove "${book.book.title}" from this teacher workspace?\n\nThe book will stay in ${studentName}'s library. Reading sessions, saved words, Live Lesson batches, reflections, ratings, and study history will not be deleted. You can add it back later.`
    );

    if (!ok) return;

    setMutatingUserBookId(book.userBookId);
    setMessage("");

    try {
      await apiFetch("PATCH", {
        studentId,
        userBookId: book.userBookId,
        action: "remove",
      });
      await loadWorkspace();
    } catch (error: any) {
      console.error("Error removing lesson book:", error);
      setMessage(error?.message ?? "Could not remove this lesson book.");
    } finally {
      setMutatingUserBookId(null);
    }
  }

  async function saveLessonDay() {
    setLessonDaySaving(true);
    setProfileMessage("");
    setMessage("");

    try {
      const payload = (await apiFetch("PATCH", {
        studentId,
        action: "update-lesson-day",
        lessonDay: normalizeLessonDayForStorage(lessonDayDraft),
      })) as { lessonDay: string | null };

      setData((previous) =>
        previous
          ? {
              ...previous,
              student: {
                ...previous.student,
                lesson_day: payload.lessonDay ?? null,
              },
            }
          : previous
      );
      setLessonDayEditing(false);
      setProfileMessage("Lesson day saved.");
    } catch (error: any) {
      console.error("Error updating lesson day:", error);
      setProfileMessage(error?.message ?? "Could not update the lesson day.");
    } finally {
      setLessonDaySaving(false);
    }
  }

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

  function openTaskModal() {
    setTaskLearnerId(studentId);
    setTaskUserBookId(taskBooks[0]?.id ?? "");
    setTaskMessage(null);
    setTaskModalOpen(true);
    void loadActiveLearningTasks();
  }

  function closeTaskModal() {
    if (taskSaving) return;
    setTaskModalOpen(false);
    setTaskMessage(null);
  }

  async function cancelLearningTask(taskId: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user.id;

    if (!currentUserId) {
      setTaskMessage("Please sign in again.");
      return;
    }

    const ok = window.confirm("Cancel this task for the learner?");
    if (!ok) return;

    setCancellingTaskId(taskId);
    setTaskMessage(null);

    try {
      const { error } = await supabase
        .from("learning_tasks")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .eq("created_by", currentUserId)
        .eq("status", "assigned");

      if (error) throw error;

      setActiveLearningTasks((previous) => previous.filter((task) => task.id !== taskId));
      setTaskMessage("Task cancelled.");
    } catch (error: any) {
      console.error("Error cancelling learning task:", error);
      setTaskMessage(error?.message ?? "Could not cancel this task.");
    } finally {
      setCancellingTaskId(null);
    }
  }

  async function createLearningTask() {
    setTaskMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user.id;

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
    const pageStart = taskPageStart.trim() === "" ? null : Number(taskPageStart.trim());
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
      const { data: insertedTask, error } = await supabase
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

      if (error) throw error;

      if (insertedTask) {
        setActiveLearningTasks((previous) => [insertedTask as ActiveLearningTask, ...previous]);
      }

      setTaskMessage("Learning task created.");
      setTaskPageStart("");
      setTaskPageEnd("");
      setTaskChapterNumber("");
      setTaskSavedFrom("");
      setTaskSavedTo("");
    } catch (error: any) {
      console.error("Error creating learning task:", error);
      setTaskMessage(error?.message ?? "Could not create learning task.");
    } finally {
      setTaskSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          Loading Student Workspace...
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href="/teacher/students" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            &lt;- Back to Students
          </Link>
          <h1 className="mt-4 text-2xl font-black text-stone-950">Student Workspace</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "This Student Workspace could not be opened."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link href="/teacher/students" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
          &lt;- Back to Students
        </Link>

        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="h-14 bg-gradient-to-r from-sky-100 via-amber-50 to-emerald-100" />
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="-mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-stone-100 text-2xl font-black text-stone-500 shadow-sm">
                  {studentName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                    Student Workspace
                  </p>
                  <h1 className="mt-1 truncate text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
                    {studentName}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {data.student.username ? (
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-600">
                        @{data.student.username}
                      </span>
                    ) : null}
                    {data.student.level ? (
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-600">
                        {data.student.level}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">
                      {relationshipLabel(data.relationship)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openTaskModal}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm hover:bg-emerald-100"
                >
                  Assign Task
                </button>
                <Link
                  href={studentLibraryHref}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow-sm hover:bg-stone-50"
                >
                  View Full Student Library
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-400">
                  Lesson Day
                </p>
                {lessonDayEditing ? (
                  <div className="mt-2 grid gap-2">
                    <select
                      value={lessonDayDraft}
                      onChange={(event) => setLessonDayDraft(event.target.value)}
                      disabled={lessonDaySaving}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-emerald-300"
                    >
                      <option value="">No lesson day</option>
                      {LESSON_DAY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveLessonDay()}
                        disabled={lessonDaySaving}
                        className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
                      >
                        {lessonDaySaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLessonDayDraft("");
                          setProfileMessage("");
                        }}
                        disabled={lessonDaySaving}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLessonDayDraft(normalizeLessonDayForStorage(data.student.lesson_day));
                          setLessonDayEditing(false);
                          setProfileMessage("");
                        }}
                        disabled={lessonDaySaving}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-lg font-black text-stone-950">
                      {formatLessonDay(data.student.lesson_day)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLessonDayEditing(true);
                        setProfileMessage("");
                      }}
                      className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-400">
                  Last Engaged
                </p>
                <p className="mt-1 text-lg font-black text-stone-950">
                  {formatDate(data.lastEngagedAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-400">
                  Student Books
                </p>
                <p className="mt-1 text-lg font-black text-stone-950">
                  {data.activeLessonBooks.length} active lesson
                  {data.activeLessonBooks.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {profileMessage ? (
              <p className="mt-3 text-sm font-semibold text-stone-600">{profileMessage}</p>
            ) : null}
          </div>
        </section>

        {message ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {message}
          </section>
        ) : null}

        {chooserOpen ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-stone-950">Add Lesson Book</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Choose a book already in {studentName}'s library, or add a new book to their library first.
                </p>
              </div>
              <Link
                href={addBookHref}
                className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-white"
              >
                Add New Book to Student Library
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {addableBooks.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => void addLessonBook(book.id)}
                  disabled={mutatingUserBookId === book.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="h-16 w-11 rounded object-cover shadow-sm" />
                  ) : (
                    <div className="h-16 w-11 rounded bg-stone-200" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-stone-900">{book.title}</p>
                    <p className="truncate text-xs text-stone-500">{book.author || book.statusLabel}</p>
                  </div>
                </button>
              ))}
            </div>

            {addableBooks.length === 0 ? (
              <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                Every book in this student's library is already active here. Add a new book to their library, then return and choose it here.
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-stone-950">Books We're Working On</h2>
              <p className="mt-1 text-sm text-stone-500">
                Active lesson books for this teacher-student workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChooserOpen((value) => !value)}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-stone-800"
            >
              Add Lesson Book
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {data.activeLessonBooks.map((lessonBook) => {
              const context = workspaceContext(studentId);
              const encodedUserBookId = encodeURIComponent(lessonBook.userBookId);

              return (
                <article
                  key={lessonBook.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="flex gap-4">
                    {lessonBook.book.coverUrl ? (
                      <img
                        src={lessonBook.book.coverUrl}
                        alt=""
                        className="h-24 w-16 rounded-md object-cover shadow-sm"
                      />
                    ) : (
                      <div className="h-24 w-16 rounded-md bg-stone-200" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-base font-black leading-tight text-stone-950">
                        {lessonBook.book.title}
                      </h3>
                      {lessonBook.book.author ? (
                        <p className="mt-1 truncate text-sm text-stone-600">{lessonBook.book.author}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-white px-2.5 py-1 text-stone-600">
                          {lessonBook.book.statusLabel}
                        </span>
                        {lessonBook.book.furthestPage != null ? (
                          <span className="rounded-full bg-white px-2.5 py-1 text-stone-600">
                            Page {lessonBook.book.furthestPage}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-white px-2.5 py-1 text-stone-600">
                          {formatDate(lessonBook.book.lastReadOn)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`/teacher/students/${encodeURIComponent(studentId)}/books/${encodedUserBookId}/lesson-add?${context}`}
                      className="rounded-xl bg-stone-900 px-3 py-2 text-center text-sm font-bold text-white hover:bg-stone-800"
                    >
                      Live Lesson Add
                    </Link>
                    <Link
                      href={`/books/${encodedUserBookId}/words?${context}`}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-center text-sm font-bold text-stone-700 hover:bg-stone-50"
                    >
                      Vocabulary List
                    </Link>
                    <Link
                      href={`/books/${encodedUserBookId}/readalong?${context}`}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-center text-sm font-bold text-stone-700 hover:bg-stone-50"
                    >
                      Follow-Along
                    </Link>
                    <Link
                      href={`/books/${encodedUserBookId}?${context}`}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-center text-sm font-bold text-stone-700 hover:bg-stone-50"
                    >
                      Book Hub
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeLessonBook(lessonBook)}
                    disabled={mutatingUserBookId === lessonBook.userBookId}
                    className="mt-3 text-sm font-semibold text-stone-500 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove from Workspace
                  </button>
                </article>
              );
            })}
          </div>

          {data.activeLessonBooks.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-6 text-stone-600">
              No lesson books are active in this workspace yet. Add a book from the student's library to start using the lesson tools here.
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Active Follow-Up</h2>
          <p className="mt-1 text-sm text-stone-500">
            Live Lesson reviews, assigned tasks, book requests, and finished-book ratings for this student.
          </p>

          <div className="mt-4 space-y-3">
            {data.needsAttention.map((session) => (
              <article
                key={session.id}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-stone-950">{session.bookTitle}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    {session.status} · {session.wordCount} words · {formatDate(session.updatedAt)}
                  </p>
                </div>
                <Link
                  href={`/teacher/students/${encodeURIComponent(studentId)}/books/${encodeURIComponent(
                    session.userBookId
                  )}/lesson-add?sessionId=${encodeURIComponent(session.id)}&${workspaceContext(studentId)}`}
                  className="rounded-xl bg-amber-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-amber-800"
                >
                  Resume Review
                </Link>
              </article>
            ))}

            {activeLearningTasks.map((task) => {
              const linkedBook = taskBooks.find((book) => book.id === task.user_book_id);
              const taskHref = task.user_book_id
                ? `/books/${encodeURIComponent(task.user_book_id)}?${workspaceContext(studentId)}`
                : null;

              return (
                <article
                  key={task.id}
                  className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-stone-950">{task.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      Task · {learningTaskTypeLabel(task.task_type)} · {taskStatusLabel(task)}
                    </p>
                    {linkedBook || task.instructions ? (
                      <p className="mt-1 line-clamp-2 text-xs text-stone-600">
                        {linkedBook ? `${linkedBook.title}` : ""}
                        {linkedBook && task.instructions ? " · " : ""}
                        {task.instructions ?? ""}
                      </p>
                    ) : null}
                  </div>
                  {taskHref ? (
                    <Link
                      href={taskHref}
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-800"
                    >
                      Open Book
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={openTaskModal}
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-800"
                    >
                      Manage Task
                    </button>
                  )}
                </article>
              );
            })}

            {data.bookRequests.map((request) => {
              const displayTitle =
                String(request.title ?? "").trim() ||
                String(request.isbn13 ?? "").trim() ||
                "Untitled book request";

              return (
                <article
                  key={request.id}
                  className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-stone-950">{displayTitle}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-sky-800">
                      Book request · {request.status || "pending"} · {formatDate(request.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      {request.author ? `Author: ${request.author}` : "Author: —"}
                      {request.isbn13 ? ` · ISBN: ${request.isbn13}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/teacher/books/add?requestId=${encodeURIComponent(request.id)}&from=student-workspace`}
                    className="rounded-xl bg-sky-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-sky-800"
                  >
                    Open Book Request
                  </Link>
                </article>
              );
            })}

            {data.ratingFollowUps.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-stone-950">{item.bookTitle}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-purple-800">
                    Needs ratings · {item.missingRatings.join(" + ")} · Finished {formatDate(item.finishedAt)}
                  </p>
                </div>
                <Link
                  href={`/books/${encodeURIComponent(item.userBookId)}?tab=reflection&${workspaceContext(studentId)}`}
                  className="rounded-xl bg-purple-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-purple-800"
                >
                  Open Ratings
                </Link>
              </article>
            ))}
          </div>

          {data.needsAttention.length === 0 &&
          activeLearningTasks.length === 0 &&
          data.bookRequests.length === 0 &&
          data.ratingFollowUps.length === 0 ? (
            <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              No active follow-up for this student right now.
            </p>
          ) : null}
        </section>

        {taskModalOpen ? (
          <TeacherLearningTaskModal
            student={{
              display_name: data.student.display_name,
              username: data.student.username,
            }}
            taskType={taskType}
            onTaskTypeChange={(value) => updateTaskType(value as LearningTaskType)}
            taskUserBookId={taskUserBookId}
            onTaskUserBookIdChange={setTaskUserBookId}
            taskLearnerId={taskLearnerId}
            taskBooks={taskBooks}
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
            activeTasks={activeLearningTasks}
            taskBooksByStudentId={taskBooksByStudentId}
            cancellingTaskId={cancellingTaskId}
            learningTaskTypeLabel={learningTaskTypeLabel}
            onClose={closeTaskModal}
            onCreateTask={() => void createLearningTask()}
            onCancelTask={(taskId) => void cancelLearningTask(taskId)}
          />
        ) : null}
      </div>
    </main>
  );
}
