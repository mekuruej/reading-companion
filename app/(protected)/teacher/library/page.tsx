// Teacher Library
//
// Searchable teacher inventory. This combines the teacher's own Japanese
// Library books with existing Teacher Books so lesson workspaces do not
// disappear when a book is not also in the teacher's personal Library.

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { normalizeBookLanguageCode } from "@/lib/books/bookLanguage";
import { bookTypeTitleLabel } from "@/lib/books/bookTypes";
import { getTeacherBackLink } from "../components/teacherBackLink";

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
  isbn13: string | null;
  language_code: string | null;
  page_count: number | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string | null;
  status: string | null;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  dnf_reason: string | null;
  dnf_note: string | null;
  would_retry: string | null;
  books: BookMeta | BookMeta[] | null;
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
type AssessmentFilter =
  | "active"
  | "all"
  | "needs_assessment"
  | "currently_reading"
  | "want_to_read"
  | "dnf"
  | "assessed"
  | "not_for_teaching";
type StatusFilter = "all" | "none" | TeacherUseStatus;

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
};

type TeachingBookEntry = {
  key: string;
  bookId: string;
  userBookId: string | null;
  teacherBookId: string | null;
  source: "library" | "teacher_book" | "both";
  teacher_use_status: TeacherUseStatus | null;
  teacher_use_note: string | null;
  teacher_jlpt_difficulty: TeachingDifficulty | null;
  teaching_suitability: TeachingSuitability | null;
  reading_status: string | null;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  dnf_reason: string | null;
  dnf_note: string | null;
  would_retry: string | null;
  created_at: string | null;
  updated_at: string | null;
  books: BookMeta | null;
};

type AssessmentDraft = {
  difficulty: TeachingDifficulty | "";
  suitability: TeachingSuitability | "";
  status: TeacherUseStatus | "";
  note: string;
};

function isTeacherRole(profile: any) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "admin" ||
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

function firstBook(book: BookMeta | BookMeta[] | null | undefined) {
  if (Array.isArray(book)) return book[0] ?? null;
  return book ?? null;
}

function isJapaneseBook(book: BookMeta | null | undefined) {
  return normalizeBookLanguageCode(book?.language_code) === "ja";
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

const teacherUseStatusLabels = teacherUseStatusOptions.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.label }),
  {} as Record<TeacherUseStatus, string>
);

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
  if (!status || isBlankTeacherUseStatus(status)) return "--";
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

