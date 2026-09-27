"use client";

import StoryNotesExperience from "../story/StoryNotesExperience";
import { CuriosityReadingExperience } from "../curiosity-reading/WordTimerExperience";
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

  const [followRefreshKey, setFollowRefreshKey] = useState(0);
  const [view, setView] = useState<"follow" | "curiosity" | "journal">(searchParams.get("view") === "curiosity" ? "curiosity" : searchParams.get("view") === "journal" ? "journal" : "follow");
  const [openedCuriosity, setOpenedCuriosity] = useState(searchParams.get("view") === "curiosity");
  const [openedJournal, setOpenedJournal] = useState(searchParams.get("view") === "curiosity" || searchParams.get("view") === "journal");
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
                  Teacher Book Workspace
                </h1>
                <p className="mt-1 truncate text-sm font-semibold text-stone-500">
                  {lessonContext.book.title ?? "Book"}{lessonContext.book.author ? ` - ${lessonContext.book.author}` : ""}
                </p>
              </div>
            </div>

            {lessonContext.students.length > 1 ? (
              <label className="block w-full md:w-64">
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

        <nav className="my-4 flex flex-wrap gap-2" aria-label="Teacher book modes">
          {([['follow', 'Follow-Along'], ['curiosity', 'Curiosity Read'], ['journal', 'Teacher Journal']] as const).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={view === key}
              onClick={() => { setView(key); if (key === "follow" && view !== "follow") setFollowRefreshKey(value => value + 1); if (key === "curiosity") setOpenedCuriosity(true); if (key !== "follow") setOpenedJournal(true); }}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${view === key ? "bg-stone-900 text-white" : "bg-white text-stone-700"}`}>{label}</button>
          ))}
        </nav>
        <section className={view === "follow" ? `grid min-w-0 gap-4 ${selectedStudent ? "xl:grid-cols-2" : ""}` : "hidden"}>
          <aside className="min-w-0">
            <TeacherFollowAlongPanel refreshKey={followRefreshKey} teacherBookId={lessonContext.teacherBookId} presentation="embedded" lessonDisplayOnly hideHeader
              emptyMessage="No Follow-Along words have been prepared for this book yet." />
          </aside>
          {selectedStudent ? (
            <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <LiveLessonQuickAddPanel key={selectedStudent.studentUserBookId} studentId={selectedStudent.studentId}
                userBookId={selectedStudent.studentUserBookId} sourceUserBookId={userBookId}
                chapterSuggestions={lessonContext.chapterSuggestions ?? []} embedded />
            </div>
          ) : lessonContext.students.length > 0 ? (
            <p className="text-sm text-stone-600">Choose a student to add words to their lesson list.</p>
          ) : null}
        </section>
        <section className={view === "follow" ? "hidden" : `grid min-w-0 gap-4 ${view === "curiosity" ? "xl:grid-cols-2" : ""}`}>
          <div className={view === "curiosity" ? "min-w-0" : "hidden"}>
            {openedCuriosity ? <CuriosityReadingExperience embedded workspaceCompact /> : null}
          </div>
          <div className="min-w-0">
            {openedJournal ? <StoryNotesExperience teaching embedded /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
