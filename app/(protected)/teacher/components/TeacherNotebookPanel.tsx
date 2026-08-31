"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type NotebookTab =
  | "book_character"
  | "book_plot"
  | "book_quote"
  | "book_note"
  | "grammar"
  | "phrase"
  | "translation"
  | "special_vocab"
  | "note";

type EntryType = NotebookTab;
type JournalGroup = "book_journal" | "teaching_notes";

type TeacherNotebookPanelProps = {
  teacherBookId?: string | null;
  bookId?: string | null;
  userBookId?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  lessonDate?: string | null;
  compact?: boolean;
  enableWordCapture?: boolean;
  mode?: "lesson" | "prep";
  initialTab?: NotebookTab | null;
  initialSearch?: string | null;
};

type NotebookEntry = {
  id: string;
  teacher_id: string;
  entry_type: EntryType;
  title: string | null;
  surface_text: string | null;
  reading: string | null;
  meaning: string | null;
  body: string | null;
  journal_visibility?: "book_shared" | "teaching_private" | null;
  created_at: string | null;
  updated_at: string | null;
  teacher_notebook_entry_contexts?: NotebookContext[];
};

type NotebookContext = {
  id: string;
  entry_id: string;
  student_id: string | null;
  book_id: string | null;
  user_book_id: string | null;
  teacher_book_id: string | null;
  page_number: number | null;
  percent_location: number | null;
  lesson_date: string | null;
  created_at: string | null;
};

type WordList = {
  id: string;
  teacher_id: string;
  status: "active" | "processed" | "archived";
};

type WordDraft = {
  id: string;
  word_list_id: string;
  surface: string;
  sort_order: number | null;
  processed_at: string | null;
  created_at: string | null;
};

type EntryDraft = {
  title: string;
  surfaceText: string;
  reading: string;
  meaning: string;
  partOfSpeech: string;
  register: string;
  body: string;
  page: string;
  percent: string;
};

type LocationDraft = {
  page: string;
  percent: string;
};

const bookJournalTabs: Array<{ id: NotebookTab; label: string }> = [
  { id: "book_character", label: "Characters" },
  { id: "book_plot", label: "Plot" },
  { id: "book_quote", label: "Quotes" },
  { id: "book_note", label: "General Notes" },
];

const teachingNoteTabs: Array<{ id: NotebookTab; label: string }> = [
  { id: "grammar", label: "Grammar" },
  { id: "phrase", label: "Phrases" },
  { id: "translation", label: "Translation" },
  { id: "special_vocab", label: "Special Vocab" },
  { id: "note", label: "Lesson Notes" },
];

const tabs = [...bookJournalTabs, ...teachingNoteTabs];

const entryLabels: Record<EntryType, { singular: string; input: string; body: string }> = {
  book_character: {
    singular: "Character",
    input: "Character name",
    body: "Notes",
  },
  book_plot: {
    singular: "Plot Note",
    input: "Plot point",
    body: "Notes",
  },
  book_quote: {
    singular: "Quote",
    input: "Quote or memorable line",
    body: "Notes",
  },
  book_note: {
    singular: "General Note",
    input: "Title",
    body: "Body",
  },
  special_vocab: {
    singular: "Special Vocab",
    input: "Name, term, or special word",
    body: "Note",
  },
  grammar: {
    singular: "Grammar",
    input: "Grammar form",
    body: "Explanation",
  },
  phrase: {
    singular: "Phrase",
    input: "Phrase",
    body: "Note",
  },
  translation: {
    singular: "Translation",
    input: "Source text",
    body: "Note",
  },
  note: {
    singular: "Note",
    input: "Title",
    body: "Body",
  },
};

const teacherPrepTabHelperText: Record<EntryType, string> = {
  book_character: "Shared book knowledge. These Book Journal notes can appear in Teacher Journal and future Reader Journal views for this book.",
  book_plot: "Shared book knowledge. These Book Journal notes can appear in Teacher Journal and future Reader Journal views for this book.",
  book_quote: "Shared book knowledge. These Book Journal notes can appear in Teacher Journal and future Reader Journal views for this book.",
  book_note: "Shared book knowledge. These Book Journal notes can appear in Teacher Journal and future Reader Journal views for this book.",
  grammar: "Reusable across books. Add a page or percent when you encounter this in a Student Lesson.",
  phrase: "Reusable across books. Add a page or percent when you encounter this in a Student Lesson.",
  translation: "Usually tied to this book. Add a page or percent if it helps you find the passage again.",
  special_vocab: "Usually tied to this book. Add a page or percent if it helps you find the passage again.",
  note: "For this teaching context. Page or percent is optional.",
};

const grammarPartOfSpeechLabel = "Parts of speech:";
const grammarRegisterLabel = "Register:";

function blankEntryDraft(): EntryDraft {
  return {
    title: "",
    surfaceText: "",
    reading: "",
    meaning: "",
    partOfSpeech: "",
    register: "",
    body: "",
    page: "",
    percent: "",
  };
}

