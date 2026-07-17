// Teacher Book Workspace
//
// Launcher for teacher-owned books. Reader tools use the linked user_books row;
// teaching prep and follow-along stay anchored to teacher_books.

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
  isbn13: string | null;
  page_count: number | null;
};

type TeacherUseStatus =
  | "want_to_test"
  | "testing"
  | "currently_using"
  | "approved_for_lesson"
  | "use_with_caution"
  | "do_not_use";

type TeacherBookRow = {
  id: string;
  teacher_id: string;
  book_id: string;
  user_book_id: string | null;
  teacher_use_status: TeacherUseStatus | null;
  teacher_use_note: string | null;
  created_at: string | null;
  updated_at: string | null;
  books: BookMeta | BookMeta[] | null;
};

type ToolCard = {
  title: string;
  subtitle?: string;
  description: string;
  href: string;
  tone: "blue" | "green" | "purple" | "stone";
};

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

function firstBook(book: TeacherBookRow["books"]) {
  if (Array.isArray(book)) return book[0] ?? null;
  return book ?? null;
}

const teacherUseStatusOptions: Array<{ value: TeacherUseStatus; label: string }> = [
  { value: "want_to_test", label: "Want to Test" },
  { value: "testing", label: "Testing" },
  { value: "currently_using", label: "Currently Using" },
  { value: "approved_for_lesson", label: "Approved for Lesson" },
  { value: "use_with_caution", label: "Use with Caution" },
  { value: "do_not_use", label: "Do Not Use" },
];

const teacherUseStatusLabels = teacherUseStatusOptions.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.label }),
  {} as Record<TeacherUseStatus, string>
);

function isTeacherUseStatus(value: string): value is TeacherUseStatus {
  return teacherUseStatusOptions.some((option) => option.value === value);
}

function normalizeTeacherUseStatus(value: string | null | undefined): TeacherUseStatus {
  return value && isTeacherUseStatus(value) ? value : "want_to_test";
}

function teacherUseStatusLabel(status: TeacherUseStatus | null | undefined) {
  return teacherUseStatusLabels[normalizeTeacherUseStatus(status)];
}

