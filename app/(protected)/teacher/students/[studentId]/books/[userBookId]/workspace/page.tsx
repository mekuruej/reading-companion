// Student Book Workspace
//
// Teacher-facing cockpit for one linked student and one student-owned book.
// Student work stays anchored to the student's user_books row; teacher support
// is discovered by shared book_id when the teacher already has a Teacher Book.

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TeacherUseStatus =
  | "want_to_test"
  | "testing"
  | "currently_using"
  | "approved_for_lesson"
  | "use_with_caution"
  | "do_not_use";

type StudentProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  level: string | null;
};

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  isbn13: string | null;
  isbn: string | null;
  page_count: number | null;
  book_type: string | null;
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
  teacher_use_status: TeacherUseStatus | null;
  teacher_use_note: string | null;
  user_book_id: string | null;
};

type ActionCard = {
  title: string;
  description: string;
  href: string;
  tone: "blue" | "green" | "purple" | "amber" | "stone";
};

const teacherUseStatusLabels: Record<TeacherUseStatus, string> = {
  want_to_test: "Want to Test",
  testing: "Testing",
  currently_using: "Currently Using",
  approved_for_lesson: "Approved for Lesson",
  use_with_caution: "Use with Caution",
  do_not_use: "Do Not Use",
};

function firstBook(book: StudentUserBook["books"]) {
  if (Array.isArray(book)) return book[0] ?? null;
  return book ?? null;
}

