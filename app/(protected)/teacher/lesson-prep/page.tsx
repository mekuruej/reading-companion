// Teacher Lesson Prep
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PrepCard = {
  title: string;
  href?: string;
  eyebrow: string;
  description: string;
  disabled?: boolean;
};

type LearningTaskAlert = {
  id: string;
  learner_id: string;
  task_type: string;
  title: string;
  instructions: string | null;
  status: "assigned" | "in_progress" | "completed" | "cancelled";
  completed_at: string | null;
  due_on: string | null;
  created_at: string;
};

type TaskLearnerProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
};

const prepCards: PrepCard[] = [
  {
    title: "Students",
    href: "/teacher/students?from=lesson-prep",
    eyebrow: "Learners",
    description: "Open student cards, libraries, follow-up areas, and learner-specific teacher tools.",
  },
  {
    title: "Teaching Books",
    href: "/teacher/library?from=lesson-prep",
    eyebrow: "Book materials",
    description: "Manage books, notes, vocabulary, and reusable reading support for teaching.",
  },
  {
    title: "Book Clubs",
    href: "/teacher/clubs?from=lesson-prep",
    eyebrow: "Groups",
    description: "Plan club groups, weekly readings, and shared support materials.",
  },
];

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function learningTaskTypeLabel(taskType: string) {
  if (taskType === "reread_pages") return "Reread pages";
  if (taskType === "review_book_words") return "Book flashcards";
  if (taskType === "kanji_reading_practice") return "Kanji Reading";
  if (taskType === "listening") return "Listening";
  return "Learning task";
}

function statusLabel(status: string) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  if (status === "assigned") return "Assigned";
  return "Task";
}

function formatTaskDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function taskDismissStorageKey(teacherId: string) {
  return `mekuru_teacher_lesson_prep_dismissed_tasks_${teacherId}`;
}

function readDismissedTaskIds(teacherId: string) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(taskDismissStorageKey(teacherId));
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeDismissedTaskIds(teacherId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(taskDismissStorageKey(teacherId), JSON.stringify(Array.from(ids)));
}