function teacherUseStatusBadgeClass(status: TeacherUseStatus | null | undefined) {
  switch (normalizeTeacherUseStatus(status)) {
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

function cardToneClass(tone: ToolCard["tone"]) {
  if (tone === "blue") return "border-sky-200 bg-sky-50 hover:bg-sky-100";
  if (tone === "green") return "border-emerald-200 bg-emerald-50 hover:bg-emerald-100";
  if (tone === "purple") return "border-violet-200 bg-violet-50 hover:bg-violet-100";
  return "border-stone-200 bg-white hover:bg-stone-50";
}

function ToolCardLink({ tool }: { tool: ToolCard }) {
  return (
    <Link
      href={tool.href}
      className={`block rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardToneClass(tool.tone)}`}
    >
      <div className="flex min-h-28 flex-col justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-stone-950">{tool.title}</h3>
          {tool.subtitle ? (
            <p className="mt-0.5 text-sm font-black text-stone-700">{tool.subtitle}</p>
          ) : null}
          <p className="mt-3 text-sm leading-6 text-stone-600">{tool.description}</p>
        </div>
        <p className="text-sm font-black text-stone-900">Open</p>
      </div>
    </Link>
  );
}

export default function TeacherBookWorkspacePage() {
  const params = useParams<{ teacherBookId: string }>();
  const router = useRouter();
  const teacherBookId = params.teacherBookId ?? "";

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [canAccess, setCanAccess] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);
  const [teacherBook, setTeacherBook] = useState<TeacherBookRow | null>(null);
  const [statusDraft, setStatusDraft] = useState<TeacherUseStatus>("want_to_test");
  const [noteDraft, setNoteDraft] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    void loadWorkspace();
  }, [teacherBookId]);

  async function loadWorkspace() {
    setLoading(true);
    setMessage("");
    setCanAccess(false);
    setCurrentUserId(null);
    setIsSuperTeacher(false);
    setTeacherBook(null);
    setStatusDraft("want_to_test");
    setNoteDraft("");
    setStatusMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        setMessage("Please sign in.");
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const profileIsSuperTeacher = isSuperTeacherRole(profile);
      setIsSuperTeacher(profileIsSuperTeacher);

      if (!isTeacherRole(profile)) {
        setMessage("Teacher access is required.");
        return;
      }

      const { data, error } = await supabase
        .from("teacher_books")
        .select(
          `
          id,
          teacher_id,
          book_id,
          user_book_id,
          teacher_use_status,
          teacher_use_note,
          created_at,
          updated_at,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            book_type,
            isbn13,
            page_count
          )
        `
        )
        .eq("id", teacherBookId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setMessage("This Teacher Book could not be found.");
        return;
      }

      const row = data as TeacherBookRow;
      setCanAccess(true);
      setTeacherBook(row);
      setStatusDraft(normalizeTeacherUseStatus(row.teacher_use_status));
      setNoteDraft(row.teacher_use_note ?? "");
    } catch (error: any) {
      console.error("Error loading Teacher Book Workspace:", error);
      setMessage(error?.message ?? "Could not load Teacher Book Workspace.");
    } finally {
      setLoading(false);
    }
  }

  const canEditTeacherUseStatus =
    teacherBook != null &&
    currentUserId != null &&
    (teacherBook.teacher_id === currentUserId || isSuperTeacher);

  async function handleSaveTeacherUseStatus() {
    if (!teacherBook) return;

    if (!canEditTeacherUseStatus) {
      setStatusMessage("You do not have permission to update this Teacher Book status.");
      return;
    }

    if (!isTeacherUseStatus(statusDraft)) {
      setStatusMessage("Choose a valid Teacher Book status.");
      return;
    }

    setStatusSaving(true);
    setStatusMessage("");

    try {
      const cleanedNote = noteDraft.trim() || null;
      const { error } = await supabase
        .from("teacher_books")
        .update({
          teacher_use_status: statusDraft,
          teacher_use_note: cleanedNote,
        })
        .eq("id", teacherBook.id);

      if (error) throw error;

      await loadWorkspace();
      setStatusMessage("Teacher Book status saved.");
    } catch (error: any) {
      console.error("Error saving Teacher Book use status:", error);
      setStatusMessage(error?.message ?? "Could not save Teacher Book status.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleRemoveFromTeacherLibrary() {
    if (!teacherBook) return;

    const confirmed = window.confirm(
      "Remove this book from Teacher Library? Your My Library copy, saved words, reading sessions, ratings, and reflections will stay untouched."
    );

    if (!confirmed) return;

    setStatusSaving(true);
    setStatusMessage("");

    try {
      const { error } = await supabase
        .from("teacher_books")
        .update({
          teacher_use_status: "do_not_use",
          teacher_use_note:
            noteDraft.trim() ||
            teacherBook.teacher_use_note ||
            "Removed from Teacher Library; reader data preserved.",
        })
        .eq("id", teacherBook.id);

      if (error) throw error;

      setStatusMessage("Removed from Teacher Library. Reader data was preserved.");
      router.push("/teacher/library");
    } catch (error: any) {
      console.error("Error removing Teacher Book relationship:", error);
      setStatusMessage(error?.message ?? "Could not remove this book from Teacher Library.");
    } finally {
      setStatusSaving(false);
    }
  }

  const book = firstBook(teacherBook?.books ?? null);
  const userBookId = teacherBook?.user_book_id ?? null;

  const readerTools = useMemo<ToolCard[]>(() => {
    if (!userBookId) return [];
    const encodedUserBookId = encodeURIComponent(userBookId);

    return [
      {
        title: "Curiosity Reading",
        subtitle: "Intensive",
        description: "Read while saving vocabulary and logging a slower session.",
        href: `/books/${encodedUserBookId}/curiosity-reading`,
        tone: "blue",
      },
      {
        title: "Saved Word Reading",
        subtitle: "Extensive Reading with Saved Words",
        description: "Reread with light support from your saved reader words and reader session tracking.",
        href: `/books/${encodedUserBookId}/readalong`,
        tone: "green",
      },
      {
        title: "Just Reading",
        subtitle: "Extensive Fluid Reading",
        description: "Read without support or lookups and log your time.",
        href: `/books/${encodedUserBookId}/just-reading`,
        tone: "purple",
      },
      {
        title: "Listening",
        subtitle: "Ear Training",
        description: "Listen to the book and log words you hear.",
        href: `/books/${encodedUserBookId}/listening`,
        tone: "purple",
      },
      {
        title: "Add Word",
        description: "Save a word to your normal reader vocabulary for this book.",
        href: `/books/${encodedUserBookId}/add-word`,
        tone: "blue",
      },
      {
        title: "Study Flashcards",
        description: "Review saved words from this book.",
        href: `/books/${encodedUserBookId}/study`,
        tone: "blue",
      },
      {
        title: "My Reader Vocab",
        description: "Review and manage your saved reader words for this book.",
        href: `/books/${encodedUserBookId}/words`,
        tone: "green",
      },
    ];
  }, [userBookId]);

  const teacherTools = useMemo<ToolCard[]>(() => {
    const encodedTeacherBookId = encodeURIComponent(teacherBookId);
    return [
      {
        title: "Follow-Along Support",
        description: "Use your saved reader words and teacher support items while reading with a learner.",
        href: `/teacher/library/${encodedTeacherBookId}/follow`,
        tone: "stone",
      },
      {
        title: "Teaching Prep",
        description: "Prepare teacher support items such as grammar notes, phrases, translations, and lesson notes.",
        href: `/teacher/library/${encodedTeacherBookId}`,
        tone: "stone",
      },
    ];
  }, [teacherBookId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          Loading Teacher Book Workspace...
        </div>
      </main>
    );
  }

  if (!canAccess || !teacherBook) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href="/teacher/library" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            &lt;- Teacher Books
          </Link>
          <h1 className="mt-4 text-3xl font-black text-stone-950">Teacher Book Workspace</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "This Teacher Book could not be loaded."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/teacher/library" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
          &lt;- Teacher Books
        </Link>

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
                Teacher Book Workspace
              </p>
              <h1 className="mt-2 text-3xl font-black text-stone-950 md:text-4xl">
                {book?.title ?? "Untitled book"}
              </h1>
              {book?.author ? (
                <p className="mt-2 text-sm font-semibold text-stone-600">{book.author}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide text-stone-500">
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                  {bookTypeLabel(book?.book_type)}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 ${teacherUseStatusBadgeClass(
                    teacherBook.teacher_use_status
                  )}`}
                >
                  {teacherUseStatusLabel(teacherBook.teacher_use_status)}
                </span>
                {book?.page_count != null ? (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                    {book.page_count} pages
                  </span>
                ) : null}
                {book?.isbn13 ? (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                    ISBN {book.isbn13}
                  </span>
                ) : null}
              </div>
              {teacherBook.teacher_use_note ? (
                <p className="mt-3 max-w-2xl rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
                  {teacherBook.teacher_use_note}
                </p>
              ) : null}
              <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-600">
                My Reader Tools use your My Mekuru Library history. Teacher support stays with this Teacher Book.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                Teacher Use Status
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">Book fit for lessons</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                This is separate from your My Mekuru Library reading status. Use the note for cautions such as level fit, content warning, personal-read-only, or too much dialect.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSaveTeacherUseStatus()}
              disabled={!canEditTeacherUseStatus || statusSaving}
              className="rounded-2xl border border-stone-900 bg-stone-900 px-5 py-3 text-sm font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {statusSaving ? "Saving..." : "Save Status"}
            </button>
            <button
              type="button"
              onClick={() => void handleRemoveFromTeacherLibrary()}
              disabled={!canEditTeacherUseStatus || statusSaving}
              className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove from Teacher Library
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                Status
              </span>
              <select
                value={statusDraft}
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  if (isTeacherUseStatus(nextStatus)) setStatusDraft(nextStatus);
                }}
                disabled={!canEditTeacherUseStatus || statusSaving}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900 disabled:bg-stone-100"
              >
                {teacherUseStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                Note or reason
              </span>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                disabled={!canEditTeacherUseStatus || statusSaving}
                rows={3}
                placeholder="Level fit, content warning, personal-read-only, too much dialect..."
                className="w-full resize-none rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-900 disabled:bg-stone-100"
              />
            </label>
          </div>

          {statusMessage ? (
            <p className="mt-3 text-sm font-semibold text-stone-600">{statusMessage}</p>
          ) : null}
        </section>

        {!userBookId ? (
          <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
            This Teacher Book is not linked to a proven My Library copy yet, so reader words cannot be shown here. Run the teacher-book reader-link diagnostic and repair with the existing link migration before using reader tools.
          </section>
        ) : (
          <section className="mt-6">
            <div className="mb-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                My Reader Tools
              </p>
              <h2 className="mt-1 text-2xl font-black text-stone-950">Read and study</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {readerTools.map((tool) => (
                <ToolCardLink key={tool.href} tool={tool} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              Teacher Support
            </p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">Prepare and support</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {teacherTools.map((tool) => (
              <ToolCardLink key={tool.href} tool={tool} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