function isSuperTeacherRole(profile: any) {
  return (
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

function isTeacherRole(profile: any) {
  return profile?.role === "teacher" || isSuperTeacherRole(profile);
}

function teacherUseStatusLabel(status: TeacherUseStatus | null | undefined) {
  return teacherUseStatusLabels[status ?? "want_to_test"];
}

function teacherUseStatusBadgeClass(status: TeacherUseStatus | null | undefined) {
  switch (status ?? "want_to_test") {
    case "approved_for_lesson":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "currently_using":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "testing":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "use_with_caution":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "do_not_use":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

function bookTypeLabel(value: string | null | undefined) {
  if (!value) return "Book";
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusLabel(userBook: StudentUserBook | null) {
  if (!userBook) return "Student book";
  if (userBook.finished_at) return "Finished";
  if (userBook.dnf_at) return "DNF";
  if (userBook.started_at) return "Reading";
  return "Not started";
}

function cardToneClass(tone: ActionCard["tone"]) {
  if (tone === "blue") return "border-sky-200 bg-sky-50 hover:bg-sky-100";
  if (tone === "green") return "border-emerald-200 bg-emerald-50 hover:bg-emerald-100";
  if (tone === "purple") return "border-violet-200 bg-violet-50 hover:bg-violet-100";
  if (tone === "amber") return "border-amber-200 bg-amber-50 hover:bg-amber-100";
  return "border-stone-200 bg-white hover:bg-stone-50";
}

function ActionCardLink({ action }: { action: ActionCard }) {
  return (
    <Link
      href={action.href}
      className={`block rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardToneClass(action.tone)}`}
    >
      <div className="flex min-h-28 flex-col justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-stone-950">{action.title}</h3>
          <p className="mt-3 text-sm leading-6 text-stone-600">{action.description}</p>
        </div>
        <p className="text-sm font-black text-stone-900">Open</p>
      </div>
    </Link>
  );
}

export default function StudentBookWorkspacePage() {
  const params = useParams<{ studentId: string; userBookId: string }>();
  const studentId = params.studentId ?? "";
  const userBookId = params.userBookId ?? "";

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentBook, setStudentBook] = useState<StudentUserBook | null>(null);
  const [teacherBook, setTeacherBook] = useState<TeacherBookSupport | null>(null);

  useEffect(() => {
    void loadWorkspace();
  }, [studentId, userBookId]);

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
            author,
            cover_url,
            isbn13,
            isbn,
            page_count,
            book_type
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

      const { data: teacherBookRow, error: teacherBookError } = await supabase
        .from("teacher_books")
        .select("id, teacher_use_status, teacher_use_note, user_book_id")
        .eq("teacher_id", currentUser.id)
        .eq("book_id", loadedStudentBook.book_id)
        .limit(1)
        .maybeSingle();

      if (teacherBookError) throw teacherBookError;

      setStudent((studentProfile ?? null) as StudentProfile | null);
      setStudentBook(loadedStudentBook);
      setTeacherBook((teacherBookRow ?? null) as TeacherBookSupport | null);
    } catch (error: any) {
      console.error("Error loading Student Book Workspace:", error);
      setMessage(error?.message ?? "Could not load Student Book Workspace.");
    } finally {
      setLoading(false);
    }
  }

  const book = firstBook(studentBook?.books ?? null);
  const studentName = student?.display_name || student?.username || "Student";
  const backHref = student?.username ? `/users/${student.username}/books` : "/teacher/students";

  const primaryActions = useMemo<ActionCard[]>(() => {
    const encodedUserBookId = encodeURIComponent(userBookId);
    return [
      {
        title: "Live Lesson Add Word",
        description: "Capture words quickly during a live lesson.",
        href: `/teacher/students/${encodeURIComponent(studentId)}/books/${encodedUserBookId}/lesson-add`,
        tone: "amber",
      },
      {
        title: "Student Book Hub",
        description: "Open the student's normal book hub and reading history.",
        href: `/books/${encodedUserBookId}`,
        tone: "blue",
      },
      {
        title: "Book Flashcards",
        description: "Review this book's saved vocabulary with flashcards.",
        href: `/books/${encodedUserBookId}/study`,
        tone: "purple",
      },
      {
        title: "Supported Reading",
        description: "Use saved-word support while reading this book.",
        href: `/books/${encodedUserBookId}/readalong`,
        tone: "green",
      },
    ];
  }, [studentId, userBookId]);

  const teacherSupportActions = useMemo<ActionCard[]>(() => {
    if (!teacherBook) return [];
    const encodedTeacherBookId = encodeURIComponent(teacherBook.id);
    return [
      {
        title: "Teacher Book Workspace",
        description: "Open your teacher-facing book launcher and use status.",
        href: `/teacher/library/${encodedTeacherBookId}/book-workspace`,
        tone: "stone",
      },
      {
        title: "Teaching Prep",
        description: "Edit prepared words, phrases, notes, and translations.",
        href: `/teacher/library/${encodedTeacherBookId}`,
        tone: "stone",
      },
      {
        title: "Follow-Along Support",
        description: "Use prepared support while working through the text together.",
        href: `/teacher/library/${encodedTeacherBookId}/follow`,
        tone: "stone",
      },
    ];
  }, [teacherBook]);

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
            &lt;- Students
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
                {book?.title ?? "Untitled book"}
              </h1>
              {book?.author ? (
                <p className="mt-2 text-sm font-semibold text-stone-600">{book.author}</p>
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
                This workspace is for teaching this student through this book. Lesson words save to the student&apos;s book; teacher support comes from your Teacher Book when available.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              Student Book Tools
            </p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">Teach from this book</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {primaryActions.map((action) => (
              <ActionCardLink key={action.href} action={action} />
            ))}
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              Teacher Support
            </p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">Prepared support for this book</h2>
          </div>

          {teacherBook ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${teacherUseStatusBadgeClass(
                      teacherBook.teacher_use_status
                    )}`}
                  >
                    {teacherUseStatusLabel(teacherBook.teacher_use_status)}
                  </span>
                  {teacherBook.teacher_use_note ? (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                      {teacherBook.teacher_use_note}
                    </p>
                  ) : (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-500">
                      Teacher support is available for this book.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {teacherSupportActions.map((action) => (
                  <ActionCardLink key={action.href} action={action} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black text-stone-950">No teacher support prepared yet.</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                You can still add words and work from the student&apos;s book. Teacher support can be added later from Teacher Books.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
