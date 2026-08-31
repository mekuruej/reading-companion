// Teacher Book Workspace
//
// Launcher for teacher-owned books. Personal Reader tools only appear when a
// real My Library row is linked; teaching prep and follow-along stay anchored
// to teacher_books.

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { bookTypeTitleLabel } from "@/lib/books/bookTypes";

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
  | "usable"
  | "use_with_caution"
  | "do_not_use";

type TeachingDifficulty = "n5" | "n4" | "n3" | "n2" | "n1" | "above_n1";
type TeachingSuitability = "excellent" | "usable" | "poor_fit";

type TeacherBookRow = {
  id: string;
  teacher_id: string;
  book_id: string;
  user_book_id: string | null;
  teacher_use_status: TeacherUseStatus | null;
  teacher_use_note: string | null;
  teacher_jlpt_difficulty: TeachingDifficulty | null;
  teaching_suitability: TeachingSuitability | null;
  created_at: string | null;
  updated_at: string | null;
  books: BookMeta | BookMeta[] | null;
  user_books: UserBookDnfMeta | UserBookDnfMeta[] | null;
};

type UserBookDnfMeta = {
  id: string;
  dnf_at: string | null;
  dnf_reason: string | null;
  dnf_note: string | null;
  would_retry: string | null;
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
    profile?.role === "admin" ||
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

function firstUserBook(row: TeacherBookRow["user_books"]) {
  if (Array.isArray(row)) return row[0] ?? null;
  return row ?? null;
}

const teacherUseStatusOptions: Array<{ value: TeacherUseStatus; label: string }> = [
  { value: "want_to_test", label: "Want to Test" },
  { value: "testing", label: "Testing" },
  { value: "currently_using", label: "Currently Using" },
  { value: "approved_for_lesson", label: "Perfect for Lesson" },
  { value: "usable", label: "Usable" },
  { value: "use_with_caution", label: "Use with Caution" },
  { value: "do_not_use", label: "Not for Teaching" },
];

const visibleTeacherUseStatusOptions: Array<{ value: TeacherUseStatus; label: string }> = [
  { value: "approved_for_lesson", label: "Perfect for Lesson" },
  { value: "usable", label: "Usable" },
  { value: "do_not_use", label: "Not for Teaching" },
];

const teacherUseStatusLabels = teacherUseStatusOptions.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.label }),
  {} as Record<TeacherUseStatus, string>
);

const difficultyOptions: Array<{ value: TeachingDifficulty; label: string }> = [
  { value: "n5", label: "N5" },
  { value: "n4", label: "N4" },
  { value: "n3", label: "N3" },
  { value: "n2", label: "N2" },
  { value: "n1", label: "N1" },
  { value: "above_n1", label: "Above N1" },
];

const suitabilityOptions: Array<{ value: TeachingSuitability; label: string }> = [
  { value: "excellent", label: "Excellent" },
  { value: "usable", label: "Usable" },
  { value: "poor_fit", label: "Poor Fit" },
];

const dnfReasonLabels: Record<string, string> = {
  too_difficult_right_now: "Too difficult right now",
  wrong_timing_mood: "Wrong timing or mood",
  too_much_unknown_vocabulary: "Too much unknown vocabulary",
  too_dense_slow: "Too dense or slow",
  lost_interest: "Lost interest",
  did_not_like_it: "Did not like it",
  other: "Other",
};

const difficultyLabels = difficultyOptions.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.label }),
  {} as Record<TeachingDifficulty, string>
);

const suitabilityLabels = suitabilityOptions.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.label }),
  {} as Record<TeachingSuitability, string>
);

function isTeacherUseStatus(value: string): value is TeacherUseStatus {
  return teacherUseStatusOptions.some((option) => option.value === value);
}

function isTeachingDifficulty(value: string): value is TeachingDifficulty {
  return difficultyOptions.some((option) => option.value === value);
}

function isTeachingSuitability(value: string): value is TeachingSuitability {
  return suitabilityOptions.some((option) => option.value === value);
}

function normalizeTeacherUseStatus(value: string | null | undefined): TeacherUseStatus {
  return value && isTeacherUseStatus(value) ? value : "want_to_test";
}

function teacherUseStatusLabel(status: TeacherUseStatus | null | undefined) {
  if (isBlankTeacherUseStatus(status)) return "--";
  return teacherUseStatusLabels[normalizeTeacherUseStatus(status)];
}

