import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const MAX_RESUME_AT_LENGTH = 500;

type StudentProgressRow = {
  lessonBookId: string;
  studentId: string;
  studentName: string;
  userBookId: string;
  resumeAtText: string | null;
  resumeUpdatedAt: string | null;
  hasDuplicateActiveBook?: boolean;
};

type BookHubStudentsProgressProps = {
  userBookId: string;
};

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}

export default function BookHubStudentsProgress({
  userBookId,
}: BookHubStudentsProgressProps) {
  const [students, setStudents] = useState<StudentProgressRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [messageById, setMessageById] = useState<Record<string, string>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const apiHref = useMemo(
    () => `/api/books/${encodeURIComponent(userBookId)}/teaching-student-progress`,
    [userBookId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(apiHref, {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error ?? "Could not load Students' Progress."
          );
        }

        if (cancelled) return;

        const nextStudents = (data?.students ?? []) as StudentProgressRow[];
        setStudents(nextStudents);
        setDrafts(
          Object.fromEntries(
            nextStudents.map((student) => [
              student.lessonBookId,
              student.resumeAtText ?? "",
            ])
          )
        );
      } catch (loadError: any) {
        if (!cancelled) {
          setStudents([]);
          setDrafts({});
          setError(loadError?.message ?? "Could not load Students' Progress.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [apiHref]);

  async function saveResumePoint(student: StudentProgressRow) {
    if (savingById[student.lessonBookId]) return;

    const nextText = (drafts[student.lessonBookId] ?? "")
      .trim()
      .slice(0, MAX_RESUME_AT_LENGTH);
    const previousStudent = student;
    const previousDraft = drafts[student.lessonBookId] ?? "";

    setSavingById((prev) => ({ ...prev, [student.lessonBookId]: true }));
    setError(null);
    setMessageById((prev) => ({ ...prev, [student.lessonBookId]: "" }));
    setErrorById((prev) => ({ ...prev, [student.lessonBookId]: "" }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(apiHref, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          lessonBookId: student.lessonBookId,
          resumeAtText: nextText,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not save this resume point.");
      }

      setStudents((prev) =>
        prev.map((item) =>
          item.lessonBookId === student.lessonBookId
            ? {
                ...item,
                resumeAtText: data.resumeAtText ?? null,
                resumeUpdatedAt: data.resumeUpdatedAt ?? null,
              }
            : item
        )
      );
      setDrafts((prev) => ({
        ...prev,
        [student.lessonBookId]: data.resumeAtText ?? "",
      }));
      setMessageById((prev) => ({
        ...prev,
        [student.lessonBookId]: data.resumeAtText
          ? "Resume point saved."
          : "Resume point cleared.",
      }));
      setErrorById((prev) => ({ ...prev, [student.lessonBookId]: "" }));
    } catch (saveError: any) {
      setStudents((prev) =>
        prev.map((item) =>
          item.lessonBookId === previousStudent.lessonBookId
            ? previousStudent
            : item
        )
      );
      setDrafts((prev) => ({
        ...prev,
        [student.lessonBookId]: previousDraft,
      }));
      setErrorById((prev) => ({
        ...prev,
        [student.lessonBookId]:
          saveError?.message ?? "Could not save this resume point.",
      }));
    } finally {
      setSavingById((prev) => ({ ...prev, [student.lessonBookId]: false }));
    }
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
          Students' Progress
        </p>
        <h2 className="text-xl font-black text-stone-950">Location to Resume</h2>
      </div>

      {loading ? (
        <p className="mt-4 text-sm font-semibold text-stone-500">
          Loading connected students...
        </p>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold leading-6 text-amber-900">
          {error}
        </div>
      ) : students.length === 0 ? (
        <p className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-semibold text-stone-500">
          No students are connected to this book yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {students.map((student) => {
            const updatedAt = formatUpdatedAt(student.resumeUpdatedAt);
            const draft = drafts[student.lessonBookId] ?? "";
            const savedMessage = messageById[student.lessonBookId];
            const rowError = errorById[student.lessonBookId];
            const isSaving = Boolean(savingById[student.lessonBookId]);

            return (
              <article
                key={student.lessonBookId}
                className="rounded-xl border border-stone-200 bg-stone-50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-stone-950">
                      {student.studentName}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      {student.resumeAtText
                        ? "Resume at"
                        : "Resume point not set."}
                    </p>
                  </div>
                  {student.hasDuplicateActiveBook ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                      Duplicate active book
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={draft}
                    onChange={(event) => {
                      const nextValue = event.target.value.slice(
                        0,
                        MAX_RESUME_AT_LENGTH
                      );
                      setDrafts((prev) => ({
                        ...prev,
                        [student.lessonBookId]: nextValue,
                      }));
                      setMessageById((prev) => ({
                        ...prev,
                        [student.lessonBookId]: "",
                      }));
                      setErrorById((prev) => ({
                        ...prev,
                        [student.lessonBookId]: "",
                      }));
                    }}
                    maxLength={MAX_RESUME_AT_LENGTH}
                    placeholder="Example: Page 45 - 打算"
                    className="min-w-0 flex-1 rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-stone-900 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => void saveResumePoint(student)}
                    disabled={isSaving}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                  {updatedAt ? (
                    <span className="text-stone-500">
                      Updated {updatedAt}
                    </span>
                  ) : null}
                  {savedMessage ? (
                    <span className="text-emerald-700">
                      {savedMessage}
                    </span>
                  ) : null}
                  {rowError ? (
                    <span className="text-red-700">{rowError}</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
