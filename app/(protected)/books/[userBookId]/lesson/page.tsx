"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TeacherFollowAlongPanel } from "../../../teacher/library/[teacherBookId]/follow/components/TeacherFollowAlongPanel";
import LiveLessonQuickAddPanel from "../../../teacher/students/[studentId]/books/[userBookId]/lesson-add/LiveLessonQuickAddPanel";

type LessonStudent = {
  lessonBookId: string;
  studentId: string;
  studentUserBookId: string;
  studentName: string;
};

type ChapterSuggestion = {
  key: string;
  chapterNumber: number | null;
  chapterName: string | null;
  label: string;
  pageSummary: string;
  firstPage: number | null;
  lastPage: number | null;
  entryCount: number;
  pages: number[];
};

type LessonContext = {
  teacherBookId: string;
  sourceUserBookId: string;
  book: {
    title: string | null;
    author: string | null;
    coverUrl: string | null;
  };
  students: LessonStudent[];
  chapterSuggestions: ChapterSuggestion[];
};

export default function TeachingLessonPage() {
  const params = useParams<{ userBookId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userBookId = params.userBookId ?? "";
  const selectedStudentUserBookId = searchParams.get("studentUserBookId") ?? "";

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lessonContext, setLessonContext] = useState<LessonContext | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLessonContext() {
      setLoading(true);
      setMessage("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const query = new URLSearchParams();
        if (selectedStudentUserBookId) {
          query.set("studentUserBookId", selectedStudentUserBookId);
        }

        const response = await fetch(
          `/api/books/${encodeURIComponent(userBookId)}/teaching-lesson${
            query.toString() ? `?${query.toString()}` : ""
          }`,
          {
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : undefined,
          }
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error ?? "Could not load this teaching lesson.");
        }

        if (cancelled) return;
        const nextContext = data as LessonContext;
        setLessonContext(nextContext);

        if (!selectedStudentUserBookId && nextContext.students.length === 1) {
          const onlyStudent = nextContext.students[0];
          router.replace(
            `/books/${encodeURIComponent(userBookId)}/lesson?studentUserBookId=${encodeURIComponent(
              onlyStudent.studentUserBookId
            )}`
          );
        }
      } catch (error: any) {
        if (!cancelled) {
          setMessage(error?.message ?? "Could not load this teaching lesson.");
          setLessonContext(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (userBookId) void loadLessonContext();

    return () => {
      cancelled = true;
    };
  }, [router, selectedStudentUserBookId, userBookId]);

  const selectedStudent = useMemo(() => {
    if (!lessonContext) return null;
    if (selectedStudentUserBookId) {
      return (
        lessonContext.students.find(
          (student) => student.studentUserBookId === selectedStudentUserBookId
        ) ?? null
      );
    }
    return lessonContext.students.length === 1 ? lessonContext.students[0] : null;
  }, [lessonContext, selectedStudentUserBookId]);

  const returnHref = `/books/${encodeURIComponent(userBookId)}?mode=teaching`;

  function selectStudent(studentUserBookId: string) {
    if (!studentUserBookId) {
      router.replace(`/books/${encodeURIComponent(userBookId)}/lesson`);
      return;
    }

    router.replace(
      `/books/${encodeURIComponent(userBookId)}/lesson?studentUserBookId=${encodeURIComponent(
        studentUserBookId
      )}`
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-stone-200 bg-white p-6 text-sm font-semibold text-stone-500 shadow-sm">
          Loading Follow-Along + Add Words...
        </div>
      </main>
    );
  }

  if (message || !lessonContext) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Link href={returnHref} className="text-sm font-bold text-stone-500 hover:text-stone-900">
            &lt;- Back to Teaching Mode
          </Link>
          <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-black text-stone-950">Follow-Along + Add Words</h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {message || "This teaching lesson could not be loaded."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[96rem]">
        <Link href={returnHref} className="text-sm font-bold text-stone-500 hover:text-stone-900">
          &lt;- Back to Teaching Mode
        </Link>

        <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {lessonContext.book.coverUrl ? (
                <img
                  src={lessonContext.book.coverUrl}
                  alt=""
                  className="h-16 w-11 rounded-md object-cover shadow-sm"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                  Teaching Lesson
                </p>
                <h1 className="mt-1 truncate text-2xl font-black text-stone-950">
                  Follow-Along + Add Words
                </h1>
                <p className="mt-1 truncate text-sm font-semibold text-stone-500">
                  {lessonContext.book.title ?? "Book"}{lessonContext.book.author ? ` - ${lessonContext.book.author}` : ""}
                </p>
              </div>
            </div>

            {lessonContext.students.length > 1 ? (
              <label className="block min-w-[16rem]">
                <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                  Student
                </span>
                <select
                  value={selectedStudent?.studentUserBookId ?? ""}
                  onChange={(event) => selectStudent(event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-900 shadow-sm"
                >
                  <option value="">Choose a student</option>
                  {lessonContext.students.map((student) => (
                    <option key={student.lessonBookId} value={student.studentUserBookId}>
                      {student.studentName}
                    </option>
                  ))}
                </select>
              </label>
            ) : selectedStudent ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-900">
                {selectedStudent.studentName}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950 md:hidden">
          Teaching lesson tools are available on tablet and desktop. Return to the Book Hub to use Reader mode on this screen size.
        </section>

        {lessonContext.students.length === 0 ? (
          <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-stone-950">No connected students yet</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              This book does not have an active matching student lesson workspace. No student workspace or relationship was created.
            </p>
            <Link
              href={returnHref}
              className="mt-4 inline-flex rounded-xl bg-stone-950 px-4 py-2 text-sm font-black text-white hover:bg-stone-800"
            >
              Back to Teaching Mode
            </Link>
          </section>
        ) : !selectedStudent ? (
          <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-stone-950">Choose a student</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Select one active student workspace to load that student's current lesson list.
            </p>
          </section>
        ) : (
          <section className="mt-4 hidden gap-4 md:grid md:grid-cols-[minmax(360px,0.92fr)_minmax(560px,1.08fr)] md:items-start">
            <aside className="min-w-0 rounded-2xl border border-stone-200 bg-stone-50 p-3 shadow-sm">
              <TeacherFollowAlongPanel
                teacherBookId={lessonContext.teacherBookId}
                presentation="embedded"
                lessonDisplayOnly
                emptyMessage="No Follow-Along words have been prepared for this book yet."
                hideHeader
              />
            </aside>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <LiveLessonQuickAddPanel
                key={selectedStudent.studentUserBookId}
                studentId={selectedStudent.studentId}
                userBookId={selectedStudent.studentUserBookId}
                sourceUserBookId={userBookId}
                chapterSuggestions={lessonContext.chapterSuggestions ?? []}
                embedded
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
