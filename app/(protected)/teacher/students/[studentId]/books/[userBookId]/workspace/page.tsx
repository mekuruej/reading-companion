// Student Book Workspace
//
// Teacher-facing cockpit for one linked student and one student-owned book.
// Student work stays anchored to the student's user_books row; teacher support
// resolves the teacher’s own Library row using the shared catalog book_id.

"use client";

import Link from "next/link";
import { isAllUserTeacher } from "@/lib/teacher/targetUserAccess";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ensureTeacherBookSupport } from "@/lib/teacher/ensureTeacherBookSupport";
import { getBookIdentity } from "@/lib/books/bookIdentity";
import { bookTypeTitleLabel } from "@/lib/books/bookTypes";
import TeacherNotebookPanel from "../../../../../components/TeacherNotebookPanel";
import { TeacherFollowAlongPanel } from "../../../../../library/[teacherBookId]/follow/components/TeacherFollowAlongPanel";

type StudentProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  level: string | null;
};

type BookMeta = {
  id: string;
  title: string | null;
  title_reading?: string | null;
  author: string | null;
  author_english_name?: string | null;
  author_reading?: string | null;
  cover_url: string | null;
  isbn13: string | null;
  isbn: string | null;
  page_count: number | null;
  book_type: string | null;
  language_code?: string | null;
};

type StudentUserBook = {
  id: string;
  user_id: string;
  book_id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  format_type: string | null;
  progress_mode: string | null;
  books: BookMeta | BookMeta[] | null;
};

type TeacherBookSupport = {
  id: string;
  user_book_id: string | null;
};

function firstBook(book: StudentUserBook["books"]) {
  if (Array.isArray(book)) return book[0] ?? null;
  return book ?? null;
}

