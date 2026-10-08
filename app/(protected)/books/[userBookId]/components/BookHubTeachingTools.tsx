"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const MAX_RESUME_AT_LENGTH = 500;

type StudentStudyLinkRow = {
  lessonBookId: string | null;
  studentId: string;
  studentName: string;
  userBookId: string | null;
  isAttached: boolean;
  resumeAtText: string | null;
  resumeUpdatedAt: string | null;
  hasDuplicateActiveBook?: boolean;
};

type BookHubTeachingToolsProps = {
  userBookId: string;
  canUseBulkAdd: boolean;
  canUseStoryNotes: boolean;
  onBulkAdd: () => void;
  onStoryNotes: () => void;
  onReadingExperiences: (personId?: string) => void;
  onTeachingAssessment: () => void;
  onStudentFollowAlong: (studentUserBookId: string) => void;
  onStudentSaveWords: (studentUserBookId: string) => void;
  onStudentFlashcards: (studentUserBookId: string) => void;
  onStudentVocabularyList: (studentUserBookId: string) => void;
};

function sortStudentStudyLinks(students: StudentStudyLinkRow[]) {
  return [...students].sort((a, b) => {
    if (a.isAttached !== b.isAttached) return a.isAttached ? -1 : 1;
    return a.studentName.localeCompare(b.studentName);
  });
}

function TeachingUtilityButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-800 shadow-sm transition hover:-translate-y-[1px] hover:border-stone-400 hover:bg-stone-50 hover:shadow-md"
      title={description}
    >
      {title}
    </button>
  );
}

function TeachingActionSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-black text-stone-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}