function teacherUseStatusBadgeClass(status: TeacherUseStatus | null | undefined) {
  if (!status || isBlankTeacherUseStatus(status)) {
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

function isAssessed(entry: TeachingBookEntry) {
  if (entry.teacher_use_status === "do_not_use") return true;
  return Boolean(entry.teacher_jlpt_difficulty && entry.teaching_suitability);
}

function isNotForTeaching(entry: TeachingBookEntry) {
  return entry.teacher_use_status === "do_not_use";
}

function isDnf(entry: TeachingBookEntry) {
  return Boolean(entry.dnf_at);
}

function isWantToRead(entry: TeachingBookEntry) {
  if (!entry.userBookId) return false;
  if (entry.dnf_at || entry.finished_at || entry.started_at) return false;
  return !entry.reading_status || entry.reading_status === "what_to_read";
}

function isCurrentlyReading(entry: TeachingBookEntry) {
  if (!entry.userBookId) return false;
  if (entry.dnf_at || entry.finished_at) return false;
  return Boolean(entry.started_at) || entry.reading_status === "reading";
}

function teachingBookCategory(entry: TeachingBookEntry) {
  if (isNotForTeaching(entry)) return "not_for_teaching";
  if (isDnf(entry)) return "dnf";
  if (isCurrentlyReading(entry)) return "currently_reading";
  if (isWantToRead(entry)) return "want_to_read";
  if (isAssessed(entry)) return "assessed";
  return "needs_assessment";
}

function teachingBookCategoryRank(entry: TeachingBookEntry) {
  const category = teachingBookCategory(entry);
  if (category === "needs_assessment") return 0;
  if (category === "currently_reading") return 1;
  if (category === "want_to_read") return 2;
  if (category === "dnf") return 3;
  if (category === "assessed") return 4;
  return 5;
}

function createDraft(entry: TeachingBookEntry): AssessmentDraft {
  return {
    difficulty: entry.teacher_jlpt_difficulty ?? "",
    suitability: entry.teaching_suitability ?? "",
    status: isBlankTeacherUseStatus(entry.teacher_use_status)
      ? ""
      : entry.teacher_use_status ?? "",
    note: entry.teacher_use_note ?? "",
  };
}

function teacherBookSelect(includeAssessmentFields: boolean) {
  const assessmentFields = includeAssessmentFields
    ? `
          teacher_jlpt_difficulty,
          teaching_suitability,
`
    : "";

  return `
          id,
          teacher_id,
          book_id,
          user_book_id,
          teacher_use_status,
          teacher_use_note,
${assessmentFields}          created_at,
          updated_at,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            book_type,
            isbn13,
            language_code,
            page_count
          )
        `;
}

function mergeTeachingBooks(userRows: UserBookRow[], teacherRows: TeacherBookRow[]) {
  const entries = new Map<string, TeachingBookEntry>();
  const libraryKeysByBookId = new Map<string, string[]>();

  for (const row of userRows) {
    const book = firstBook(row.books);
    if (!book || !isJapaneseBook(book)) continue;

    const key = `user_book:${row.id}`;
    entries.set(key, {
      key,
      bookId: row.book_id,
      userBookId: row.id,
      teacherBookId: null,
      source: "library",
      teacher_use_status: null,
      teacher_use_note: null,
      teacher_jlpt_difficulty: null,
      teaching_suitability: null,
      reading_status: row.status,
      started_at: row.started_at,
      finished_at: row.finished_at,
      dnf_at: row.dnf_at,
      dnf_reason: row.dnf_reason,
      dnf_note: row.dnf_note,
      would_retry: row.would_retry,
      created_at: row.created_at,
      updated_at: row.created_at,
      books: book,
    });

    const existing = libraryKeysByBookId.get(row.book_id) ?? [];
    libraryKeysByBookId.set(row.book_id, [...existing, key]);
  }

  for (const row of teacherRows) {
    const book = firstBook(row.books);
    if (!book || !isJapaneseBook(book)) continue;

    let key = row.user_book_id ? `user_book:${row.user_book_id}` : "";
    if (!key || !entries.has(key)) {
      const candidateLibraryKeys = libraryKeysByBookId.get(row.book_id) ?? [];
      key =
        !row.user_book_id && candidateLibraryKeys.length === 1
          ? candidateLibraryKeys[0]
          : `teacher_book:${row.id}`;
    }

    const existing = entries.get(key);
    entries.set(key, {
      key,
      bookId: row.book_id,
      userBookId: existing?.userBookId ?? row.user_book_id ?? null,
      teacherBookId: row.id,
      source: existing ? "both" : "teacher_book",
      teacher_use_status: row.teacher_use_status,
      teacher_use_note: row.teacher_use_note,
      teacher_jlpt_difficulty: row.teacher_jlpt_difficulty,
      teaching_suitability: row.teaching_suitability,
      reading_status: existing?.reading_status ?? null,
      started_at: existing?.started_at ?? null,
      finished_at: existing?.finished_at ?? null,
      dnf_at: existing?.dnf_at ?? null,
      dnf_reason: existing?.dnf_reason ?? null,
      dnf_note: existing?.dnf_note ?? null,
      would_retry: existing?.would_retry ?? null,
      created_at: row.created_at ?? existing?.created_at ?? null,
      updated_at: row.updated_at ?? existing?.updated_at ?? row.created_at ?? null,
      books: book,
    });
  }

  return Array.from(entries.values()).sort((a, b) => {
    const categoryDelta = teachingBookCategoryRank(a) - teachingBookCategoryRank(b);
    if (categoryDelta !== 0) return categoryDelta;
    return (a.books?.title ?? "").localeCompare(b.books?.title ?? "");
  });
}

function isMissingColumnError(error: any) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export default function TeacherLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backLink = getTeacherBackLink(searchParams.get("from"));

  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<TeachingBookEntry[]>([]);
  const [query, setQuery] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState<AssessmentFilter>("active");
  const [difficultyFilter, setDifficultyFilter] = useState<TeachingDifficulty | "all">("all");
  const [suitabilityFilter, setSuitabilityFilter] = useState<TeachingSuitability | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<AssessmentDraft | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [recentlySavedKey, setRecentlySavedKey] = useState<string | null>(null);
  const [expandedNoteKeys, setExpandedNoteKeys] = useState<string[]>([]);

  useEffect(() => {
    void loadTeacherLibrary();
  }, []);

  async function loadTeacherLibrary() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        setCanAccess(false);
        setTeacherId(null);
        setEntries([]);
        setMessage("Please sign in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!isTeacherRole(profile)) {
        setCanAccess(false);
        setTeacherId(null);
        setEntries([]);
        setMessage("Teacher access is required.");
        return;
      }

      setCanAccess(true);
      setTeacherId(user.id);

      const { data: userBooksData, error: userBooksError } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          book_id,
          created_at,
          status,
          started_at,
          finished_at,
          dnf_at,
          dnf_reason,
          dnf_note,
          would_retry,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            book_type,
            isbn13,
            language_code,
            page_count
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (userBooksError) throw userBooksError;

      let teacherBooksData: TeacherBookRow[] = [];
      const { data: teacherRows, error: teacherRowsError } = await supabase
        .from("teacher_books")
        .select(teacherBookSelect(true))
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (teacherRowsError && isMissingColumnError(teacherRowsError)) {
        const { data: fallbackRows, error: fallbackError } = await supabase
          .from("teacher_books")
          .select(teacherBookSelect(false))
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false });

        if (fallbackError) throw fallbackError;
        teacherBooksData = ((fallbackRows ?? []) as any[]).map((row) => ({
          ...row,
          teacher_jlpt_difficulty: null,
          teaching_suitability: null,
        })) as TeacherBookRow[];
      } else {
        if (teacherRowsError) throw teacherRowsError;
        teacherBooksData = (teacherRows ?? []) as unknown as TeacherBookRow[];
      }

      setEntries(mergeTeachingBooks((userBooksData ?? []) as unknown as UserBookRow[], teacherBooksData));
    } catch (error: any) {
      console.error("Error loading teacher library:", error);
      setMessage(error?.message ?? "Could not load Teacher Books.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function getOrCreateTeacherBook(entry: TeachingBookEntry) {
    if (!teacherId) throw new Error("Teacher access is required.");
    if (entry.teacherBookId) return entry.teacherBookId;

    const { data: existing, error: lookupError } = await supabase
      .from("teacher_books")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("book_id", entry.bookId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existing?.id) return existing.id;

    const { data: inserted, error: insertError } = await supabase
      .from("teacher_books")
      .insert({
        teacher_id: teacherId,
        book_id: entry.bookId,
        user_book_id: entry.userBookId,
      })
      .select("id")
      .single();

    if (insertError) {
      const { data: racedExisting, error: racedLookupError } = await supabase
        .from("teacher_books")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("book_id", entry.bookId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (racedExisting?.id) return racedExisting.id;
      if (racedLookupError) throw racedLookupError;
      throw insertError;
    }

    return inserted.id;
  }

  async function openWorkspace(entry: TeachingBookEntry) {
    setOpeningKey(entry.key);
    setMessage("");

    try {
      const teacherBookId = await getOrCreateTeacherBook(entry);
      router.push(`/teacher/library/${encodeURIComponent(teacherBookId)}/book-workspace`);
    } catch (error: any) {
      console.error("Error opening Teacher Book Workspace:", error);
      setMessage(error?.message ?? "Could not open this Teacher Book Workspace.");
    } finally {
      setOpeningKey(null);
    }
  }

  function beginEditing(entry: TeachingBookEntry) {
    setEditingKey(entry.key);
    setDraft(createDraft(entry));
    setRecentlySavedKey(null);
    setMessage("");
  }

  function toggleExpandedNote(key: string) {
    setExpandedNoteKeys((keys) =>
      keys.includes(key) ? keys.filter((existingKey) => existingKey !== key) : [...keys, key]
    );
  }

  async function saveAssessment(entry: TeachingBookEntry) {
    if (!draft) return;

    setSavingKey(entry.key);
    setMessage("");

    try {
      const teacherBookId = await getOrCreateTeacherBook(entry);
      const { error } = await supabase
        .from("teacher_books")
        .update({
          teacher_jlpt_difficulty: draft.difficulty || null,
          teaching_suitability: draft.suitability || null,
          teacher_use_status: draft.status || null,
          teacher_use_note: draft.note.trim() || null,
        })
        .eq("id", teacherBookId);

      if (error) throw error;
      setEditingKey(null);
      setDraft(null);
      setRecentlySavedKey(entry.key);
      await loadTeacherLibrary();
      setMessage("Teaching assessment saved.");
    } catch (error: any) {
      console.error("Error saving teaching assessment:", error);
      setMessage(error?.message ?? "Could not save this teaching assessment.");
    } finally {
      setSavingKey(null);
    }
  }

  const formatOptions = useMemo(() => {
    const values = new Set<string>();
    for (const entry of entries) {
      const value = entry.books?.book_type;
      if (value) values.add(value);
    }
    return Array.from(values).sort((a, b) => bookTypeLabel(a).localeCompare(bookTypeLabel(b)));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const book = entry.books;
      const title = book?.title?.toLowerCase() ?? "";
      const author = book?.author?.toLowerCase() ?? "";
      const isbn = book?.isbn13?.toLowerCase() ?? "";
      const note = entry.teacher_use_note?.toLowerCase() ?? "";
      const dnfNote = entry.dnf_note?.toLowerCase() ?? "";
      const dnfReason = dnfReasonLabel(entry.dnf_reason).toLowerCase();
      const category = teachingBookCategory(entry);

      if (cleanQuery && !`${title} ${author} ${isbn} ${note} ${dnfNote} ${dnfReason}`.includes(cleanQuery)) return false;
      if (assessmentFilter === "active" && category === "not_for_teaching") return false;
      if (assessmentFilter !== "active" && assessmentFilter !== "all" && category !== assessmentFilter) return false;
      if (difficultyFilter !== "all" && entry.teacher_jlpt_difficulty !== difficultyFilter) return false;
      if (suitabilityFilter !== "all" && entry.teaching_suitability !== suitabilityFilter) return false;
      if (statusFilter === "none" && !isBlankTeacherUseStatus(entry.teacher_use_status)) return false;
      if (statusFilter !== "all" && statusFilter !== "none" && entry.teacher_use_status !== statusFilter) return false;
      if (formatFilter !== "all" && book?.book_type !== formatFilter) return false;

      return true;
    });
  }, [assessmentFilter, difficultyFilter, entries, formatFilter, query, statusFilter, suitabilityFilter]);

  const wantToReadCount = entries.filter(
    (entry) => teachingBookCategory(entry) === "want_to_read"
  ).length;
  const currentlyReadingCount = entries.filter(
    (entry) => teachingBookCategory(entry) === "currently_reading"
  ).length;
  const dnfCount = entries.filter((entry) => teachingBookCategory(entry) === "dnf").length;
  const assessedCount = entries.filter((entry) => teachingBookCategory(entry) === "assessed").length;
  const needsAssessmentCount = entries.filter(
    (entry) => teachingBookCategory(entry) === "needs_assessment"
  ).length;
  const notForTeachingCount = entries.filter((entry) => entry.teacher_use_status === "do_not_use").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href={backLink.href} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        {backLink.label}
      </Link>

      <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Teacher Books
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-900">Teaching Books</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
          Search Japanese books from your Library and existing teaching workspaces. Assess lesson fit without changing personal reading data or student-facing lesson content.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide text-stone-500">
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
            {entries.length} Japanese books
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-800">
            {needsAssessmentCount} need assessment
          </span>
          {currentlyReadingCount > 0 ? (
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-cyan-800">
              {currentlyReadingCount} currently reading
            </span>
          ) : null}
          {wantToReadCount > 0 ? (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-800">
              {wantToReadCount} want to read
            </span>
          ) : null}
          {dnfCount > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-800">
              {dnfCount} DNF
            </span>
          ) : null}
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">
            {assessedCount} assessed
          </span>
          {notForTeachingCount > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-800">
              {notForTeachingCount} not for teaching
            </span>
          ) : null}
        </div>
      </section>

      {message ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      {loading ? (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
          Loading Teaching Books...
        </section>
      ) : !canAccess ? (
        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Teacher access is required.
        </section>
      ) : (
        <>
          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
              <label className="block md:col-span-3">
                <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Search
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, author, ISBN, or teacher note"
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Assessment
                </span>
                <select
                  value={assessmentFilter}
                  onChange={(event) => setAssessmentFilter(event.target.value as AssessmentFilter)}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900"
                >
                  <option value="active">All active</option>
                  <option value="all">All books</option>
                  <option value="needs_assessment">Needs Assessment</option>
                  <option value="currently_reading">Currently Reading</option>
                  <option value="want_to_read">Want to Read</option>
                  <option value="dnf">DNF</option>
                  <option value="assessed">Assessed</option>
                  <option value="not_for_teaching">Not for Teaching</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  JLPT
                </span>
                <select
                  value={difficultyFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDifficultyFilter(isTeachingDifficulty(value) ? value : "all");
                  }}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900"
                >
                  <option value="all">All JLPT</option>
                  {difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Suitability
                </span>
                <select
                  value={suitabilityFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSuitabilityFilter(isTeachingSuitability(value) ? value : "all");
                  }}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900"
                >
                  <option value="all">All suitability</option>
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
                  value={statusFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStatusFilter(value === "none" || isTeacherUseStatus(value) ? value : "all");
                  }}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900"
                >
                  <option value="all">All statuses</option>
                  <option value="none">--</option>
                  {visibleTeacherUseStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Format
                </span>
                <select
                  value={formatFilter}
                  onChange={(event) => setFormatFilter(event.target.value)}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900"
                >
                  <option value="all">All formats</option>
                  {formatOptions.map((value) => (
                    <option key={value} value={value}>
                      {bookTypeLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-stone-900">Book Inventory</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {filteredEntries.length} of {entries.length} books match.
                </p>
              </div>
              <Link
                href="/books/add?destination=teaching&from=teacher-library"
                className="text-sm font-black text-blue-700 hover:text-blue-900"
              >
                Add a Book
              </Link>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
                No Japanese teaching books match these filters.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEntries.map((entry) => {
                  const book = entry.books;
                  const editing = editingKey === entry.key && draft;
                  const assessed = isAssessed(entry);
                  const notForTeaching = isNotForTeaching(entry);
                  const currentlyReading = isCurrentlyReading(entry);
                  const wantToRead = isWantToRead(entry);
                  const recentlySaved = recentlySavedKey === entry.key;
                  const noteExpanded = expandedNoteKeys.includes(entry.key);
                  const noteCanExpand = (entry.teacher_use_note?.length ?? 0) > 120;
                  const dnfCanExpand = (entry.dnf_note?.length ?? 0) > 120;
                  const dnfExpanded = expandedNoteKeys.includes(`${entry.key}:dnf`);
                  const retryLabel = wouldRetryLabel(entry.would_retry);
                  const notRecommended =
                    notForTeaching || entry.teaching_suitability === "poor_fit";
                  const cardClass = recentlySaved
                    ? "border-emerald-300 bg-emerald-50/70 ring-2 ring-emerald-100"
                    : notRecommended
                      ? "border-rose-200 bg-white"
                      : assessed
                        ? "border-emerald-200 bg-white"
                        : "border-stone-200 bg-white";

                  return (
                    <article
                      key={entry.key}
                      className={`rounded-3xl border p-4 shadow-sm transition ${cardClass}`}
                    >
                      <div className="flex gap-3">
                        {book?.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt=""
                            className="h-28 w-20 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="h-28 w-20 rounded-xl bg-stone-200" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                            {bookTypeLabel(book?.book_type)}
                          </p>
                          <h3 className="mt-1 line-clamp-3 text-lg font-black text-stone-900">
                            {book?.title ?? "Untitled book"}
                          </h3>
                          {book?.author ? (
                            <p className="mt-1 line-clamp-2 text-sm text-stone-500">
                              {book.author}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {entry.dnf_at ? (
                              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-800">
                                DNF
                              </span>
                            ) : null}
                            {currentlyReading ? (
                              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-800">
                                Currently Reading
                              </span>
                            ) : null}
                            {wantToRead ? (
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-800">
                                Want to Read
                              </span>
                            ) : null}
                            {recentlySaved ? (
                              <span className="rounded-full border border-emerald-400 bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-900 shadow-sm">
                                Saved Assessment
                              </span>
                            ) : (
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                                  notForTeaching
                                    ? "border-rose-200 bg-rose-50 text-rose-800"
                                    : assessed
                                    ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                                    : "border-blue-200 bg-blue-50 text-blue-800"
                                }`}
                              >
                                {notForTeaching
                                  ? "Not for Teaching"
                                  : assessed
                                    ? "Saved"
                                    : "Needs Assessment"}
                              </span>
                            )}
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-black ${teacherUseStatusBadgeClass(
                                entry.teacher_use_status
                              )}`}
                            >
                              {teacherUseStatusLabel(entry.teacher_use_status)}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-black ${difficultyBadgeClass(
                                entry.teacher_jlpt_difficulty
                              )}`}
                            >
                              {difficultyLabel(entry.teacher_jlpt_difficulty)}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-black ${suitabilityBadgeClass(
                                entry.teaching_suitability
                              )}`}
                            >
                              {suitabilityLabel(entry.teaching_suitability)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {entry.dnf_at ? (
                        <div className="mt-3 border-l-4 border-rose-200 pl-3">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">
                            DNF
                          </p>
                          <p className="mt-1 text-sm font-black text-stone-800">
                            {dnfReasonLabel(entry.dnf_reason)}
                            {retryLabel ? ` · ${retryLabel}` : ""}
                          </p>
                          {entry.dnf_note ? (
                            <>
                              <p
                                className={`mt-1 text-sm leading-6 text-stone-700 ${
                                  dnfExpanded ? "" : "line-clamp-2"
                                }`}
                              >
                                {entry.dnf_note}
                              </p>
                              {dnfCanExpand ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandedNote(`${entry.key}:dnf`)}
                                  className="mt-1 text-xs font-black text-rose-700 hover:text-rose-900"
                                >
                                  {dnfExpanded ? "Show less" : "Read full DNF note"}
                                </button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : null}

                      {entry.teacher_use_note ? (
                        <div className="mt-3 border-l-4 border-blue-200 pl-3">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                            Teacher note
                          </p>
                          <p
                            className={`mt-1 text-sm leading-6 text-stone-700 ${
                              noteExpanded ? "" : "line-clamp-2"
                            }`}
                          >
                            {entry.teacher_use_note}
                          </p>
                          {noteCanExpand ? (
                            <button
                              type="button"
                              onClick={() => toggleExpandedNote(entry.key)}
                              className="mt-1 text-xs font-black text-blue-700 hover:text-blue-900"
                            >
                              {noteExpanded ? "Show less" : "Read full note"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void openWorkspace(entry)}
                          disabled={openingKey === entry.key}
                          className="rounded-2xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {openingKey === entry.key ? "Opening..." : "Open Workspace"}
                        </button>
                        <button
                          type="button"
                          onClick={() => beginEditing(entry)}
                          className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800 hover:bg-blue-100"
                        >
                          {assessed || notForTeaching ? "Edit" : "Assess"}
                        </button>
                      </div>

                      {editing ? (
                        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                          <div className="grid gap-3">
                            <label className="block">
                              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                                JLPT Difficulty
                              </span>
                              <select
                                value={draft.difficulty}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setDraft({
                                    ...draft,
                                    difficulty: isTeachingDifficulty(value) ? value : "",
                                  });
                                }}
                                className="w-full rounded-2xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-stone-900"
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
                              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                                Teaching Suitability
                              </span>
                              <select
                                value={draft.suitability}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setDraft({
                                    ...draft,
                                    suitability: isTeachingSuitability(value) ? value : "",
                                  });
                                }}
                                className="w-full rounded-2xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-stone-900"
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
                              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                                Status
                              </span>
                              <select
                                value={draft.status}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  if (value === "" || isTeacherUseStatus(value)) {
                                    setDraft({ ...draft, status: value });
                                  }
                                }}
                                className="w-full rounded-2xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-stone-900"
                              >
                                <option value="">--</option>
                                {visibleTeacherUseStatusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                                Teacher Note
                              </span>
                              <textarea
                                value={draft.note}
                                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                                rows={3}
                                placeholder="Level fit, content warning, why it works, or why to avoid it..."
                                className="w-full resize-none rounded-2xl border border-blue-200 bg-white px-3 py-2 text-sm leading-6 text-stone-900"
                              />
                            </label>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void saveAssessment(entry)}
                                disabled={savingKey === entry.key}
                                className="rounded-2xl border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingKey === entry.key ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingKey(null);
                                  setDraft(null);
                                }}
                                className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-700 hover:bg-stone-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
