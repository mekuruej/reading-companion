// Live Lesson Add Word
//
// Teacher-scoped fast capture plus persistent review batching for a linked
// student's existing user_book_words rows.

"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  language_code: string | null;
};

type StudentUserBook = {
  id: string;
  user_id: string;
  book_id: string;
  books: BookMeta | BookMeta[] | null;
};

type LiveLessonSessionStatus =
  | "capturing"
  | "reviewing"
  | "deferred"
  | "completed"
  | "cancelled";

type LiveLessonSession = {
  id: string;
  teacher_id: string;
  student_id: string;
  user_book_id: string;
  status: LiveLessonSessionStatus;
  started_at: string | null;
  ended_adding_at: string | null;
  review_started_at: string | null;
  review_deferred_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CapturedWord = {
  id: string;
  vocabulary_cache_id?: number | null;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  page_number: number | null;
  page_order: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  target_language_code: string | null;
  support_language_code: string | null;
  item_type: string | null;
  meaning_choices?: string[] | null;
  meaning_choice_index?: number | null;
  jlpt?: string | null;
  is_common?: boolean | null;
  excluded_from_flashcards: boolean | null;
  hidden: boolean | null;
  created_at: string | null;
};

type ReviewDraft = {
  id: string;
  surface: string;
  reading: string;
  meaning: string;
  meaningChoices: string[];
  meaningChoiceIndex: number | null;
  pageNumber: string;
  chapterNumber: string;
  chapterName: string;
  targetLanguageCode: string;
};

type JishoCandidate = {
  id: string;
  surface: string;
  reading: string;
  defaultMeaning: string;
  meaningChoices: string[];
  meaningChoiceIndex: number | null;
  jlpt: string;
  isCommon: boolean;
};

const INITIAL_DICTIONARY_CHOICE_LIMIT = 2;

type PersistedLiveLessonSession = {
  version: 1;
  teacherId: string;
  studentId: string;
  userBookId: string;
  capturedRowIds: string[];
  currentPage: string;
  chapterNumber: string;
  chapterName: string;
  startedAt: number;
  savedAt: number;
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

function storageKey(teacherId: string, studentId: string, userBookId: string) {
  return `live-lesson-add:v1:${teacherId}:${studentId}:${userBookId}`;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function toInputNumber(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function formatDateTime(value: string | number | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isOlderSession(savedAt: number) {
  return Date.now() - savedAt > 24 * 60 * 60 * 1000;
}

function normalizeJlpt(value: unknown) {
  const text = String(value ?? "").toUpperCase();
  if (text.includes("N5")) return "N5";
  if (text.includes("N4")) return "N4";
  if (text.includes("N3")) return "N3";
  if (text.includes("N2")) return "N2";
  if (text.includes("N1")) return "N1";
  return "NON-JLPT";
}

function extractMeaningChoices(entry: any): string[] {
  const senses = entry?.senses ?? [];
  const choices: string[] = [];

  for (const sense of senses) {
    const definitions: string[] = sense?.english_definitions ?? [];
    const text = definitions.join("; ").trim();
    if (text) choices.push(text);
  }

  const seen = new Set<string>();
  return choices.filter((choice) => {
    const key = choice.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isExactJishoMatch(entry: any, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return false;
  if ((entry?.slug ?? "") === cleanQuery) return true;

  const japaneseForms = entry?.japanese ?? [];
  return japaneseForms.some(
    (form: any) =>
      (form?.word ?? "") === cleanQuery || (form?.reading ?? "") === cleanQuery
  );
}

function buildJishoCandidates(entries: any[], fallbackWord: string): JishoCandidate[] {
  const exactEntries = entries.filter((entry) => isExactJishoMatch(entry, fallbackWord));
  const sourceEntries = exactEntries.length > 0 ? exactEntries : entries;
  const candidates: JishoCandidate[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < sourceEntries.length; index += 1) {
    const entry = sourceEntries[index];
    const japaneseForms = entry?.japanese ?? [];
    const primaryForm =
      japaneseForms.find((form: any) => form?.word || form?.reading) ??
      japaneseForms[0] ??
      {};
    const surface = primaryForm?.word || entry?.slug || fallbackWord;
    const reading = primaryForm?.reading || "";
    const meaningChoices = extractMeaningChoices(entry);
    const candidateMeanings = meaningChoices.length > 0 ? meaningChoices : [""];

    for (let meaningIndex = 0; meaningIndex < candidateMeanings.length; meaningIndex += 1) {
      const defaultMeaning = candidateMeanings[meaningIndex];
      const candidate: JishoCandidate = {
        id: `${surface}__${reading || "no-reading"}__${index}__${meaningIndex}`,
        surface,
        reading,
        defaultMeaning,
        meaningChoices,
        meaningChoiceIndex: defaultMeaning ? meaningIndex : null,
        jlpt: normalizeJlpt(entry?.jlpt?.[0] || ""),
        isCommon: !!entry?.is_common,
      };
      const dedupeKey = [
        candidate.surface,
        candidate.reading,
        candidate.defaultMeaning,
      ].join("___");
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      candidates.push(candidate);
    }
  }

  return candidates;
}

function readPersistedSession(
  key: string,
  teacherId: string,
  studentId: string,
  userBookId: string
) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedLiveLessonSession;
    if (
      parsed?.version !== 1 ||
      parsed.teacherId !== teacherId ||
      parsed.studentId !== studentId ||
      parsed.userBookId !== userBookId
    ) {
      return null;
    }

    return {
      ...parsed,
      capturedRowIds: Array.isArray(parsed.capturedRowIds)
        ? uniqueStrings(parsed.capturedRowIds)
        : [],
      currentPage: typeof parsed.currentPage === "string" ? parsed.currentPage : "",
      chapterNumber:
        typeof parsed.chapterNumber === "string" ? parsed.chapterNumber : "",
      chapterName: typeof parsed.chapterName === "string" ? parsed.chapterName : "",
      startedAt:
        typeof parsed.startedAt === "number" && Number.isFinite(parsed.startedAt)
          ? parsed.startedAt
          : Date.now(),
      savedAt:
        typeof parsed.savedAt === "number" && Number.isFinite(parsed.savedAt)
          ? parsed.savedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

function writePersistedSession(key: string, session: PersistedLiveLessonSession) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ ...session, savedAt: Date.now() })
    );
  } catch {
    // Best-effort bridge for pre-Phase-2 local recovery only.
  }
}

function clearPersistedSession(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Best-effort only.
  }
}

function wordToDraft(word: CapturedWord): ReviewDraft {
  return {
    id: word.id,
    surface: word.surface ?? "",
    reading: word.reading ?? "",
    meaning: word.meaning ?? "",
    meaningChoices: Array.isArray(word.meaning_choices) ? word.meaning_choices : [],
    meaningChoiceIndex:
      typeof word.meaning_choice_index === "number" ? word.meaning_choice_index : null,
    pageNumber: toInputNumber(word.page_number),
    chapterNumber: toInputNumber(word.chapter_number),
    chapterName: word.chapter_name ?? "",
    targetLanguageCode: word.target_language_code ?? "ja",
  };
}

function draftReady(draft: ReviewDraft) {
  if (!draft.surface.trim() || !draft.meaning.trim()) return false;
  if (draft.targetLanguageCode === "en") return true;
  return !!draft.reading.trim();
}

export default function LiveLessonAddWordPage() {
  const params = useParams<{ studentId: string; userBookId: string }>();
  const searchParams = useSearchParams();
  const studentId = params.studentId ?? "";
  const userBookId = params.userBookId ?? "";
  const requestedSessionId = searchParams.get("sessionId") ?? "";

  const wordInputRef = useRef<HTMLInputElement | null>(null);
  const skipNextPersistRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lookupLoadingId, setLookupLoadingId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentBook, setStudentBook] = useState<StudentUserBook | null>(null);
  const [session, setSession] = useState<LiveLessonSession | null>(null);
  const [word, setWord] = useState("");
  const [currentPage, setCurrentPage] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [capturedWords, setCapturedWords] = useState<CapturedWord[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDraft[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [sessionReady, setSessionReady] = useState(false);
  const [restoredOlderSession, setRestoredOlderSession] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkPage, setBulkPage] = useState("");
  const [bulkChapterNumber, setBulkChapterNumber] = useState("");
  const [bulkChapterName, setBulkChapterName] = useState("");
  const [lookupChoicesById, setLookupChoicesById] = useState<
    Record<string, JishoCandidate[]>
  >({});
  const [expandedLookupChoicesById, setExpandedLookupChoicesById] = useState<
    Record<string, boolean>
  >({});

  const key = teacherId ? storageKey(teacherId, studentId, userBookId) : "";
  const book = firstBook(studentBook?.books ?? null);
  const isEnglishBook = book?.language_code === "en";
  const studentName = student?.display_name || student?.username || "Student";
  const backHref = student?.username
    ? `/users/${encodeURIComponent(student.username)}/books`
    : "/teacher/students";
  const capturedIds = useMemo(
    () => capturedWords.map((capturedWord) => capturedWord.id),
    [capturedWords]
  );
  const isReviewStage =
    session?.status === "reviewing" ||
    session?.status === "deferred" ||
    session?.status === "completed";
  const readyCount = reviewDrafts.filter(draftReady).length;

  useEffect(() => {
    void loadContextAndRestore();
  }, [studentId, userBookId, requestedSessionId]);

  useEffect(() => {
    if (!key || !sessionReady || session?.status !== "capturing") return;

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    writePersistedSession(key, {
      version: 1,
      teacherId,
      studentId,
      userBookId,
      capturedRowIds: capturedIds,
      currentPage,
      chapterNumber,
      chapterName,
      startedAt,
      savedAt: Date.now(),
    });
  }, [
    key,
    sessionReady,
    session?.status,
    teacherId,
    studentId,
    userBookId,
    capturedIds,
    currentPage,
    chapterNumber,
    chapterName,
    startedAt,
  ]);

  async function authHeaders() {
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();

    return authSession?.access_token
      ? { Authorization: `Bearer ${authSession.access_token}` }
      : undefined;
  }

  async function loadSessionFromApi(nextSessionId?: string) {
    const query = new URLSearchParams({ studentId, userBookId });
    if (nextSessionId) query.set("sessionId", nextSessionId);
    const headers = await authHeaders();
    const response = await fetch(
      `/api/teacher/live-lesson-words?${query.toString()}`,
      { headers }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error ?? "Could not restore Live Lesson session.");
    }

    return data as {
      session: LiveLessonSession | null;
      words: CapturedWord[];
    };
  }

  async function migrateLocalSession(
    persisted: PersistedLiveLessonSession,
    nextKey: string
  ) {
    const headers = await authHeaders();
    const response = await fetch("/api/teacher/live-lesson-words", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: JSON.stringify({
        action: "migrate-local-session",
        studentId,
        userBookId,
        rowIds: persisted.capturedRowIds,
        startedAt: persisted.startedAt,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error ?? "Could not migrate the local Live Lesson session.");
    }

    clearPersistedSession(nextKey);
    skipNextPersistRef.current = true;
    return data as {
      session: LiveLessonSession | null;
      words: CapturedWord[];
    };
  }

  async function loadContextAndRestore() {
    setLoading(true);
    setMessage("");
    setNotice("");
    setSessionReady(false);
    setCapturedWords([]);
    setReviewDrafts([]);
    setRestoredOlderSession(false);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
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
          books:book_id (
            id,
            title,
            author,
            cover_url,
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

      if (!isSuperTeacherRole(profile)) {
        const { data: link, error: linkError } = await supabase
          .from("teacher_students")
          .select("id")
          .eq("teacher_id", user.id)
          .eq("student_id", studentId)
          .is("archived_at", null)
          .maybeSingle();

        if (linkError) throw linkError;

        if (!link) {
          setMessage("You do not have access to this student's book.");
          return;
        }
      }

      const { data: studentProfile, error: studentError } = await supabase
        .from("profiles")
        .select("id, display_name, username, level")
        .eq("id", studentId)
        .maybeSingle();

      if (studentError) throw studentError;

      const nextTeacherId = user.id;
      const nextKey = storageKey(nextTeacherId, studentId, userBookId);
      const persisted = readPersistedSession(
        nextKey,
        nextTeacherId,
        studentId,
        userBookId
      );

      setTeacherId(nextTeacherId);
      setStudent((studentProfile ?? null) as StudentProfile | null);
      setStudentBook(loadedStudentBook);

      let restored = await loadSessionFromApi(requestedSessionId);

      if (!restored.session && persisted && persisted.capturedRowIds.length > 0) {
        restored = await migrateLocalSession(persisted, nextKey);
        setCurrentPage(persisted.currentPage);
        setChapterNumber(persisted.chapterNumber);
        setChapterName(persisted.chapterName);
        setStartedAt(persisted.startedAt);
        setRestoredOlderSession(isOlderSession(persisted.savedAt));
      } else if (persisted && !restored.session) {
        setCurrentPage(persisted.currentPage);
        setChapterNumber(persisted.chapterNumber);
        setChapterName(persisted.chapterName);
        setStartedAt(persisted.startedAt);
        setRestoredOlderSession(isOlderSession(persisted.savedAt));
      } else {
        const startedValue = restored.session?.started_at
          ? new Date(restored.session.started_at).getTime()
          : Date.now();
        setCurrentPage("");
        setChapterNumber("");
        setChapterName("");
        setStartedAt(startedValue);
      }

      setSession(restored.session);
      setCapturedWords(restored.words ?? []);
      setReviewDrafts((restored.words ?? []).map(wordToDraft));
      setBulkSelectedIds((restored.words ?? []).map((item) => item.id));
      setSessionReady(true);
      window.setTimeout(() => wordInputRef.current?.focus(), 0);
    } catch (error: any) {
      console.error("Error loading Live Lesson Add Word:", error);
      setMessage(error?.message ?? "Could not load Live Lesson Add Word.");
    } finally {
      setLoading(false);
    }
  }

  function nudgePage(delta: number) {
    const value = Number(currentPage);
    if (!Number.isFinite(value)) {
      if (delta > 0) setCurrentPage("1");
      return;
    }

    setCurrentPage(String(Math.max(1, value + delta)));
  }

  async function captureWord(event: FormEvent) {
    event.preventDefault();

    const cleanWord = word.trim();
    if (!cleanWord || saving || isReviewStage) return;

    setSaving(true);
    setMessage("");
    setNotice("");

    try {
      const headers = await authHeaders();
      const response = await fetch("/api/teacher/live-lesson-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify({
          studentId,
          userBookId,
          sessionId: session?.id,
          surface: cleanWord,
          page: currentPage,
          chapterNumber,
          chapterName,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not save this word.");
      }

      const nextSession = data.session as LiveLessonSession;
      const nextWords = (data.words ?? []) as CapturedWord[];
      const capturedWord = data.word as CapturedWord;
      setSession(nextSession);
      setCapturedWords(nextWords.length ? nextWords : [...capturedWords, capturedWord]);
      setReviewDrafts((nextWords.length ? nextWords : [...capturedWords, capturedWord]).map(wordToDraft));
      setBulkSelectedIds((prev) => uniqueStrings([...prev, capturedWord.id]));
      setWord("");
      setNotice(`Saved ${capturedWord.surface ?? cleanWord}`);
      window.setTimeout(() => {
        wordInputRef.current?.focus({ preventScroll: true });
      }, 0);
    } catch (error: any) {
      console.error("Live Lesson capture failed:", error);
      setMessage(error?.message ?? "Could not save this word.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCapturedWord(capturedWord: CapturedWord) {
    if (deletingId) return;
    const label = capturedWord.surface?.trim() || "this word";
    const confirmed = window.confirm(`Delete "${label}" from the student's vocabulary?`);
    if (!confirmed) return;

    setDeletingId(capturedWord.id);
    setMessage("");
    setNotice("");

    try {
      const headers = await authHeaders();
      const response = await fetch("/api/teacher/live-lesson-words", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify({
          studentId,
          userBookId,
          wordId: capturedWord.id,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not delete this word.");
      }

      setCapturedWords((prev) => prev.filter((item) => item.id !== capturedWord.id));
      setReviewDrafts((prev) => prev.filter((item) => item.id !== capturedWord.id));
      setBulkSelectedIds((prev) => prev.filter((id) => id !== capturedWord.id));
      setNotice(`Deleted ${label}`);
      window.setTimeout(() => wordInputRef.current?.focus({ preventScroll: true }), 0);
    } catch (error: any) {
      console.error("Live Lesson delete failed:", error);
      setMessage(error?.message ?? "Could not delete this word.");
    } finally {
      setDeletingId(null);
    }
  }

  function updateReviewDraft(id: string, patch: Partial<ReviewDraft>) {
    setReviewDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  }

  function toggleBulkSelected(id: string) {
    setBulkSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function applyBulkLocation() {
    if (bulkSelectedIds.length === 0) {
      setNotice("Choose at least one row first.");
      return;
    }

    setReviewDrafts((prev) =>
      prev.map((draft) => {
        if (!bulkSelectedIds.includes(draft.id)) return draft;
        return {
          ...draft,
          ...(bulkPage.trim() ? { pageNumber: bulkPage } : {}),
          ...(bulkChapterNumber.trim() ? { chapterNumber: bulkChapterNumber } : {}),
          ...(bulkChapterName.trim() ? { chapterName: bulkChapterName } : {}),
        };
      })
    );
    setNotice(`Applied location to ${bulkSelectedIds.length} item${bulkSelectedIds.length === 1 ? "" : "s"}.`);
  }

  async function transitionSession(action: "end-adding" | "review-later" | "finish-review") {
    if (!session) {
      setMessage("Add at least one word before ending this Live Lesson session.");
      return;
    }

    if (action === "end-adding" && capturedWords.length === 0) {
      setMessage("Add at least one word before ending this Live Lesson session.");
      return;
    }

    setReviewSaving(true);
    setMessage("");
    setNotice("");

    try {
      const headers = await authHeaders();
      const response = await fetch("/api/teacher/live-lesson-words", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify({
          action,
          studentId,
          userBookId,
          sessionId: session.id,
          words: reviewDrafts,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not update the Live Lesson session.");
      }

      const nextSession = data.session as LiveLessonSession;
      const nextWords = (data.words ?? []) as CapturedWord[];
      setSession(nextSession);
      setCapturedWords(nextWords);
      setReviewDrafts(nextWords.map(wordToDraft));
      setBulkSelectedIds(nextWords.map((item) => item.id));

      if (key && action !== "end-adding") {
        clearPersistedSession(key);
        skipNextPersistRef.current = true;
      }

      if (action === "end-adding") {
        setNotice("Adding is finished. Review the batch below.");
      } else if (action === "review-later") {
        setNotice("Review saved for later. This batch can be reopened from this Live Lesson page.");
      } else {
        setNotice("Review finished. Complete rows are now available for flashcards.");
      }
    } catch (error: any) {
      console.error("Live Lesson session transition failed:", error);
      setMessage(error?.message ?? "Could not update the Live Lesson session.");
    } finally {
      setReviewSaving(false);
    }
  }

  async function lookupDraft(draft: ReviewDraft) {
    if (draft.targetLanguageCode === "en") {
      setNotice("English Reader rows use manual Japanese support for now.");
      return;
    }

    const cleanSurface = draft.surface.trim();
    if (!cleanSurface) {
      setNotice("Enter a word before searching.");
      return;
    }

    setLookupLoadingId(draft.id);
    setMessage("");
    setNotice(`Searching ${cleanSurface}...`);

    try {
      const headers = await authHeaders();
      const response = await fetch(`/api/jisho?keyword=${encodeURIComponent(cleanSurface)}`, {
        headers,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Jisho lookup failed.");
      }

      const candidates = buildJishoCandidates(data?.data ?? [], cleanSurface);
      if (candidates.length === 0) {
        setLookupChoicesById((prev) => ({ ...prev, [draft.id]: [] }));
        setExpandedLookupChoicesById((prev) => ({ ...prev, [draft.id]: false }));
        setNotice(`No Jisho result found for ${cleanSurface}. You can still edit it manually.`);
        return;
      }

      const first = candidates[0];
      updateReviewDraft(draft.id, {
        surface: first.surface,
        reading: first.reading,
        meaning: first.defaultMeaning,
        meaningChoices: first.meaningChoices,
        meaningChoiceIndex: first.meaningChoiceIndex,
      });
      setLookupChoicesById((prev) => ({ ...prev, [draft.id]: candidates }));
      setExpandedLookupChoicesById((prev) => ({ ...prev, [draft.id]: false }));
      setNotice(
        candidates.length > 1
          ? "Dictionary info loaded. Choose the result that matches the book."
          : "Dictionary info loaded."
      );
    } catch (error: any) {
      console.error("Live Lesson lookup failed:", error);
      setMessage(error?.message ?? "Could not search Jisho.");
    } finally {
      setLookupLoadingId(null);
    }
  }

  function applyCandidate(draftId: string, candidate: JishoCandidate) {
    updateReviewDraft(draftId, {
      surface: candidate.surface,
      reading: candidate.reading,
      meaning: candidate.defaultMeaning,
      meaningChoices: candidate.meaningChoices,
      meaningChoiceIndex: candidate.meaningChoiceIndex,
    });
    setExpandedLookupChoicesById((prev) => ({ ...prev, [draftId]: false }));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          Loading Live Lesson Add Word...
        </div>
      </main>
    );
  }

  if (message && !studentBook) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href="/teacher/students" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            &lt;- Students
          </Link>
          <h1 className="mt-4 text-2xl font-black text-stone-950">Live Lesson Add Word</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={backHref} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            &lt;- Back to Student Library
          </Link>
          {!isReviewStage ? (
            <button
              type="button"
              onClick={() => void transitionSession("end-adding")}
              disabled={reviewSaving || capturedWords.length === 0}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reviewSaving ? "Opening review..." : "End Adding Words"}
            </button>
          ) : null}
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {book?.cover_url ? (
              <img
                src={book.cover_url}
                alt=""
                className="h-20 w-14 rounded-md object-cover shadow-sm"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                Live Lesson Add Word
              </p>
              <h1 className="mt-1 text-2xl font-black leading-tight text-stone-950">
                {book?.title ?? "Student book"}
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                {studentName}
                {student?.level ? ` - ${student.level}` : ""}
                {book?.language_code ? ` - ${book.language_code.toUpperCase()}` : ""}
                {session?.status ? ` - ${session.status}` : ""}
              </p>
            </div>
          </div>
        </section>

        {restoredOlderSession ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Migrated an older unfinished local session from {formatDateTime(startedAt)}.
            It is now saved as a persistent Live Lesson batch.
          </div>
        ) : null}

        {session?.status === "deferred" ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
            This batch was saved for later. Continue editing below, then finish or save it for later again.
          </div>
        ) : null}

        {session?.status === "completed" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            This Live Lesson review is complete. Saved vocabulary rows remain in the student's book.
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
            {message}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-700 shadow-sm">
            {notice}
          </div>
        ) : null}

        {!isReviewStage ? (
          <>
            <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_220px]">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Chapter number
                  </span>
                  <input
                    type="number"
                    value={chapterNumber}
                    onChange={(event) => setChapterNumber(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Chapter name
                  </span>
                  <input
                    value={chapterName}
                    onChange={(event) => setChapterName(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Current page
                  </span>
                  <div className="flex rounded-xl border border-amber-300 bg-amber-50 p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => nudgePage(-1)}
                      className="h-11 w-11 rounded-lg bg-white text-xl font-black text-stone-800 shadow-sm hover:bg-amber-100"
                      aria-label="Previous page"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={currentPage}
                      onChange={(event) => setCurrentPage(event.target.value)}
                      placeholder="Page"
                      className="min-w-0 flex-1 bg-transparent px-2 text-center text-2xl font-black text-stone-950 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => nudgePage(1)}
                      className="h-11 w-11 rounded-lg bg-white text-xl font-black text-stone-800 shadow-sm hover:bg-amber-100"
                      aria-label="Next page"
                    >
                      +
                    </button>
                  </div>
                </label>
              </div>

              <form onSubmit={captureWord} className="mt-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Word or phrase
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      ref={wordInputRef}
                      value={word}
                      onChange={(event) => setWord(event.target.value)}
                      placeholder={isEnglishBook ? "bring oneself to do" : "見落とす"}
                      className="min-h-14 flex-1 rounded-xl border border-stone-300 bg-white px-4 text-xl font-semibold text-stone-950 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                    <button
                      type="submit"
                      disabled={saving || !word.trim()}
                      className="min-h-14 rounded-xl bg-stone-950 px-6 text-base font-black text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Add"}
                    </button>
                  </div>
                </label>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                  <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900">
                    Page {currentPage.trim() || "not set"}
                  </span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 font-semibold text-stone-700">
                    Chapter # {chapterNumber.trim() || "not set"}
                  </span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 font-semibold text-stone-700">
                    {chapterName.trim() || "No chapter name"}
                  </span>
                </div>
              </form>
            </section>

            <CapturedList
              capturedWords={capturedWords}
              startedAt={formatDateTime(session?.started_at ?? startedAt)}
              deletingId={deletingId}
              onDelete={deleteCapturedWord}
            />
          </>
        ) : (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                  Review & Finish
                </p>
                <h2 className="mt-1 text-2xl font-black text-stone-950">
                  {reviewDrafts.length} captured item{reviewDrafts.length === 1 ? "" : "s"}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {readyCount} ready for flashcards. Incomplete rows stay saved but excluded.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {session?.status !== "completed" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void transitionSession("review-later")}
                      disabled={reviewSaving}
                      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50"
                    >
                      {reviewSaving ? "Saving..." : "Review Later"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void transitionSession("finish-review")}
                      disabled={reviewSaving}
                      className="rounded-lg bg-stone-950 px-3 py-2 text-sm font-black text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
                    >
                      {reviewSaving ? "Saving..." : "Save & Finish Review"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {session?.status !== "completed" ? (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sky-900">
                      Page
                    </span>
                    <input
                      type="number"
                      value={bulkPage}
                      onChange={(event) => setBulkPage(event.target.value)}
                      className="w-28 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sky-900">
                      Chapter #
                    </span>
                    <input
                      type="number"
                      value={bulkChapterNumber}
                      onChange={(event) => setBulkChapterNumber(event.target.value)}
                      className="w-28 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block min-w-48 flex-1">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sky-900">
                      Chapter name
                    </span>
                    <input
                      value={bulkChapterName}
                      onChange={(event) => setBulkChapterName(event.target.value)}
                      className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={applyBulkLocation}
                    className="rounded-lg bg-sky-900 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                  >
                    Apply to selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedIds(reviewDrafts.map((draft) => draft.id))}
                    className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-900"
                  >
                    Select all
                  </button>
                </div>
              </div>
            ) : null}

            {reviewDrafts.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
                No captured words are attached to this Live Lesson session.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {reviewDrafts.map((draft, index) => {
                  const choices = lookupChoicesById[draft.id] ?? [];
                  const choicesExpanded = !!expandedLookupChoicesById[draft.id];
                  const visibleChoices = choicesExpanded
                    ? choices
                    : choices.slice(0, INITIAL_DICTIONARY_CHOICE_LIMIT);
                  const hiddenChoiceCount =
                    choices.length - INITIAL_DICTIONARY_CHOICE_LIMIT;
                  const ready = draftReady(draft);
                  const isCompleted = session?.status === "completed";

                  return (
                    <div
                      key={draft.id}
                      className="rounded-xl border border-stone-200 bg-stone-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                          <input
                            type="checkbox"
                            checked={bulkSelectedIds.includes(draft.id)}
                            onChange={() => toggleBulkSelected(draft.id)}
                            disabled={isCompleted}
                          />
                          Item {index + 1}
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              ready
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {ready ? "Ready" : "Incomplete"}
                          </span>
                          {draft.targetLanguageCode !== "en" && !isCompleted ? (
                            <button
                              type="button"
                              onClick={() => void lookupDraft(draft)}
                              disabled={lookupLoadingId === draft.id}
                              className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-50 disabled:opacity-50"
                            >
                              {lookupLoadingId === draft.id ? "Searching..." : "Jisho lookup"}
                            </button>
                          ) : null}
                          {!isCompleted ? (
                            <button
                              type="button"
                              onClick={() =>
                                void deleteCapturedWord({
                                  id: draft.id,
                                  surface: draft.surface,
                                  reading: draft.reading,
                                  meaning: draft.meaning,
                                  meaning_choices: draft.meaningChoices,
                                  meaning_choice_index: draft.meaningChoiceIndex,
                                  page_number: null,
                                  page_order: null,
                                  chapter_number: null,
                                  chapter_name: null,
                                  target_language_code: draft.targetLanguageCode,
                                  support_language_code: null,
                                  item_type: "word",
                                  excluded_from_flashcards: true,
                                  hidden: false,
                                  created_at: null,
                                })
                              }
                              disabled={deletingId === draft.id}
                              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {deletingId === draft.id ? "Deleting..." : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr_1.4fr]">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Word
                          </span>
                          <input
                            value={draft.surface}
                            onChange={(event) =>
                              updateReviewDraft(draft.id, { surface: event.target.value })
                            }
                            disabled={isCompleted}
                            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-950 disabled:bg-stone-100"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Reading
                          </span>
                          <input
                            value={draft.reading}
                            onChange={(event) =>
                              updateReviewDraft(draft.id, { reading: event.target.value })
                            }
                            disabled={isCompleted || draft.targetLanguageCode === "en"}
                            placeholder={draft.targetLanguageCode === "en" ? "Not required" : ""}
                            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Meaning / support
                          </span>
                          <input
                            value={draft.meaning}
                            onChange={(event) =>
                              updateReviewDraft(draft.id, { meaning: event.target.value })
                            }
                            disabled={isCompleted}
                            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                          />
                        </label>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Page
                          </span>
                          <input
                            type="number"
                            value={draft.pageNumber}
                            onChange={(event) =>
                              updateReviewDraft(draft.id, { pageNumber: event.target.value })
                            }
                            disabled={isCompleted}
                            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Chapter number
                          </span>
                          <input
                            type="number"
                            value={draft.chapterNumber}
                            onChange={(event) =>
                              updateReviewDraft(draft.id, { chapterNumber: event.target.value })
                            }
                            disabled={isCompleted}
                            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Chapter name
                          </span>
                          <input
                            value={draft.chapterName}
                            onChange={(event) =>
                              updateReviewDraft(draft.id, { chapterName: event.target.value })
                            }
                            disabled={isCompleted}
                            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                          />
                        </label>
                      </div>

                      {choices.length > 1 ? (
                        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-sky-900">
                            Dictionary choices
                          </p>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            {visibleChoices.map((candidate) => (
                              <button
                                key={candidate.id}
                                type="button"
                                onClick={() => applyCandidate(draft.id, candidate)}
                                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-left text-sm hover:bg-sky-50"
                              >
                                <span className="font-semibold text-stone-950">
                                  {candidate.surface}
                                </span>
                                <span className="ml-2 text-stone-500">
                                  {candidate.reading || "No reading"}
                                </span>
                                <span className="mt-1 block text-stone-700">
                                  {candidate.defaultMeaning || "No meaning"}
                                </span>
                              </button>
                            ))}
                          </div>
                          {hiddenChoiceCount > 0 && !choicesExpanded ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedLookupChoicesById((prev) => ({
                                  ...prev,
                                  [draft.id]: true,
                                }))
                              }
                              className="mt-3 rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-50"
                            >
                              Show more definitions ({hiddenChoiceCount} more)
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function CapturedList({
  capturedWords,
  startedAt,
  deletingId,
  onDelete,
}: {
  capturedWords: CapturedWord[];
  startedAt: string;
  deletingId: string | null;
  onDelete: (capturedWord: CapturedWord) => void;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-stone-950">
            Captured This Lesson
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Started {startedAt || "now"} - {capturedWords.length} saved
          </p>
        </div>
      </div>

      {capturedWords.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
          No words captured in this session yet.
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100">
          {capturedWords.map((capturedWord) => {
            const incomplete =
              !capturedWord.meaning?.trim() ||
              (capturedWord.target_language_code !== "en" &&
                !capturedWord.reading?.trim());

            return (
              <li
                key={capturedWord.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words text-lg font-black text-stone-950">
                      {capturedWord.surface || "Untitled word"}
                    </span>
                    {incomplete ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Needs details
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    Page {toInputNumber(capturedWord.page_number) || "-"}
                    {" - "}
                    Chapter # {toInputNumber(capturedWord.chapter_number) || "-"}
                    {" - "}
                    {capturedWord.chapter_name || "No chapter name"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(capturedWord)}
                  disabled={deletingId === capturedWord.id}
                  className="self-start rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 sm:self-auto"
                >
                  {deletingId === capturedWord.id ? "Deleting..." : "Delete"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