function parseGrammarBody(body: string | null | undefined) {
  const lines = (body ?? "").split(/\r?\n/);
  let partOfSpeech = "";
  let register = "";
  const explanationLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!partOfSpeech && trimmed.toLowerCase().startsWith(grammarPartOfSpeechLabel.toLowerCase())) {
      partOfSpeech = trimmed.slice(grammarPartOfSpeechLabel.length).trim();
      continue;
    }

    if (!register && trimmed.toLowerCase().startsWith(grammarRegisterLabel.toLowerCase())) {
      register = trimmed.slice(grammarRegisterLabel.length).trim();
      continue;
    }

    explanationLines.push(line);
  }

  return {
    partOfSpeech,
    register,
    explanation: explanationLines.join("\n").trim(),
  };
}

function formatGrammarBody(draft: EntryDraft) {
  return [
    draft.partOfSpeech?.trim() ? `${grammarPartOfSpeechLabel} ${draft.partOfSpeech.trim()}` : "",
    draft.register?.trim() ? `${grammarRegisterLabel} ${draft.register.trim()}` : "",
    draft.body.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function isTeacherRole(profile: any) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "admin" ||
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

function journalGroupForTab(tab: NotebookTab): JournalGroup {
  return bookJournalTabs.some((candidate) => candidate.id === tab)
    ? "book_journal"
    : "teaching_notes";
}

function clean(value: string) {
  const next = value.trim();
  return next ? next : null;
}

function parseNumber(value: string) {
  const next = value.trim();
  if (!next) return null;
  const numberValue = Number(next);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseNotebookLocation(pageValue: string, percentValue: string) {
  const pageText = pageValue.trim();
  const percentText = percentValue.trim();
  const pageHasPercent = pageText.includes("%");
  const pageNumber = pageHasPercent
    ? null
    : parseNumber(pageText);
  const percentLocation = pageHasPercent
    ? parseNumber(pageText.replace(/%/g, "").trim())
    : parseNumber(percentText.replace(/%/g, "").trim());

  return { pageNumber, percentLocation };
}

function contextSummary(context: NotebookContext | undefined) {
  if (!context) return "";
  const pieces = [];
  if (context.page_number != null) pieces.push(`p. ${context.page_number}`);
  if (context.percent_location != null) pieces.push(`${context.percent_location}%`);
  if (context.lesson_date) pieces.push(context.lesson_date);
  return pieces.join(" · ");
}

function entryMainText(entry: NotebookEntry) {
  return (
    entry.surface_text?.trim() ||
    entry.title?.trim() ||
    entry.meaning?.trim() ||
    "Untitled"
  );
}

function entrySearchText(entry: NotebookEntry) {
  return [
    entry.title,
    entry.surface_text,
    entry.reading,
    entry.meaning,
    entry.body,
  ]
    .join(" ")
    .toLowerCase();
}

function normalizeNotebookSearch(value: string, entryType: EntryType) {
  let next = value.toLowerCase().trim().replace(/\s+/g, " ");

  if (entryType === "grammar") {
    next = next
      .replace(/^[〜～]+/, "")
      .replace(/\s+/g, "")
      .replace(/[①②③④⑤⑥⑦⑧⑨⑩]+$/g, "");
  }

  return next;
}

function searchableEntryValues(entry: NotebookEntry) {
  return [
    entry.title,
    entry.surface_text,
    entry.reading,
    entry.meaning,
    entry.body,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function entrySearchRank(entry: NotebookEntry, query: string, entryType: EntryType) {
  const rawQuery = query.trim().toLowerCase();
  if (!rawQuery) return 0;

  const normalizedQuery = normalizeNotebookSearch(query, entryType);
  const rawValues = searchableEntryValues(entry).map((value) => value.toLowerCase());
  const normalizedValues = searchableEntryValues(entry).map((value) =>
    normalizeNotebookSearch(value, entryType)
  );

  if (rawValues.some((value) => value === rawQuery)) return 1;
  if (normalizedValues.some((value) => value === normalizedQuery)) return 2;
  if (normalizedValues.some((value) => value.startsWith(normalizedQuery))) return 3;
  if (normalizedValues.some((value) => value.includes(normalizedQuery))) return 4;
  if (entrySearchText(entry).includes(rawQuery)) return 5;

  return Number.POSITIVE_INFINITY;
}

function hasContext(props: TeacherNotebookPanelProps, draft?: EntryDraft) {
  return Boolean(
    props.teacherBookId ||
      props.bookId ||
      props.userBookId ||
      props.studentId ||
      props.lessonDate ||
      draft?.page.trim() ||
      draft?.percent.trim()
  );
}

export default function TeacherNotebookPanel({
  teacherBookId = null,
  bookId = null,
  userBookId = null,
  studentId = null,
  studentName = null,
  lessonDate = null,
  compact = false,
  enableWordCapture = false,
  mode = "prep",
  initialTab = null,
  initialSearch = null,
}: TeacherNotebookPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState("");
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [activeJournalGroup, setActiveJournalGroup] = useState<JournalGroup>("book_journal");
  const [activeTab, setActiveTab] = useState<NotebookTab>("book_character");

  const [wordList, setWordList] = useState<WordList | null>(null);
  const [wordInput, setWordInput] = useState("");
  const [wordDrafts, setWordDrafts] = useState<WordDraft[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [savingWord, setSavingWord] = useState(false);
  const [wordListOpen, setWordListOpen] = useState(false);

  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [entryDraft, setEntryDraft] = useState<EntryDraft>(() => blankEntryDraft());
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entrySearch, setEntrySearch] = useState("");
  const [entrySaving, setEntrySaving] = useState(false);
  const [locationEntryId, setLocationEntryId] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>({ page: "", percent: "" });
  const [locationSaving, setLocationSaving] = useState(false);

  const wordCaptureEnabled = enableWordCapture && Boolean(studentId && userBookId);
  const isLessonMode = mode === "lesson";
  const activeEntryType = activeTab;
  const activeEntryLabels = activeEntryType ? entryLabels[activeEntryType] : null;
  const visibleTabs =
    activeJournalGroup === "book_journal" ? bookJournalTabs : teachingNoteTabs;

  const selectedWords = useMemo(
    () => wordDrafts.filter((draft) => selectedWordIds.includes(draft.id)),
    [selectedWordIds, wordDrafts]
  );

  const filteredEntries = useMemo(() => {
    if (!activeEntryType) return [];
    const query = entrySearch.trim();
    return entries
      .filter((entry) => entry.entry_type === activeEntryType)
      .map((entry) => ({ entry, rank: entrySearchRank(entry, query, activeEntryType) }))
      .filter(({ rank }) => Number.isFinite(rank))
      .sort((a, b) => a.rank - b.rank)
      .map(({ entry }) => entry);
  }, [activeEntryType, entries, entrySearch]);

  function currentLessonContexts(entry: NotebookEntry) {
    if (!isLessonMode) return [];

    return (entry.teacher_notebook_entry_contexts ?? []).filter((context) => {
      if (studentId && context.student_id !== studentId) return false;
      if (userBookId && context.user_book_id !== userBookId) return false;
      if (bookId && context.book_id !== bookId) return false;
      if (teacherBookId && context.teacher_book_id !== teacherBookId) return false;
      return context.page_number != null || context.percent_location != null;
    });
  }

  useEffect(() => {
    void loadNotebook();
  }, [teacherBookId, bookId, userBookId, studentId, lessonDate, wordCaptureEnabled]);

  useEffect(() => {
    if (initialTab && tabs.some((tab) => tab.id === initialTab)) {
      setActiveJournalGroup(journalGroupForTab(initialTab));
      setActiveTab(initialTab);
    }

    const query = initialSearch?.trim() ?? "";
    if (query) {
      setEntrySearch(query);
      setEntryDraft((prev) => ({
        ...prev,
        title: initialTab === "note" ? query : prev.title,
        surfaceText: initialTab !== "note" ? query : prev.surfaceText,
      }));
    }
  }, [initialTab, initialSearch]);

  async function loadNotebook() {
    setLoading(true);
    setMessage("");
    setCanAccess(false);
    setTeacherId("");
    setWordList(null);
    setWordDrafts([]);
    setSelectedWordIds([]);
    setEntries([]);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

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

      setCanAccess(true);
      setTeacherId(user.id);

      const entryRows = await loadEntries(user.id);
      setEntries(entryRows);

      if (wordCaptureEnabled) {
        const list = await ensureWordList(user.id);
        setWordList(list);
        await loadWordDrafts(list.id);
      }
    } catch (error: any) {
      console.error("Error loading Teacher Notebook:", error);
      setMessage(error?.message ?? "Could not load Teacher Notebook.");
    } finally {
      setLoading(false);
    }
  }

  async function ensureWordList(nextTeacherId: string) {
    let query = supabase
      .from("teacher_notebook_word_lists")
      .select("id, teacher_id, status")
      .eq("teacher_id", nextTeacherId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);

    query = studentId ? query.eq("student_id", studentId) : query.is("student_id", null);
    query = userBookId ? query.eq("user_book_id", userBookId) : query.is("user_book_id", null);
    query = bookId ? query.eq("book_id", bookId) : query.is("book_id", null);
    query = teacherBookId
      ? query.eq("teacher_book_id", teacherBookId)
      : query.is("teacher_book_id", null);
    query = lessonDate ? query.eq("lesson_date", lessonDate) : query.is("lesson_date", null);

    const { data, error } = await query;
    if (error) throw error;

    const existing = data?.[0] as WordList | undefined;
    if (existing) return existing;

    const { data: inserted, error: insertError } = await supabase
      .from("teacher_notebook_word_lists")
      .insert({
        teacher_id: nextTeacherId,
        student_id: studentId || null,
        book_id: bookId || null,
        user_book_id: userBookId || null,
        teacher_book_id: teacherBookId || null,
        lesson_date: lessonDate || null,
      })
      .select("id, teacher_id, status")
      .single();

    if (insertError) throw insertError;
    return inserted as WordList;
  }

  async function loadWordDrafts(wordListId: string) {
    const { data, error } = await supabase
      .from("teacher_notebook_word_drafts")
      .select("id, word_list_id, surface, sort_order, processed_at, created_at")
      .eq("word_list_id", wordListId)
      .is("processed_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    const rows = (data ?? []) as WordDraft[];
    setWordDrafts(rows);
    setSelectedWordIds(rows.map((row) => row.id));
  }

  async function loadEntries(nextTeacherId: string) {
    const { data, error } = await supabase
      .from("teacher_notebook_entries")
      .select(
        `
        id,
        teacher_id,
        entry_type,
        title,
        surface_text,
        reading,
        meaning,
        body,
        journal_visibility,
        created_at,
        updated_at,
        teacher_notebook_entry_contexts (*)
      `
      )
      .eq("teacher_id", nextTeacherId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as NotebookEntry[];
  }

  async function refreshEntries() {
    if (!teacherId) return;
    setEntries(await loadEntries(teacherId));
  }

  async function addWordDraft(event?: FormEvent) {
    event?.preventDefault();
    if (!wordCaptureEnabled) return;
    const surface = wordInput.trim();
    if (!surface || !wordList || savingWord) return;

    setSavingWord(true);
    setMessage("");

    try {
      const nextSortOrder =
        Math.max(0, ...wordDrafts.map((draft) => Number(draft.sort_order) || 0)) + 1;
      const { data, error } = await supabase
        .from("teacher_notebook_word_drafts")
        .insert({
          word_list_id: wordList.id,
          surface,
          sort_order: nextSortOrder,
        })
        .select("id, word_list_id, surface, sort_order, processed_at, created_at")
        .single();

      if (error) throw error;

      const inserted = data as WordDraft;
      setWordDrafts((prev) => [...prev, inserted]);
      setSelectedWordIds((prev) => [...prev, inserted.id]);
      setWordInput("");
      window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    } catch (error: any) {
      console.error("Error saving notebook word draft:", error);
      setMessage(error?.message ?? "Could not save word draft.");
    } finally {
      setSavingWord(false);
    }
  }

  async function removeSelectedWordDrafts() {
    if (selectedWords.length === 0) {
      setMessage("Select at least one word to remove.");
      return;
    }

    const confirmed = window.confirm(
      `Remove ${selectedWords.length} selected draft word${
        selectedWords.length === 1 ? "" : "s"
      } from this Word List? This will not affect vocabulary already saved to the student's book.`
    );

    if (!confirmed) return;

    const idsToRemove = selectedWords.map((draft) => draft.id);
    const { error } = await supabase
      .from("teacher_notebook_word_drafts")
      .delete()
      .in("id", idsToRemove);

    if (error) {
      setMessage(error.message ?? "Could not remove selected words.");
      return;
    }

    setWordDrafts((prev) => prev.filter((draft) => !idsToRemove.includes(draft.id)));
    setSelectedWordIds((prev) => prev.filter((id) => !idsToRemove.includes(id)));
    setMessage(
      `Removed ${idsToRemove.length} draft word${idsToRemove.length === 1 ? "" : "s"}.`
    );
  }

  async function archiveWordList() {
    if (!wordList) return;
    if (!window.confirm("Archive this Word List draft? Draft words will stay saved but leave this active list.")) return;

    const { error } = await supabase
      .from("teacher_notebook_word_lists")
      .update({ status: "archived" })
      .eq("id", wordList.id);

    if (error) {
      setMessage(error.message ?? "Could not archive Word List.");
      return;
    }

    await loadNotebook();
    setMessage("Word List archived. A fresh active list is ready.");
  }

  function toggleSelectedWord(id: string) {
    setSelectedWordIds((prev) =>
      prev.includes(id) ? prev.filter((wordId) => wordId !== id) : [...prev, id]
    );
  }

  function selectAllWords() {
    setSelectedWordIds(wordDrafts.map((draft) => draft.id));
  }

  function clearSelection() {
    setSelectedWordIds([]);
  }

  function wordDraftsToClipboardText(words: WordDraft[]) {
    return words.map((draft) => draft.surface.trim()).filter(Boolean).join("\n");
  }

  async function copyWords(words: WordDraft[]) {
    const text = wordDraftsToClipboardText(words);
    if (!text) {
      setMessage("No words selected.");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setMessage(`Copied ${words.length} word${words.length === 1 ? "" : "s"}.`);
      return true;
    } catch {
      setMessage("Copy failed. Select and copy the words manually.");
      return false;
    }
  }

  async function copySelectedAndOpenBulkAdd() {
    if (!userBookId) {
      setMessage("No student book is attached to this Word List.");
      return;
    }

    const copied = await copyWords(selectedWords);
    if (!copied) return;

    const text = wordDraftsToClipboardText(selectedWords);
    sessionStorage.setItem(`teacherNotebookBulkWords:${userBookId}`, text);

    const params = new URLSearchParams({ userBookId });
    window.location.href = `/vocab/bulk?${params.toString()}`;
  }

  function startEditEntry(entry: NotebookEntry) {
    setEditingEntryId(entry.id);
    const context = entry.teacher_notebook_entry_contexts?.[0];
    const grammarBody = entry.entry_type === "grammar" ? parseGrammarBody(entry.body) : null;
    setEntryDraft({
      title: entry.title ?? "",
      surfaceText: entry.surface_text ?? "",
      reading: entry.reading ?? "",
      meaning: entry.meaning ?? "",
      partOfSpeech: grammarBody?.partOfSpeech ?? "",
      register: grammarBody?.register ?? "",
      body: grammarBody?.explanation ?? entry.body ?? "",
      page: context?.page_number == null ? "" : String(context.page_number),
      percent: context?.percent_location == null ? "" : String(context.percent_location),
    });
  }

  function resetEntryForm() {
    setEditingEntryId(null);
    setEntryDraft(blankEntryDraft());
  }

  async function saveEntry(event: FormEvent) {
    event.preventDefault();
    if (!activeEntryType || !teacherId || entrySaving) return;

    const mainText =
      activeEntryType === "note" || activeEntryType === "book_note"
        ? entryDraft.title.trim() || entryDraft.body.trim()
        : entryDraft.surfaceText.trim();

    if (!mainText) {
      setMessage(`Add ${activeEntryLabels?.input.toLowerCase() ?? "text"} first.`);
      return;
    }

    setEntrySaving(true);
    setMessage("");

    try {
      const payload = {
        teacher_id: teacherId,
        entry_type: activeEntryType,
        journal_visibility:
          journalGroupForTab(activeEntryType) === "book_journal"
            ? "book_shared"
            : "teaching_private",
        title: clean(entryDraft.title),
        surface_text:
          activeEntryType === "note" || activeEntryType === "book_note"
            ? clean(entryDraft.title)
            : clean(entryDraft.surfaceText),
        reading: clean(entryDraft.reading),
        meaning:
          activeEntryType === "translation" ? clean(entryDraft.meaning) : clean(entryDraft.meaning),
        body: activeEntryType === "grammar" ? clean(formatGrammarBody(entryDraft)) : clean(entryDraft.body),
      };

      let savedEntryId = editingEntryId;

      if (editingEntryId) {
        const { error } = await supabase
          .from("teacher_notebook_entries")
          .update(payload)
          .eq("id", editingEntryId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("teacher_notebook_entries")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        savedEntryId = (data as { id: string }).id;
      }

      if (savedEntryId && hasContext({ teacherBookId, bookId, userBookId, studentId, lessonDate }, entryDraft)) {
        await upsertContext(savedEntryId);
      }

      resetEntryForm();
      await refreshEntries();
      setMessage(`${activeEntryLabels?.singular ?? "Entry"} saved.`);
    } catch (error: any) {
      console.error("Error saving Teacher Notebook entry:", error);
      setMessage(error?.message ?? "Could not save notebook entry.");
    } finally {
      setEntrySaving(false);
    }
  }

  async function upsertContext(entryId: string) {
    const { pageNumber, percentLocation } = parseNotebookLocation(entryDraft.page, entryDraft.percent);

    const contextPayload = {
      entry_id: entryId,
      student_id: studentId || null,
      book_id: bookId || null,
      user_book_id: userBookId || null,
      teacher_book_id: teacherBookId || null,
      page_number: pageNumber == null ? null : Math.trunc(pageNumber),
      percent_location: percentLocation,
      lesson_date: lessonDate || null,
    };

    let existingQuery = supabase
      .from("teacher_notebook_entry_contexts")
      .select("id")
      .eq("entry_id", entryId)
      .limit(1);

    existingQuery = teacherBookId
      ? existingQuery.eq("teacher_book_id", teacherBookId)
      : existingQuery.is("teacher_book_id", null);

    const { data: existing } = await existingQuery;

    const existingId = existing?.[0]?.id;
    if (existingId) {
      const { error } = await supabase
        .from("teacher_notebook_entry_contexts")
        .update(contextPayload)
        .eq("id", existingId);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("teacher_notebook_entry_contexts")
      .insert(contextPayload);

    if (error) throw error;
  }

  async function saveLessonLocation(entry: NotebookEntry) {
    if (!teacherId || locationSaving) return;

    const { pageNumber, percentLocation } = parseNotebookLocation(locationDraft.page, locationDraft.percent);

    if (pageNumber == null && percentLocation == null) {
      setMessage("Add a page or percent location first.");
      return;
    }

    if (pageNumber != null && pageNumber < 0) {
      setMessage("Page must be 0 or higher.");
      return;
    }

    if (percentLocation != null && (percentLocation < 0 || percentLocation > 100)) {
      setMessage("Percent must be between 0 and 100.");
      return;
    }

    setLocationSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("teacher_notebook_entry_contexts")
        .insert({
          entry_id: entry.id,
          student_id: studentId || null,
          book_id: bookId || null,
          user_book_id: userBookId || null,
          teacher_book_id: teacherBookId || null,
          page_number: pageNumber == null ? null : Math.trunc(pageNumber),
          percent_location: percentLocation,
          lesson_date: lessonDate || null,
        })
        .select("*")
        .single();

      if (error) throw error;

      setEntries((previous) =>
        previous.map((candidate) =>
          candidate.id === entry.id
            ? {
                ...candidate,
                teacher_notebook_entry_contexts: [
                  ...((candidate.teacher_notebook_entry_contexts ?? []) as NotebookContext[]),
                  data as NotebookContext,
                ],
              }
            : candidate
        )
      );
      setLocationEntryId(null);
      setLocationDraft({ page: "", percent: "" });
      setMessage("Location saved.");
    } catch (error: any) {
      console.error("Error saving Teacher Notebook location:", error);
      setMessage(error?.message ?? "Could not save location.");
    } finally {
      setLocationSaving(false);
    }
  }

  async function deleteEntry(entryId: string) {
    if (!window.confirm("Delete this Teacher Notebook entry?")) return;

    const { error } = await supabase
      .from("teacher_notebook_entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      setMessage(error.message ?? "Could not delete notebook entry.");
      return;
    }

    if (editingEntryId === entryId) resetEntryForm();
    await refreshEntries();
    setMessage("Entry deleted.");
  }

  function handleWordInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void addWordDraft();
  }

  function renderWordListTools() {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAllWords}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-stone-700"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-stone-700"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyWords(selectedWords)}
              disabled={selectedWords.length === 0}
              className="rounded-full bg-stone-950 px-3 py-1.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy Selected
            </button>
            <button
              type="button"
              onClick={() => void copySelectedAndOpenBulkAdd()}
              disabled={selectedWords.length === 0 || !userBookId}
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy & Open Bulk Add
            </button>
            <button
              type="button"
              onClick={() => void removeSelectedWordDrafts()}
              disabled={selectedWords.length === 0}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove Selected
            </button>
          </div>
        </div>

        {wordDrafts.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold leading-6 text-stone-500">
            No draft words yet.
          </div>
        ) : (
          <div className="space-y-2">
            {wordDrafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedWordIds.includes(draft.id)}
                  onChange={() => toggleSelectedWord(draft.id)}
                  className="h-4 w-4"
                  aria-label={`Select ${draft.surface}`}
                />
                <p className="min-w-0 flex-1 break-words text-base font-black text-stone-950">
                  {draft.surface}
                </p>
              </div>
            ))}
          </div>
        )}

        {wordDrafts.length > 0 ? (
          <button
            type="button"
            onClick={() => void archiveWordList()}
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-black text-stone-600 hover:bg-stone-100"
          >
            Archive this Word List
          </button>
        ) : null}
      </div>
    );
  }

  const panelClasses = compact
    ? "rounded-2xl border border-stone-200 bg-white p-3 shadow-sm"
    : "rounded-3xl border border-stone-200 bg-white p-4 shadow-sm";

  if (loading) {
    return (
      <aside className={panelClasses}>
        <p className="text-sm font-semibold text-stone-500">Loading Teacher Notebook...</p>
      </aside>
    );
  }

  if (!canAccess) {
    return (
      <aside className={panelClasses}>
        <p className="text-sm font-semibold text-rose-700">
          {message || "Teacher access is required."}
        </p>
      </aside>
    );
  }

  const teacherPrepHref =
    isLessonMode && teacherBookId && activeEntryType
      ? `/teacher/library/${encodeURIComponent(teacherBookId)}?notebookTab=${encodeURIComponent(
          activeEntryType
        )}&notebookQuery=${encodeURIComponent(entrySearch.trim())}`
      : null;

  return (
    <aside
      className={
        isLessonMode
          ? `${panelClasses} space-y-4`
          : `${panelClasses} flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden`
      }
    >
      <div className="shrink-0">
        {wordCaptureEnabled ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="mb-3">
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Add Student Vocabulary
              </h2>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                Add the student&apos;s unknown vocabulary to their own vocabulary list.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <form onSubmit={addWordDraft} className="min-w-0">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-amber-900">
                    Quick Word{studentName ? ` for ${studentName}` : ""}
                  </span>
                  <input
                    ref={inputRef}
                    value={wordInput}
                    onChange={(event) => setWordInput(event.target.value)}
                    onKeyDown={handleWordInputKeyDown}
                    placeholder="Type a word..."
                    disabled={savingWord}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-stone-950 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                </label>
              </form>
              <button
                type="button"
                onClick={() => setWordListOpen((prev) => !prev)}
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-950 hover:bg-amber-100"
              >
                Word List · {wordDrafts.length}
              </button>
            </div>
            <p className="mt-1 text-[0.7rem] font-semibold leading-4 text-amber-900">
              Press Enter to save a draft word. It will not become student vocabulary here.
            </p>

            {wordListOpen ? (
              <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-amber-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-900">
                      Word List
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-amber-900">
                      Draft words are saved to {studentName || "this student"}&apos;s lesson list.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWordListOpen(false)}
                    className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-black text-stone-600"
                  >
                    Close
                  </button>
                </div>
                {renderWordListTools()}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={wordCaptureEnabled ? "mt-4" : ""}>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Teacher Journal
          </p>
          <h2 className="mt-1 text-2xl font-black text-stone-950">Book knowledge and teaching notes</h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Teacher-owned entries. Book Journal notes are shared book knowledge; Teaching Notes stay private to teaching.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-stone-200 bg-stone-50 p-1">
          {[
            { id: "book_journal" as const, label: "Book Journal" },
            { id: "teaching_notes" as const, label: "Teaching Notes" },
          ].map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                setActiveJournalGroup(group.id);
                setActiveTab(
                  group.id === "book_journal" ? bookJournalTabs[0].id : teachingNoteTabs[0].id
                );
                resetEntryForm();
                setEntrySearch("");
                setMessage("");
              }}
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                activeJournalGroup === group.id
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-stone-500 hover:bg-white hover:text-stone-900"
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto rounded-2xl border border-stone-200 bg-stone-50 p-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                resetEntryForm();
                setEntrySearch("");
                setMessage("");
              }}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black transition ${
                activeTab === tab.id
                  ? "bg-stone-950 text-white shadow-sm"
                  : "text-stone-500 hover:bg-white hover:text-stone-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
            {message}
          </div>
        ) : null}
      </div>

      <div className={isLessonMode ? "mt-4" : "mt-4 min-h-0 flex-1 overflow-y-auto pr-1"}>
        {activeEntryType && activeEntryLabels ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                Search {tabs.find((tab) => tab.id === activeTab)?.label}
              </span>
              <input
                value={entrySearch}
                onChange={(event) => setEntrySearch(event.target.value)}
                placeholder="Search your notebook"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
              />
            </label>

            {!isLessonMode ? (
              <p className="rounded-2xl bg-stone-50 px-3 py-2 text-xs font-semibold leading-5 text-stone-500">
                {teacherPrepTabHelperText[activeEntryType]}
              </p>
            ) : null}

            {!isLessonMode ? (
            <form onSubmit={saveEntry} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <div className="mb-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Add new
                </p>
                <p className="mt-1 text-sm font-semibold text-stone-600">
                  Create or edit Teacher Notebook entries here during prep.
                </p>
              </div>
              <div className="grid gap-3">
                {activeEntryType === "grammar" ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Grammar form
                        </span>
                        <input
                          value={entryDraft.surfaceText}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, surfaceText: event.target.value }))
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Reading (optional)
                        </span>
                        <input
                          value={entryDraft.title}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, title: event.target.value }))
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                        />
                      </label>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Meaning
                        </span>
                        <textarea
                          value={entryDraft.meaning}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, meaning: event.target.value }))
                          }
                          rows={3}
                          className="h-28 w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Structure
                        </span>
                        <textarea
                          value={entryDraft.reading}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, reading: event.target.value }))
                          }
                          rows={3}
                          className="h-28 w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                        />
                      </label>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Parts of speech
                        </span>
                        <input
                          value={entryDraft.partOfSpeech ?? ""}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, partOfSpeech: event.target.value }))
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                          placeholder="Optional"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Register
                        </span>
                        <input
                          value={entryDraft.register ?? ""}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, register: event.target.value }))
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                          placeholder="Optional"
                        />
                      </label>
                    </div>
                  </>
                ) : activeEntryType === "phrase" ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Phrase
                        </span>
                        <input
                          value={entryDraft.surfaceText}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, surfaceText: event.target.value }))
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Reading
                        </span>
                        <input
                          value={entryDraft.reading}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, reading: event.target.value }))
                          }
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                        />
                      </label>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Meaning
                        </span>
                        <textarea
                          value={entryDraft.meaning}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, meaning: event.target.value }))
                          }
                          rows={3}
                          className="h-28 w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                          Notes
                        </span>
                        <textarea
                          value={entryDraft.body}
                          onChange={(event) =>
                            setEntryDraft((prev) => ({ ...prev, body: event.target.value }))
                          }
                          rows={3}
                          className="h-28 w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                        />
                      </label>
                    </div>
                  </>
                ) : activeEntryType !== "translation" ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                      {activeEntryLabels.input}
                    </span>
                    <input
                      value={
                        activeEntryType === "note" || activeEntryType === "book_note"
                          ? entryDraft.title
                          : entryDraft.surfaceText
                      }
                      onChange={(event) =>
                        activeEntryType === "note" || activeEntryType === "book_note"
                          ? setEntryDraft((prev) => ({ ...prev, title: event.target.value }))
                          : setEntryDraft((prev) => ({ ...prev, surfaceText: event.target.value }))
                      }
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                    />
                  </label>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                        Source text
                      </span>
                      <textarea
                        value={entryDraft.surfaceText}
                        onChange={(event) =>
                          setEntryDraft((prev) => ({ ...prev, surfaceText: event.target.value }))
                        }
                        rows={3}
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                        Translation
                      </span>
                      <textarea
                        value={entryDraft.meaning}
                        onChange={(event) =>
                          setEntryDraft((prev) => ({ ...prev, meaning: event.target.value }))
                        }
                        rows={3}
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                  </>
                )}

                {activeEntryType !== "grammar" &&
                activeEntryType !== "phrase" &&
                activeEntryType !== "note" &&
                activeEntryType !== "translation" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                        Reading
                      </span>
                      <input
                        value={entryDraft.reading}
                        onChange={(event) =>
                          setEntryDraft((prev) => ({ ...prev, reading: event.target.value }))
                        }
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                        Meaning
                      </span>
                      <input
                        value={entryDraft.meaning}
                        onChange={(event) =>
                          setEntryDraft((prev) => ({ ...prev, meaning: event.target.value }))
                        }
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                  </div>
                ) : null}

                {activeEntryType !== "phrase" ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                    {activeEntryLabels.body}
                  </span>
                  <textarea
                    value={entryDraft.body}
                    onChange={(event) =>
                      setEntryDraft((prev) => ({ ...prev, body: event.target.value }))
                    }
                    rows={4}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                  />
                </label>
                ) : null}

                {activeEntryType !== "grammar" && activeEntryType !== "phrase" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                        Page or %
                      </span>
                      <input
                        value={entryDraft.page}
                        inputMode="decimal"
                        placeholder="p. 42 or 18%"
                        onChange={(event) =>
                          setEntryDraft((prev) => ({ ...prev, page: event.target.value }))
                        }
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                        Percent
                      </span>
                      <input
                        value={entryDraft.percent}
                        onChange={(event) =>
                          setEntryDraft((prev) => ({ ...prev, percent: event.target.value }))
                        }
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm focus:border-stone-400 focus:outline-none"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={entrySaving}
                  className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  {entrySaving ? "Saving..." : editingEntryId ? "Save Entry" : `Add ${activeEntryLabels.singular}`}
                </button>
                {editingEntryId ? (
                  <button
                    type="button"
                    onClick={resetEntryForm}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-600"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
            ) : null}

            {filteredEntries.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold leading-6 text-stone-500">
                {entrySearch.trim() ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                      Not in your Teacher Notebook
                    </p>
                    <p className="mt-2 break-words text-base font-black text-stone-950">
                      {entrySearch.trim()}
                    </p>
                    {teacherPrepHref ? (
                      <Link
                        href={teacherPrepHref}
                        className="mt-3 inline-flex rounded-full bg-stone-950 px-3 py-1.5 text-xs font-black text-white"
                      >
                        Add in Teacher Prep →
                      </Link>
                    ) : null}
                  </>
                ) : (
                  "No entries yet."
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry) => {
                  const context = entry.teacher_notebook_entry_contexts?.[0];
                  const lessonContexts = currentLessonContexts(entry);
                  const grammarBody =
                    entry.entry_type === "grammar" ? parseGrammarBody(entry.body) : null;
                  const canAddLessonLocation =
                    isLessonMode &&
                    (entry.entry_type === "grammar" || entry.entry_type === "phrase");
                  return (
                    <article
                      key={entry.id}
                      className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-base font-black text-stone-950">
                            {entryMainText(entry)}
                          </h3>
                          {entry.entry_type === "grammar" && entry.title ? (
                            <p className="mt-1 text-sm font-semibold leading-5 text-stone-500">
                              {entry.title}
                            </p>
                          ) : null}
                          {entry.entry_type === "grammar" && entry.meaning ? (
                            <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm leading-6 text-violet-950">
                              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-violet-700">
                                Meaning
                              </p>
                              <p className="mt-1 whitespace-pre-wrap break-words">
                                {entry.meaning}
                              </p>
                            </div>
                          ) : entry.reading || entry.meaning ? (
                            <p className="mt-1 text-sm font-semibold leading-5 text-stone-600">
                              {[entry.reading, entry.meaning].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                          {entry.entry_type === "grammar" && entry.reading ? (
                            <p className="mt-2 text-sm font-semibold leading-5 text-stone-600">
                              {entry.reading}
                            </p>
                          ) : null}
                          {grammarBody && (grammarBody.partOfSpeech || grammarBody.register) ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {grammarBody.partOfSpeech ? (
                                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-stone-600">
                                  {grammarBody.partOfSpeech}
                                </span>
                              ) : null}
                              {grammarBody.register ? (
                                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-stone-600">
                                  {grammarBody.register}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        {!isLessonMode ? (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => startEditEntry(entry)}
                            className="text-xs font-black text-stone-500 hover:text-stone-950"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteEntry(entry.id)}
                            className="text-xs font-black text-stone-400 hover:text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                        ) : null}
                      </div>

                      {(grammarBody?.explanation ?? entry.body) ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                          {grammarBody?.explanation ?? entry.body}
                        </p>
                      ) : null}

                      {canAddLessonLocation && lessonContexts.length > 0 ? (
                        <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2">
                          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-emerald-700">
                            Lesson locations
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {lessonContexts.map((lessonContext) => (
                              <span
                                key={lessonContext.id}
                                className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 shadow-sm"
                              >
                                {contextSummary(lessonContext)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : !canAddLessonLocation && contextSummary(context) ? (
                        <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                          {contextSummary(context)}
                        </p>
                      ) : null}

                      {canAddLessonLocation ? (
                        <div className="mt-3">
                          {locationEntryId === entry.id ? (
                            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                                Where did it appear?
                              </p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <label className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
                                  Page or %
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={locationDraft.page}
                                    placeholder="p. 42 or 18%"
                                    onChange={(event) =>
                                      setLocationDraft((previous) => ({
                                        ...previous,
                                        page: event.target.value,
                                      }))
                                    }
                                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-900"
                                  />
                                </label>
                                <label className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
                                  Percent
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={locationDraft.percent}
                                    onChange={(event) =>
                                      setLocationDraft((previous) => ({
                                        ...previous,
                                        percent: event.target.value,
                                      }))
                                    }
                                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-stone-900"
                                  />
                                </label>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveLessonLocation(entry)}
                                  disabled={locationSaving}
                                  className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                                >
                                  {locationSaving ? "Saving..." : "Save location"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLocationEntryId(null);
                                    setLocationDraft({ page: "", percent: "" });
                                  }}
                                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-stone-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setLocationEntryId(entry.id);
                                setLocationDraft({ page: "", percent: "" });
                                setMessage("");
                              }}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-100"
                            >
                              Add location
                            </button>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
