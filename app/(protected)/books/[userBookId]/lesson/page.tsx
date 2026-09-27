"use client";

import StoryNotesExperience from "../story/StoryNotesExperience";
import { CuriosityReadingExperience } from "../curiosity-reading/WordTimerExperience";
import { BookProgressProvider } from "@/components/books/BookProgressProvider";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TeacherFollowAlongPanel } from "../../../teacher/library/[teacherBookId]/follow/components/TeacherFollowAlongPanel";
import LiveLessonQuickAddPanel from "../../../teacher/students/[studentId]/books/[userBookId]/lesson-add/LiveLessonQuickAddPanel";

type LessonStudent = {
  lessonBookId: string | null;
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
  saveWordTargets?: Omit<LessonStudent, "lessonBookId">[];
  chapterSuggestions: ChapterSuggestion[];
};

export default function TeachingLessonPage() {
  const params = useParams<{ userBookId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userBookId = params.userBookId ?? "";
  const requestedView = searchParams.get("view");
  const view = requestedView === "curiosity" ? "curiosity" : requestedView === "journal" ? "journal" : "follow";
  // Journal ownership and loading never depend on a vocabulary recipient.
  const selectedStudentUserBookId = view === "journal" ? "" : searchParams.get("studentUserBookId") ?? "";
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
        if (view === "curiosity") query.set("view", "curiosity");
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
  }, [router, selectedStudentUserBookId, userBookId, view]);

  const wordTargets = lessonContext?.saveWordTargets ?? lessonContext?.students ?? [];

  const selectedStudent = useMemo(() => {
    if (!lessonContext) return null;
    if (selectedStudentUserBookId) {
      return (
        (view === "curiosity" ? wordTargets : lessonContext.students).find(
          (student) => student.studentUserBookId === selectedStudentUserBookId
        ) ?? null
      );
    }
    return null;
  }, [lessonContext, selectedStudentUserBookId, view, wordTargets]);

  const returnHref = `/books/${encodeURIComponent(userBookId)}?mode=teaching`;

  function selectStudent(studentUserBookId: string) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("view", view);
    if (studentUserBookId) query.set("studentUserBookId", studentUserBookId);
    else query.delete("studentUserBookId");
    router.replace(`/books/${encodeURIComponent(userBookId)}/lesson?${query}`);
  }
  const quickAddStudent = selectedStudent ?? (lessonContext?.students.length === 1 ? lessonContext.students[0] : null);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-stone-200 bg-white p-6 text-sm font-semibold text-stone-500 shadow-sm">
          Loading Teacher Book Workspace...
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
            <h1 className="text-2xl font-black text-stone-950">Teacher Book Workspace</h1>
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
                  {view === "curiosity" ? "Save Words" : view === "journal" ? "Teacher Journal" : "Follow-Along"}
                </h1>
                <p className="mt-1 truncate text-sm font-semibold text-stone-500">
                  {lessonContext.book.title ?? "Book"}{lessonContext.book.author ? ` - ${lessonContext.book.author}` : ""}
                </p>
              </div>
            </div>

            {view === "curiosity" ? <label className="block w-full md:w-64">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-500">Save words for</span>
              <select value={selectedStudent?.studentUserBookId ?? ""} onChange={event => selectStudent(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-900 shadow-sm">
                <option value="">Me / My Book</option>
                {wordTargets.map(student => <option key={student.studentUserBookId} value={student.studentUserBookId}>{student.studentName}</option>)}
              </select>
            </label> : null}
          </div>
        </section>

        {view === "follow" ? <section className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
          <aside className="min-w-0">
            <h2 className="mb-3 text-lg font-bold">My Follow-Along</h2>
            <TeacherFollowAlongPanel teacherBookId={lessonContext.teacherBookId} presentation="embedded" lessonDisplayOnly hideHeader
              emptyMessage="No Follow-Along words have been prepared for this book yet." />
          </aside>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3">
            <h2 className="mb-3 text-lg font-bold">Student Quick Add</h2>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-bold text-stone-500">Student Quick Add for</span>
              <select value={quickAddStudent?.studentUserBookId ?? ""} onChange={event => selectStudent(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-900">
                <option value="">Choose a student</option>
                {lessonContext.students.map(student => <option key={student.studentUserBookId} value={student.studentUserBookId}>{student.studentName}</option>)}
              </select>
            </label>
            {quickAddStudent ? <LiveLessonQuickAddPanel key={quickAddStudent.studentUserBookId}
              studentId={quickAddStudent.studentId} userBookId={quickAddStudent.studentUserBookId}
              sourceUserBookId={lessonContext.sourceUserBookId} chapterSuggestions={lessonContext.chapterSuggestions ?? []} embedded />
              : <p className="text-sm text-stone-600">{lessonContext.students.length ? "Choose a student to add words to their vocabulary." : "No students are assigned to this book yet. My Follow-Along is ready to use on its own."}</p>}
          </div>
        </section> : view === "curiosity" ? (
          <section className="mt-4 min-w-0">
            <BookProgressProvider key={selectedStudent?.studentUserBookId ?? userBookId}
              userBookId={selectedStudent?.studentUserBookId ?? userBookId} readOnly>
              <CuriosityReadingExperience targetUserBookId={selectedStudent?.studentUserBookId ?? userBookId}
                embedded workspaceCompact wordCaptureOnly />
            </BookProgressProvider>
          </section>
        ) : <section className="mt-4 min-w-0"><StoryNotesExperience teaching embedded /></section>}

      </div>
    </main>
  );
}