function difficultyLabel(value: TeachingDifficulty | null | undefined) {
  return value ? difficultyLabels[value] : "No JLPT";
}

function suitabilityLabel(value: TeachingSuitability | null | undefined) {
  return value ? suitabilityLabels[value] : "No Suitability";
}

function dnfReasonLabel(value: string | null | undefined) {
  if (!value) return "No reason saved";
  return dnfReasonLabels[value] ?? value;
}

function wouldRetryLabel(value: string | null | undefined) {
  if (value === "yes") return "Would retry";
  if (value === "maybe") return "Might retry later";
  if (value === "no") return "Would not retry";
  return null;
}

function isAssessed(row: TeacherBookRow | null) {
  if (row?.teacher_use_status === "do_not_use") return true;
  return Boolean(row?.teacher_jlpt_difficulty && row?.teaching_suitability);
}

function assessmentLabel(row: TeacherBookRow | null) {
  if (row?.teacher_use_status === "do_not_use") return "Not for Teaching";
  return isAssessed(row) ? "Assessed" : "Needs Assessment";
}

function teacherUseStatusBadgeClass(status: TeacherUseStatus | null | undefined) {
  if (isBlankTeacherUseStatus(status)) {
    return "border-stone-200 bg-stone-50 text-stone-600";
  }

  switch (normalizeTeacherUseStatus(status)) {
    case "approved_for_lesson":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "usable":
      return "border-sky-200 bg-sky-50 text-sky-800";
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

function isBlankTeacherUseStatus(status: TeacherUseStatus | null | undefined) {
  return (
    !status ||
    status === "want_to_test" ||
    status === "testing" ||
    status === "currently_using"
  );
}

function difficultyBadgeClass(value: TeachingDifficulty | null | undefined) {
  if (!value) return "border-stone-200 bg-stone-50 text-stone-600";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function suitabilityBadgeClass(value: TeachingSuitability | null | undefined) {
  if (value === "excellent") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "usable") return "border-sky-200 bg-sky-50 text-sky-800";
  if (value === "poor_fit") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-stone-200 bg-stone-50 text-stone-600";
}

function bookTypeLabel(value: string | null | undefined) {
  return bookTypeTitleLabel(value);
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
  const [statusDraft, setStatusDraft] = useState<TeacherUseStatus | "">("");
  const [difficultyDraft, setDifficultyDraft] = useState<TeachingDifficulty | "">("");
  const [suitabilityDraft, setSuitabilityDraft] = useState<TeachingSuitability | "">("");
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
    setStatusDraft("");
    setDifficultyDraft("");
    setSuitabilityDraft("");
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
          teacher_jlpt_difficulty,
          teaching_suitability,
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
          ),
          user_books:user_book_id (
            id,
            dnf_at,
            dnf_reason,
            dnf_note,
            would_retry
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
      setStatusDraft(
        isBlankTeacherUseStatus(row.teacher_use_status) ? "" : row.teacher_use_status ?? ""
      );
      setDifficultyDraft(row.teacher_jlpt_difficulty ?? "");
      setSuitabilityDraft(row.teaching_suitability ?? "");
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

    if (statusDraft && !isTeacherUseStatus(statusDraft)) {
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
          teacher_use_status: statusDraft || null,
          teacher_jlpt_difficulty: difficultyDraft || null,
          teaching_suitability: suitabilityDraft || null,
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
  const linkedUserBook = firstUserBook(teacherBook?.user_books ?? null);
  const retryLabel = wouldRetryLabel(linkedUserBook?.would_retry);
  const userBookId = teacherBook?.user_book_id ?? null;

  const readerTools = useMemo<ToolCard[]>(() => {
    if (!userBookId) return [];
    const encodedUserBookId = encodeURIComponent(userBookId);

    return [
      {
        title: "Curiosity Reading",
        subtitle: "Intensive Reading",
        description: "Read while saving vocabulary and logging a slower session.",
        href: `/books/${encodedUserBookId}/curiosity-reading`,
        tone: "blue",
      },
      {
        title: "Saved Word Reading",
        subtitle: "Reading with Saved Word Support",
        description: "Reread and time your session with light support.",
        href: `/books/${encodedUserBookId}/readalong`,
        tone: "green",
      },
      {
        title: "Just Reading",
        subtitle: "Extensive Reading Timer",
        description: "Read without support or lookups and log your time.",
        href: `/books/${encodedUserBookId}/just-reading`,
        tone: "purple",
      },
      {
        title: "Listening Timer",
        subtitle: "Just Listening",
        description: "Listen to the book and log listening time.",
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
        title: "Teacher Vocabulary",
        description: "Manage shared teaching vocabulary for this book without changing My Library status.",
        href: `/teacher/library/${encodedTeacherBookId}/vocabulary`,
        tone: "blue",
      },
      {
        title: "Teacher Flashcards",
        description: "Open a lesson display deck from teaching-visible vocabulary with no personal SRS writes.",
        href: `/teacher/library/${encodedTeacherBookId}/flashcards`,
        tone: "green",
      },
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
                {linkedUserBook?.dnf_at ? (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-800">
                    DNF
                  </span>
                ) : null}
                <span
                  className={`rounded-full border px-3 py-1 ${teacherUseStatusBadgeClass(
                    teacherBook.teacher_use_status
                  )}`}
                >
                  {teacherUseStatusLabel(teacherBook.teacher_use_status)}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 ${
                    teacherBook.teacher_use_status === "do_not_use"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : isAssessed(teacherBook)
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}
                >
                  {assessmentLabel(teacherBook)}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 ${difficultyBadgeClass(
                    teacherBook.teacher_jlpt_difficulty
                  )}`}
                >
                  {difficultyLabel(teacherBook.teacher_jlpt_difficulty)}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 ${suitabilityBadgeClass(
                    teacherBook.teaching_suitability
                  )}`}
                >
                  {suitabilityLabel(teacherBook.teaching_suitability)}
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
              {linkedUserBook?.dnf_at ? (
                <div className="mt-3 max-w-2xl border-l-4 border-rose-200 pl-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">
                    DNF
                  </p>
                  <p className="mt-1 text-sm font-black text-stone-800">
                    {dnfReasonLabel(linkedUserBook.dnf_reason)}
                    {retryLabel ? ` · ${retryLabel}` : ""}
                  </p>
                  {linkedUserBook.dnf_note ? (
                    <p className="mt-1 text-sm leading-6 text-stone-700">
                      {linkedUserBook.dnf_note}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {teacherBook.teacher_use_note ? (
                <div className="mt-3 max-w-2xl border-l-4 border-blue-200 pl-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                    Teacher note
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-700">
                    {teacherBook.teacher_use_note}
                  </p>
                </div>
              ) : null}
              <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-600">
                Personal Reader tools appear only when this book is also in My Library. Teacher support stays with this Teacher Book.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                Teaching Assessment
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">Book fit for lessons</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Difficulty and suitability decide whether the book is assessed. Status is a separate workflow note, and none of this changes your My Mekuru Library reading status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSaveTeacherUseStatus()}
              disabled={!canEditTeacherUseStatus || statusSaving}
              className="rounded-2xl border border-stone-900 bg-stone-900 px-5 py-3 text-sm font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {statusSaving ? "Saving..." : "Save Assessment"}
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

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                JLPT Difficulty
              </span>
              <select
                value={difficultyDraft}
                onChange={(event) => {
                  const value = event.target.value;
                  setDifficultyDraft(isTeachingDifficulty(value) ? value : "");
                }}
                disabled={!canEditTeacherUseStatus || statusSaving}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900 disabled:bg-stone-100"
              >
                <option value="">Choose difficulty</option>
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                Teaching Suitability
              </span>
              <select
                value={suitabilityDraft}
                onChange={(event) => {
                  const value = event.target.value;
                  setSuitabilityDraft(isTeachingSuitability(value) ? value : "");
                }}
                disabled={!canEditTeacherUseStatus || statusSaving}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900 disabled:bg-stone-100"
              >
                <option value="">Choose suitability</option>
                {suitabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                Status
              </span>
              <select
                value={statusDraft}
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  if (nextStatus === "" || isTeacherUseStatus(nextStatus)) {
                    setStatusDraft(nextStatus);
                  }
                }}
                disabled={!canEditTeacherUseStatus || statusSaving}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900 disabled:bg-stone-100"
              >
                <option value="">--</option>
                {visibleTeacherUseStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-3">
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
          <section className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900 shadow-sm">
            This is a teaching-only book right now. Personal Reader tools are hidden so teaching work does not change My Library, reading history, pace, or personal stats.
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