export default function BookHubTeachingTools({
  userBookId,
  canUseBulkAdd,
  canUseStoryNotes,
  onBulkAdd,
  onStoryNotes,
  onReadingExperiences,
  onTeachingAssessment,
  onStudentFollowAlong,
  onStudentSaveWords,
  onStudentFlashcards,
  onStudentVocabularyList,
}: BookHubTeachingToolsProps) {
  const [students, setStudents] = useState<StudentStudyLinkRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [mutatingStudentId, setMutatingStudentId] = useState<string | null>(null);
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [messageById, setMessageById] = useState<Record<string, string>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const apiHref = useMemo(
    () => `/api/books/${encodeURIComponent(userBookId)}/teaching-student-progress`,
    [userBookId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      setLoadingStudents(true);
      setStudentsError(null);

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
          throw new Error(data?.error ?? "Could not load connected students.");
        }

        if (!cancelled) {
          const nextStudents = sortStudentStudyLinks(
            (data?.students ?? []) as StudentStudyLinkRow[]
          );
          setStudents(nextStudents);
          setDrafts(
            Object.fromEntries(
              nextStudents.map((student) => [
                student.lessonBookId ?? student.studentId,
                student.resumeAtText ?? "",
              ])
            )
          );
        }
      } catch (error: any) {
        if (!cancelled) {
          setStudents([]);
          setDrafts({});
          setStudentsError(error?.message ?? "Could not load connected students.");
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    }

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [apiHref]);

  async function saveResumePoint(student: StudentStudyLinkRow) {
    if (!student.lessonBookId) return;
    if (savingById[student.lessonBookId]) return;

    const nextText = (drafts[student.lessonBookId] ?? "")
      .trim()
      .slice(0, MAX_RESUME_AT_LENGTH);
    const previousStudent = student;
    const previousDraft = drafts[student.lessonBookId] ?? "";

    setSavingById((prev) => ({ ...prev, [student.lessonBookId]: true }));
    setStudentsError(null);
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
    } catch (error: any) {
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
          error?.message ?? "Could not save this resume point.",
      }));
    } finally {
      setSavingById((prev) => ({ ...prev, [student.lessonBookId]: false }));
    }
  }

  async function addStudentBook(student: StudentStudyLinkRow) {
    if (mutatingStudentId) return;

    setMutatingStudentId(student.studentId);
    setStudentsError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(apiHref, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          studentId: student.studentId,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not add this student book.");
      }

      setStudents((prev) =>
        sortStudentStudyLinks(
          prev.map((item) =>
            item.studentId === student.studentId
              ? {
                  ...item,
                  lessonBookId: data.lessonBookId ?? item.lessonBookId,
                  userBookId: data.userBookId ?? item.userBookId,
                  isAttached: true,
                  resumeAtText: null,
                  resumeUpdatedAt: null,
                }
              : item
          )
        )
      );
      setDrafts((prev) => ({
        ...prev,
        [data.lessonBookId ?? student.studentId]: "",
      }));
    } catch (error: any) {
      setStudentsError(error?.message ?? "Could not add this student book.");
    } finally {
      setMutatingStudentId(null);
    }
  }

  async function removeStudentBook(student: StudentStudyLinkRow) {
    if (mutatingStudentId || !student.userBookId) return;

    const ok = window.confirm(
      `Remove this book from ${student.studentName}'s teaching tools?\n\nThe book will stay in their library. Reading sessions, saved words, reflections, ratings, and study history will not be deleted. You can add it back later.`
    );

    if (!ok) return;

    setMutatingStudentId(student.studentId);
    setStudentsError(null);

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
          action: "remove",
          studentId: student.studentId,
          userBookId: student.userBookId,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not remove this student book.");
      }

      setStudents((prev) =>
        sortStudentStudyLinks(
          prev.map((item) =>
            item.studentId === student.studentId
              ? {
                  ...item,
                  lessonBookId: null,
                  userBookId: null,
                  isAttached: false,
                  resumeAtText: null,
                  resumeUpdatedAt: null,
                  hasDuplicateActiveBook: false,
                }
              : item
          )
        )
      );
    } catch (error: any) {
      setStudentsError(error?.message ?? "Could not remove this student book.");
    } finally {
      setMutatingStudentId(null);
    }
  }

  return (
    <div className="space-y-6 pb-2">
      <TeachingActionSection
        title="Teaching Tools"
        description="ページをめくって、教えよう！"
      >
        <div className="flex flex-wrap gap-2 pt-1">
          <TeachingUtilityButton
            title="Teaching Assessment"
            description="Your overall judgment of this book as teaching material."
            onClick={onTeachingAssessment}
          />
          <TeachingUtilityButton
            title="Reading Experiences"
            description="Records of reading this book with specific people."
            onClick={() => onReadingExperiences()}
          />
          {canUseStoryNotes ? <TeachingUtilityButton title="Teacher Journal" description="Your private notes and prep for this book." onClick={onStoryNotes} /> : null}
          {canUseBulkAdd ? (
            <TeachingUtilityButton
              title="Bulk Add Lesson Words"
              description="Add several lesson words at once."
              onClick={onBulkAdd}
            />
          ) : null}
        </div>
      </TeachingActionSection>

      <TeachingActionSection
        title="Student Study Tools"
        description="Open each attached student's flashcards or vocabulary list for this book."
      >
        {loadingStudents ? (
          <p className="text-sm font-semibold text-stone-500">
            Loading connected students...
          </p>
        ) : studentsError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            {studentsError}
          </p>
        ) : students.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-semibold text-stone-500">
            No students are connected to this book yet.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {students.map((student) => {
              const updatedAt = formatUpdatedAt(student.resumeUpdatedAt);
              const draftKey = student.lessonBookId ?? student.studentId;
              const draft = drafts[draftKey] ?? "";
              const savedMessage = messageById[draftKey];
              const rowError = errorById[draftKey];
              const isSaving = Boolean(student.lessonBookId && savingById[student.lessonBookId]);
              const isMutating = mutatingStudentId === student.studentId;

              return (
                <article
                  key={draftKey}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-stone-950">
                        {student.studentName}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        {student.isAttached
                          ? student.resumeAtText
                            ? <>Resume at <span className="font-bold text-stone-700">{student.resumeAtText}</span></>
                            : "Resume point not set."
                          : "Not attached to this book."}
                      </p>
                    </div>
                    {student.hasDuplicateActiveBook ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                        Duplicate active book
                      </span>
                    ) : null}
                  </div>

                  {student.isAttached ? (
                    <details className="mt-2">
                      <summary className="w-fit cursor-pointer text-xs font-semibold text-stone-500 hover:text-stone-800">
                        Edit resume point
                      </summary>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={draft}
                          onChange={(event) => {
                            const nextValue = event.target.value.slice(
                              0,
                              MAX_RESUME_AT_LENGTH
                            );
                            setDrafts((prev) => ({
                              ...prev,
                              [draftKey]: nextValue,
                            }));
                            setMessageById((prev) => ({
                              ...prev,
                              [draftKey]: "",
                            }));
                            setErrorById((prev) => ({
                              ...prev,
                              [draftKey]: "",
                            }));
                          }}
                          maxLength={MAX_RESUME_AT_LENGTH}
                          placeholder="Example: Page 45 - 打算"
                          className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                        <button
                          type="button"
                          onClick={() => void saveResumePoint(student)}
                          disabled={isSaving}
                          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save resume point"}
                        </button>
                      </div>
                    </details>
                  ) : null}

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                    {updatedAt ? (
                      <span className="text-stone-500">Updated {updatedAt}</span>
                    ) : null}
                    {savedMessage ? (
                      <span className="text-emerald-700">{savedMessage}</span>
                    ) : null}
                    {rowError ? <span className="text-red-700">{rowError}</span> : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {student.isAttached && student.userBookId ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onStudentFollowAlong(student.userBookId as string)}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-blue-700 bg-blue-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-800"
                        >
                          Follow-Along
                        </button>
                        <button
                          type="button"
                          onClick={() => onStudentSaveWords(student.userBookId as string)}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-800 hover:bg-violet-100"
                        >
                          Save Words
                        </button>
                        <button
                          type="button"
                          onClick={() => onStudentFlashcards(student.userBookId as string)}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-bold text-stone-800 hover:bg-stone-100"
                        >
                          Flashcards
                        </button>
                        <button
                          type="button"
                          onClick={() => onStudentVocabularyList(student.userBookId as string)}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-bold text-stone-800 hover:bg-stone-100"
                        >
                          Vocabulary List
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onReadingExperiences(student.studentId)}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg px-2 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                    >
                      Add Reading Experience
                    </button>
                  </div>

                  <div className="mt-2 border-t border-stone-200 pt-2">
                    {student.isAttached ? (
                      <button
                        type="button"
                        onClick={() => void removeStudentBook(student)}
                        disabled={isMutating}
                        className="text-xs font-medium text-stone-500 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isMutating ? "Removing..." : "Remove from student tools"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void addStudentBook(student)}
                        disabled={isMutating}
                        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-400 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isMutating ? "Adding..." : "Add to Student"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </TeachingActionSection>
    </div>
  );
}