function isSuperTeacherRole(profile: any) {
  return (
    profile?.role === "admin" ||
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

function isTeacherRole(profile: any) {
  return profile?.role === "teacher" || isSuperTeacherRole(profile);
}

function bookTypeLabel(value: string | null | undefined) {
  return bookTypeTitleLabel(value);
}

function statusLabel(userBook: StudentUserBook | null) {
  if (!userBook) return "Student book";
  if (userBook.finished_at) return "Finished";
  if (userBook.dnf_at) return "DNF";
  if (userBook.started_at) return "Reading";
  return "Not started";
}


export default function StudentBookWorkspacePage() {
  const params = useParams<{ studentId: string; userBookId: string }>();
  const studentId = params.studentId ?? "";
  const userBookId = params.userBookId ?? "";

  const [indexElevated, setIndexElevated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentBook, setStudentBook] = useState<StudentUserBook | null>(null);
  const [teacherBook, setTeacherBook] = useState<TeacherBookSupport | null>(null);

  useEffect(() => {
    void loadWorkspace();
  }, [studentId, userBookId]);

  useEffect(() => {
    if (loading || !studentBook) return;
    if (window.location.hash !== "#student-lesson-follow-along") return;

    window.requestAnimationFrame(() => {
      document
        .getElementById("student-lesson-follow-along")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading, studentBook]);

  async function loadWorkspace() {
    setLoading(true);
    setMessage("");
    setStudent(null);
    setStudentBook(null);
    setTeacherBook(null);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const currentUser = auth?.user;

      if (authError || !currentUser) {
        setMessage("Please sign in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setIndexElevated(isAllUserTeacher(profile));

      const isSuperTeacher = isSuperTeacherRole(profile);
      if (!isTeacherRole(profile)) {
        setMessage("Teacher access is required.");
        return;
      }

      const { data: userBookRow, error: userBookError } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          book_id,
          started_at,
          finished_at,
          dnf_at,
          format_type,
          progress_mode,
          books:book_id (
            id,
            title,
            title_reading,
            author,
            author_english_name,
            author_reading,
            cover_url,
            isbn13,
            isbn,
            page_count,
            book_type,
            language_code
          )
        `
        )
        .eq("id", userBookId)
        .maybeSingle();

      if (userBookError) throw userBookError;

      if (!userBookRow) {
        setMessage("This student book could not be found.");
        return;
      }

      const loadedStudentBook = userBookRow as StudentUserBook;
      if (loadedStudentBook.user_id !== studentId) {
        setMessage("This book does not belong to that student.");
        return;
      }

      if (!isSuperTeacher) {
        const { data: teacherStudentLink, error: teacherStudentError } = await supabase
          .from("teacher_students")
          .select("id")
          .eq("teacher_id", currentUser.id)
          .eq("student_id", studentId)
          .is("archived_at", null)
          .limit(1)
          .maybeSingle();

        if (teacherStudentError) throw teacherStudentError;

        if (!teacherStudentLink) {
          setMessage("You do not have access to this student's book.");
          return;
        }
      }

      const { data: studentProfile, error: studentProfileError } = await supabase
        .from("profiles")
        .select("id, display_name, username, level")
        .eq("id", studentId)
        .maybeSingle();

      if (studentProfileError) throw studentProfileError;

      setStudent((studentProfile ?? null) as StudentProfile | null);
      setStudentBook(loadedStudentBook);
      setTeacherBook(
        await ensureTeacherBookSupport(supabase, currentUser.id, loadedStudentBook.book_id)
      );
    } catch (error: any) {
      console.error("Error loading Student Book Workspace:", error);
      setMessage(error?.message ?? "Could not load Student Book Workspace.");
    } finally {
      setLoading(false);
    }
  }

  const book = firstBook(studentBook?.books ?? null);
  const bookIdentity = getBookIdentity(book);
  const studentName = student?.display_name || student?.username || "Student";
  const backHref = student?.username ? `/users/${student.username}/books` : "/teacher/students";

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          Loading Student Book Workspace...
        </div>
      </main>
    );
  }

  if (!studentBook) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href="/teacher/students" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            &lt;- {indexElevated ? "Users" : "Students"}
          </Link>
          <h1 className="mt-4 text-3xl font-black text-stone-950">Student Book Workspace</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "This Student Book Workspace could not be loaded."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href={backHref} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
          &lt;- Student Library
        </Link>

        {message ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </div>
        ) : null}

        <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-5 md:grid-cols-[120px_minmax(0,1fr)] md:items-start">
            {book?.cover_url ? (
              <img
                src={book.cover_url}
                alt=""
                className="h-40 w-28 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-40 w-28 items-center justify-center rounded-2xl bg-stone-200 text-xs font-black uppercase tracking-wide text-stone-500">
                No cover
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                Student Book Workspace
              </p>
              <h1 className="mt-2 text-3xl font-black text-stone-950 md:text-4xl">
                {bookIdentity.title}
              </h1>
              {bookIdentity.author ? (
                <p className="mt-2 text-sm font-semibold text-stone-600">{bookIdentity.author}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide text-stone-500">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-800">
                  {studentName}
                </span>
                {student?.level ? (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                    {student.level}
                  </span>
                ) : null}
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                  {statusLabel(studentBook)}
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                  {bookTypeLabel(book?.book_type)}
                </span>
                {book?.page_count != null ? (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                    {book.page_count} pages
                  </span>
                ) : null}
                {book?.isbn13 || book?.isbn ? (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                    ISBN {book.isbn13 || book.isbn}
                  </span>
                ) : null}
              </div>

              <p className="mt-5 max-w-3xl text-sm leading-6 text-stone-600">
                This workspace is for teaching this student through this book. Words captured here stay as teacher-only drafts until you review them in Bulk Add.
              </p>
            </div>
          </div>
        </section>

        <section id="student-lesson-follow-along" className="mt-6 scroll-mt-6">
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Student Lesson · {studentName}</p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">Teacher Follow-Along + Quick Add</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Use prepared support while reading together, and capture words for later review.
            </p>
          </div>

          {teacherBook ? (
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <div className="min-w-0">
                <TeacherFollowAlongPanel
                  teacherBookId={teacherBook.id}
                  contextLabel={`Student Lesson · ${studentName}`}
                  contextDetail={bookIdentity.title}
                  presentation="embedded"
                  lessonDisplayOnly
                  hideHeader
                />
              </div>
              <div className="min-w-0">
                <TeacherNotebookPanel
                  key={`${studentId}:${userBookId}:${teacherBook.id}`}
                  teacherBookId={teacherBook.id}
                  bookId={book?.id}
                  userBookId={userBookId}
                  studentId={studentId}
                  studentName={studentName}
                  enableWordCapture
                  wordCaptureOnly
                  mode="lesson"
                  compact
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
              Teacher Follow-Along support could not be prepared for this book.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