function PrepCardGrid({ cards }: { cards: PrepCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const cardContent = (
          <div
            className={`h-full rounded-3xl border p-5 shadow-sm transition ${
              card.disabled
                ? "border-stone-200 bg-stone-50 text-stone-500"
                : "border-stone-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              {card.eyebrow}
            </p>
            <h2 className="mt-3 text-xl font-black text-stone-900">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{card.description}</p>
            <p className="mt-4 text-sm font-semibold text-stone-900">
              {card.disabled ? "Placeholder" : "Open →"}
            </p>
          </div>
        );

        if (!card.href || card.disabled) {
          return <div key={card.title}>{cardContent}</div>;
        }

        return (
          <Link key={card.title} href={card.href}>
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}

export default function TeacherLessonPrepPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [viewerIsSuperTeacher, setViewerIsSuperTeacher] = useState(false);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [taskAlertsLoading, setTaskAlertsLoading] = useState(false);
  const [taskAlerts, setTaskAlerts] = useState<LearningTaskAlert[]>([]);
  const [taskLearnersById, setTaskLearnersById] = useState<Record<string, TaskLearnerProfile>>({});
  const [taskAlertMessage, setTaskAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkTeacherAccess() {
      setAccessChecked(false);
      setCanAccess(false);
      setViewerIsSuperTeacher(false);
      setMessage("");

      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (cancelled) return;

      if (authError || !user) {
        setMessage("Please sign in to use Lesson Prep.");
        setCurrentTeacherId(null);
        setViewerIsSuperTeacher(false);
        setAccessChecked(true);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        setMessage(profileError.message ?? "Could not load teacher profile.");
        setAccessChecked(true);
        return;
      }

      const isTeacher =
        profile?.role === "teacher" ||
        profile?.role === "super_teacher" ||
        isSuperTeacherFlag(profile?.is_super_teacher);
      const isSuperTeacher =
        profile?.role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);

      setCanAccess(isTeacher);
      setViewerIsSuperTeacher(isSuperTeacher);
      setCurrentTeacherId(isTeacher ? user.id : null);
      setMessage(isTeacher ? "" : "Teacher access is required.");
      setAccessChecked(true);

      if (isTeacher) {
        void loadTaskAlerts(user.id);
      }
    }

    void checkTeacherAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadTaskAlerts(teacherId: string) {
    setTaskAlertsLoading(true);
    setTaskAlertMessage(null);

    try {
      const { data, error } = await supabase
        .from("learning_tasks")
        .select("id, learner_id, task_type, title, instructions, status, completed_at, due_on, created_at")
        .eq("created_by", teacherId)
        .in("status", ["assigned", "completed"])
        .is("cancelled_at", null)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const dismissedTaskIds = readDismissedTaskIds(teacherId);
      const nextTasks = ((data ?? []) as LearningTaskAlert[]).filter(
        (task) => !dismissedTaskIds.has(task.id)
      );

      setTaskAlerts(nextTasks);

      const learnerIds = Array.from(new Set(nextTasks.map((task) => task.learner_id).filter(Boolean)));
      if (learnerIds.length === 0) {
        setTaskLearnersById({});
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", learnerIds);

      if (profilesError) throw profilesError;

      const nextProfilesById = Object.fromEntries(
        ((profiles ?? []) as TaskLearnerProfile[]).map((profile) => [profile.id, profile])
      );
      setTaskLearnersById(nextProfilesById);
    } catch (error: any) {
      console.error("Error loading Lesson Prep task alerts:", error);
      setTaskAlertMessage(error?.message ?? "Could not load assigned task alerts.");
      setTaskAlerts([]);
      setTaskLearnersById({});
    } finally {
      setTaskAlertsLoading(false);
    }
  }

  function clearTaskAlert(taskId: string) {
    if (!currentTeacherId) return;

    const dismissedTaskIds = readDismissedTaskIds(currentTeacherId);
    dismissedTaskIds.add(taskId);
    writeDismissedTaskIds(currentTeacherId, dismissedTaskIds);
    setTaskAlerts((prev) => prev.filter((task) => task.id !== taskId));
  }

  const visiblePrepCards = prepCards.map((card) =>
    card.href === "/teacher/students?from=lesson-prep" && viewerIsSuperTeacher
      ? {
          ...card,
          title: "Students / Users",
          description:
            "Open student cards, user libraries, follow-up areas, and learner-specific teacher tools.",
        }
      : card
  );

  if (!accessChecked) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-gray-500">Loading teacher access...</p>
        </div>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Teacher access
          </p>
          <h1 className="mt-2 text-2xl font-black text-stone-900">Lesson Prep</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "Teacher access is required."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href="/teacher" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            ← Teacher Hub
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Teacher workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
            Lesson Prep
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Start from students, teaching books, or book clubs. Reusable book materials can handle trial and lesson prep without a separate person-specific prep flow.
          </p>
        </section>

        <section className="mt-6">
          <PrepCardGrid cards={visiblePrepCards} />
        </section>

        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Alerts
              </p>
              <h2 className="mt-2 text-xl font-black text-stone-900">
                Assigned Tasks
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Recently assigned and completed learner tasks from this teacher account.
              </p>
            </div>
            <Link
              href="/teacher/students"
              className="inline-flex rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {viewerIsSuperTeacher ? "Open Students / Users →" : "Open Students →"}
            </Link>
          </div>

          {taskAlertsLoading ? (
            <p className="mt-4 text-sm text-stone-500">Loading assigned tasks...</p>
          ) : taskAlertMessage ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {taskAlertMessage}
            </p>
          ) : taskAlerts.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              No assigned task alerts are waiting right now.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {taskAlerts.map((task) => {
                const learner = taskLearnersById[task.learner_id];
                const learnerName =
                  learner?.display_name || learner?.username || "Student";
                const completedDate = formatTaskDate(task.completed_at);
                const dueDate = formatTaskDate(task.due_on);
                const isCompleted = task.status === "completed";

                return (
                  <div
                    key={task.id}
                    className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-stone-900">
                          {learningTaskTypeLabel(task.task_type)}
                        </h3>
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">
                          {learnerName}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-stone-800">
                        {task.title}
                      </p>
                      {task.instructions ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-stone-600">
                          {task.instructions}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                        {isCompleted && completedDate
                          ? `Completed ${completedDate}`
                          : dueDate
                            ? `Due ${dueDate}`
                            : "No due date"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => clearTaskAlert(task.id)}
                      className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 hover:shadow-md ${
                        isCompleted
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      Clear alert
                    </button>
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
