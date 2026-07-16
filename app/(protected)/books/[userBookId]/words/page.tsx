// Vocab List
//
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
  canUseFullAccessFeature,
  getFullAccessRequiredCopy,
} from "@/lib/access/requireFullAccess";
import { supabase } from "@/lib/supabaseClient";
import BookVocabIntroCopy from "./components/BookVocabIntroCopy";
import BookVocabReorderHint from "./components/BookVocabReorderHint";
import BookVocabEmptyRow from "./components/BookVocabEmptyRow";
import BookVocabContextCard from "./components/BookVocabContextCard";
import BookVocabFilterPanel from "./components/BookVocabFilterPanel";
import BookVocabCsvExportPanel from "./components/BookVocabCsvExportPanel";
import BookVocabTableShell from "./components/BookVocabTableShell";
import BookVocabEditModalShell from "./components/BookVocabEditModalShell";
import BookVocabLoadingState from "./components/BookVocabLoadingState";
import BookVocabSignInState from "./components/BookVocabSignInState";
import BookVocabEditFormBody from "./components/BookVocabEditFormBody";
import BookVocabRow from "./components/BookVocabRow";
import BookVocabMobileCard from "./components/BookVocabMobileCard";
import {
  fetchLibraryStudyColorInfoByWord,
  makeLibraryStudyColorKey,
  type LibraryStudyWordColorInfo,
} from "@/lib/libraryStudyColorLookup";
import {
  computeLibraryStudyColorStatus,
  type LibraryStudyColor,
  type LibraryStudyColorStatus,
  type LibraryStudyGateStatus,
} from "@/lib/libraryStudyColor";
import { BookVocabBackToTopButton } from "./components/BookVocabBackToTopButton";
import {
  resolveStudentWorkspaceBackContext,
  type StudentWorkspaceBackContext,
} from "@/lib/teacher/studentWorkspaceContext";

const DEFAULT_LEARNING_SETTINGS = {
  red_stages: 1,
  orange_stages: 1,
  yellow_stages: 1,
  show_badge_numbers: true,
};

const GLOBAL_ENCOUNTER_PAGE_SIZE = 1000;

type WordRow = {
  id: string;
  user_book_id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  other_definition: string | null;
  jlpt: string | null;
  is_common: boolean | null;
  page_number: number | null;
  page_order: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  seen_on: string | null;
  created_at: string;
  hidden: boolean | null;
  meaning_choices: any | null;
  meaning_choice_index: number | null;
  hide_kanji_in_reading_support?: boolean | null;
  vocabulary_cache_id?: number | null;
  cache_surface?: string | null;
  target_language_code?: string | null;
};

type ProfileRole = "teacher" | "student" | "super_teacher";

type LearningSettingsRow = {
  red_stages: number;
  orange_stages: number;
  yellow_stages: number;
  show_badge_numbers: boolean;
};

type GlobalEncounterRow = {
  surface: string | null;
  reading: string | null;
};

type LibraryWordSummaryRow = {
  study_identity_key: string;
  surface: string | null;
  reading: string | null;
  total_encounter_count: number | null;
};

type LibraryWordProgressRow = {
  study_identity_key: string;
  reading_gate_status: LibraryStudyGateStatus | null;
  meaning_gate_status: LibraryStudyGateStatus | null;
  held_before_reading_gate: boolean | null;
  held_before_meaning_gate: boolean | null;
  mastered: boolean | null;
};

async function loadAllGlobalEncounterRows(ownerUserId: string) {
  const allRows: GlobalEncounterRow[] = [];
  let from = 0;

  while (true) {
    const to = from + GLOBAL_ENCOUNTER_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("user_book_words")
      .select(
        `
          surface,
          reading,
          user_books!inner (
            user_id
          )
        `
      )
      .eq("user_books.user_id", ownerUserId)
      .or("target_language_code.is.null,target_language_code.eq.ja")
      .or("hidden.is.null,hidden.eq.false")
      .range(from, to);

    if (error) throw error;

    allRows.push(...((data ?? []) as GlobalEncounterRow[]));

    if (!data || data.length < GLOBAL_ENCOUNTER_PAGE_SIZE) {
      break;
    }

    from += GLOBAL_ENCOUNTER_PAGE_SIZE;
  }

  return allRows;
}

function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

function chapterDisplayParts(w: WordRow) {
  const num = w.chapter_number;
  const name = (w.chapter_name ?? "").trim();

  return {
    num: num != null ? `Chapter ${num}:` : "",
    name,
    fallback:
      num != null && name
        ? `Chapter ${num}: ${name}`
        : num != null
          ? `Chapter ${num}`
          : name
            ? name
            : "(none)",
  };
}

function chapterKey(w: WordRow) {
  const num = w.chapter_number != null ? String(w.chapter_number) : "";
  const name = (w.chapter_name ?? "").trim();
  return `${num}||${name}`;
}

function asStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => String(x)).filter(Boolean);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    } catch { }
  }
  return [];
}

function normalizeText(val: string | null | undefined) {
  return (val ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeKana(val: string | null | undefined) {
  return (val ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function repeatKey(w: WordRow) {
  const s = normalizeText(w.surface);
  if (!s) return "";

  const choices = asStringArray((w as any).meaning_choices);
  const idx = w.meaning_choice_index;

  if (choices.length > 0 && idx != null && Number.isFinite(idx)) {
    return `${s}||IDX:${idx}`;
  }

  const m = normalizeText(w.meaning);
  return `${s}||MEAN:${m}`;
}

function studyIdentityKey(surface: string | null | undefined, reading: string | null | undefined) {
  const normalizedSurface = normalizeText(surface);
  const normalizedReading = normalizeKana(reading);
  if (!normalizedSurface) return "";
  return `${normalizedSurface}||${normalizedReading}`;
}


function csvCell(value: unknown) {
  const text = value == null ? "" : String(value).replace(/\s*\r?\n\s*/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function commonCsvLabel(value: boolean | null | undefined) {
  if (value == null) return "";
  return value ? "yes" : "no";
}

function chapterCsvLabel(w: WordRow) {
  const num = w.chapter_number;
  const name = (w.chapter_name ?? "").trim();

  if (num != null && name) return `Chapter ${num}: ${name}`;
  if (num != null) return `Chapter ${num}`;
  return name;
}

function safeCsvFilenamePart(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "vocab-list"
  );
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csvBody = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\ufeff${csvBody}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function BookWordsPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fullAccessLocked, setFullAccessLocked] = useState(false);
  const [canUseVocabularyTools, setCanUseVocabularyTools] = useState(false);

  const [myRole, setMyRole] = useState<ProfileRole>("student");
  const isTeacher = myRole === "teacher";
  const [learningSettings, setLearningSettings] = useState<LearningSettingsRow>(
    DEFAULT_LEARNING_SETTINGS
  );
  const [globalEncounterCounts, setGlobalEncounterCounts] = useState<Record<string, number>>({});
  const [libraryColorByWordKey, setLibraryColorByWordKey] = useState<
    Record<string, LibraryStudyWordColorInfo>
  >({});
  const [libraryProgressByKey, setLibraryProgressByKey] = useState<
    Record<string, LibraryWordProgressRow>
  >({});

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");
  const [studentWorkspaceBackContext, setStudentWorkspaceBackContext] =
    useState<StudentWorkspaceBackContext | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [words, setWords] = useState<WordRow[]>([]);
  const [query, setQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [chapterOptions, setChapterOptions] = useState<{ value: string; label: string }[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  const [editing, setEditing] = useState<WordRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [editSurface, setEditSurface] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const [editOtherDefinition, setEditOtherDefinition] = useState("");
  const [editJlpt, setEditJlpt] = useState("");
  const [editPage, setEditPage] = useState<string>("");
  const [editChapterNum, setEditChapterNum] = useState<string>("");
  const [editChapterName, setEditChapterName] = useState("");
  const [editMeaningChoices, setEditMeaningChoices] = useState<string[]>([]);
  const [editMeaningChoiceIndex, setEditMeaningChoiceIndex] = useState<number | null>(0);
  const [editHideKanjiInReadingSupport, setEditHideKanjiInReadingSupport] = useState(false);
  const [reordering, setReordering] = useState(false);

  function sameOrderGroup(a: WordRow, b: WordRow) {
    return (
      (a.chapter_number ?? null) === (b.chapter_number ?? null) &&
      (a.chapter_name ?? "").trim() === (b.chapter_name ?? "").trim() &&
      (a.page_number ?? null) === (b.page_number ?? null)
    );
  }

  function sortWithinGroup(list: WordRow[]) {
    return [...list].sort((a, b) => {
      const aOrder = a.page_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.page_order ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.created_at.localeCompare(b.created_at);
    });
  }

  function wordOrderPosition(word: WordRow) {
    const group = sortWithinGroup(words.filter((w) => sameOrderGroup(w, word)));
    const index = group.findIndex((w) => w.id === word.id);

    return {
      index,
      canMoveUp: index > 0,
      canMoveDown: index >= 0 && index < group.length - 1,
    };
  }

  async function moveWordInGroup(wordId: string, direction: "up" | "down") {
    if (!canUseVocabularyTools) return;

    const word = words.find((w) => w.id === wordId);
    if (!word) return;

    const group = sortWithinGroup(words.filter((w) => sameOrderGroup(w, word)));
    const fromIndex = group.findIndex((w) => w.id === wordId);
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

    if (fromIndex === -1 || toIndex < 0 || toIndex >= group.length) return;

    const reordered = [...group];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updatedGroup = reordered.map((w, index) => ({
      ...w,
      page_order: index + 1,
    }));

    setWords((prev) =>
      prev.map((word) => {
        const updated = updatedGroup.find((w) => w.id === word.id);
        return updated ?? word;
      })
    );

    setReordering(true);

    try {
      for (const w of updatedGroup) {
        const { error } = await supabase
          .from("user_book_words")
          .update({ page_order: w.page_order })
          .eq("id", w.id)
          .eq("user_book_id", userBookId);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Failed to save reorder:", error);
      alert(error?.message || "Failed to save new order.");
    } finally {
      setReordering(false);
    }
  }

  function openEdit(w: WordRow) {
    if (!canUseVocabularyTools) return;

    setEditErr(null);
    setEditing(w);

    setEditSurface(w.surface ?? "");
    setEditReading(w.reading ?? "");
    setEditMeaning(w.meaning ?? "");
    setEditOtherDefinition(w.other_definition ?? "");
    setEditJlpt(w.jlpt ?? "");

    setEditPage(w.page_number != null ? String(w.page_number) : "");
    setEditChapterNum(w.chapter_number != null ? String(w.chapter_number) : "");
    setEditChapterName(w.chapter_name ?? "");
    setEditHideKanjiInReadingSupport(!!w.hide_kanji_in_reading_support);

    const choices = asStringArray(w.meaning_choices);
    const rawIdx =
      w.meaning_choice_index == null
        ? null
        : Number.isFinite(w.meaning_choice_index as any)
          ? (w.meaning_choice_index as number)
          : 0;

    const idx =
      rawIdx == null
        ? null
        : Math.max(0, choices.length ? Math.min(rawIdx, choices.length - 1) : rawIdx);

    setEditMeaningChoices(choices);
    setEditMeaningChoiceIndex(idx);

    if (idx != null && choices.length && choices[idx]) {
      setEditMeaning(choices[idx]);
    } else {
      setEditMeaning(w.meaning ?? "");
    }
  }

  function closeEdit() {
    setEditing(null);
    setEditErr(null);
    setEditSaving(false);
  }

  function parseNullableInt(s: string): number | null {
    const t = (s ?? "").trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }

  function changeDefinition(newValue: string) {
    const choices = editMeaningChoices ?? [];

    if (newValue === "other") {
      setEditMeaningChoiceIndex(null);
      setEditMeaning("");
      return;
    }

    const newIndex = Number(newValue);
    const safe = Math.max(0, newIndex);

    setEditMeaningChoiceIndex(safe);

    if (choices.length) {
      const clamped = Math.min(safe, choices.length - 1);
      const chosen = choices[clamped] ?? "";
      setEditMeaning(chosen);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    if (!canUseVocabularyTools) {
      setEditErr("Full access is needed to edit vocabulary.");
      return;
    }

    setEditSaving(true);
    setEditErr(null);

    const hasChoices = (editMeaningChoices?.length ?? 0) > 0;

    const patch: any = {
      surface: editSurface.trim(),
      reading: editReading.trim() ? editReading.trim() : null,
      meaning: editMeaning.trim() ? editMeaning.trim() : null,
      other_definition: null,
      jlpt: editJlpt.trim() ? editJlpt.trim().toUpperCase() : null,
      page_number: parseNullableInt(editPage),
      chapter_number: parseNullableInt(editChapterNum),
      chapter_name: editChapterName.trim() ? editChapterName.trim() : null,
      hide_kanji_in_reading_support: editHideKanjiInReadingSupport,
    };

    if (editMeaningChoiceIndex == null) {
      patch.meaning_choices = null;
      patch.meaning_choice_index = null;
    } else {
      patch.meaning_choice_index = editMeaningChoiceIndex;
    }

    if (hasChoices && editMeaningChoiceIndex != null) {
      const chosen = editMeaningChoices[editMeaningChoiceIndex] ?? "";
      if (chosen) patch.meaning = chosen;
    }

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update(patch)
        .eq("id", editing.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      setWords((prev) =>
        prev.map((w) =>
          w.id === editing.id
            ? ({
              ...w,
              ...patch,
            } as WordRow)
            : w
        )
      );

      closeEdit();
    } catch (e: any) {
      setEditErr(e?.message ?? "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteWord(w: WordRow) {
    if (!canUseVocabularyTools) return;

    const ok = window.confirm(`Delete "${w.surface}"? This cannot be undone.`);
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("user_book_words")
        .delete()
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;
      setWords((prev) => prev.filter((x) => x.id !== w.id));
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete word");
    }
  }

  async function updateWordPage(w: WordRow, value: string) {
    if (!canUseVocabularyTools) return;

    const nextPage = parseNullableInt(value);
    if ((w.page_number ?? null) === nextPage) return;

    const previousPage = w.page_number ?? null;
    setWords((prev) =>
      prev.map((word) => (word.id === w.id ? { ...word, page_number: nextPage } : word))
    );

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({ page_number: nextPage })
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;
    } catch (e: any) {
      setWords((prev) =>
        prev.map((word) => (word.id === w.id ? { ...word, page_number: previousPage } : word))
      );
      alert(e?.message ?? "Failed to update page number.");
    }
  }

  async function hideWord(w: WordRow) {
    if (!canUseVocabularyTools) return;

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({ hidden: true })
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      if (showHidden) {
        setWords((prev) => prev.map((x) => (x.id === w.id ? { ...x, hidden: true } : x)));
      } else {
        setWords((prev) => prev.filter((x) => x.id !== w.id));
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to hide word");
    }
  }

  async function unhideWord(w: WordRow) {
    if (!canUseVocabularyTools) return;

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({ hidden: false })
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      setWords((prev) => prev.map((x) => (x.id === w.id ? { ...x, hidden: false } : x)));
    } catch (e: any) {
      alert(e?.message ?? "Failed to unhide word");
    }
  }

  useEffect(() => {
    if (!userBookId) return;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      setNeedsSignIn(false);
      setFullAccessLocked(false);
      setCanUseVocabularyTools(false);
      setStudentWorkspaceBackContext(null);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          setNeedsSignIn(true);
          setLoading(false);
          return;
        }

        const authedUser = user;
        setUserId(authedUser.id);

        const { data: meProfile, error: meProfileErr } = await supabase
          .from("profiles")
          .select("role, is_super_teacher, app_access_type, app_access_expires_at")
          .eq("id", authedUser.id)
          .single();

        if (meProfileErr) {
          console.error("Error loading profile role:", meProfileErr);
        }

        setMyRole((meProfile?.role as ProfileRole | null) ?? "student");

        const appAccessStatus = meProfile
          ? getAppAccessStatus(meProfile)
          : { hasAccess: false, hasFullAccess: false, reason: "missing_profile" };

        const featureAccess = getFeatureAccess({
          role: meProfile?.is_super_teacher ? "super_teacher" : meProfile?.role ?? null,

          // For this first pass, anyone who currently has app access keeps
          // full learning access. Later, when expired trials become free users,
          // we can separate "can enter app" from "has full learning access."
          hasFullAccess: appAccessStatus.hasFullAccess,
        });

        const canUseVocabularyList = canUseFullAccessFeature(
          featureAccess,
          "vocabulary_list"
        );
        setCanUseVocabularyTools(canUseVocabularyList);

        const { data: ub, error: ubErr } = await supabase
          .from("user_books")
          .select(
            `
              id,
              user_id,
              books:book_id (
                title,
                cover_url
              )
            `
          )
          .eq("id", userBookId)
          .maybeSingle();

        if (ubErr) throw ubErr;

        if (!ub) {
          setErrorMsg("You do not have access to this vocabulary list.");
          setLoading(false);
          return;
        }

        setBookTitle((ub as any)?.books?.title ?? "");
        setBookCover((ub as any)?.books?.cover_url ?? "");
        const ownerUserId = (ub as any)?.user_id ?? authedUser.id;

        const isOwner = ownerUserId === authedUser.id;
        const isSuperTeacher =
          meProfile?.role === "super_teacher" || Boolean((meProfile as any)?.is_super_teacher);
        let isLinkedTeacher = false;

        if (!isOwner && !isSuperTeacher && meProfile?.role === "teacher") {
          const { data: teacherStudentRow, error: teacherStudentErr } = await supabase
            .from("teacher_students")
            .select("teacher_id")
            .eq("teacher_id", authedUser.id)
            .eq("student_id", ownerUserId)
            .maybeSingle();

          if (teacherStudentErr) {
            console.error("Error checking teacher/student access:", teacherStudentErr);
          }

          isLinkedTeacher = Boolean(teacherStudentRow);
        }

        if (!isOwner && !isSuperTeacher && !isLinkedTeacher) {
          setErrorMsg("You do not have access to this vocabulary list.");
          setLoading(false);
          return;
        }

        const workspaceBackContext = await resolveStudentWorkspaceBackContext({
          supabase,
          from: searchParams.get("from"),
          requestedStudentId: searchParams.get("studentId"),
          currentUserId: authedUser.id,
          profile: meProfile,
          ownerUserId,
        });
        setStudentWorkspaceBackContext(workspaceBackContext);

        if (canUseVocabularyList) {
          const { data: learningSettingsRow, error: learningSettingsErr } = await supabase
            .from("user_learning_settings")
            .select("red_stages, orange_stages, yellow_stages, show_badge_numbers")
            .eq("user_id", ownerUserId)
            .maybeSingle();

          if (learningSettingsErr) {
            console.error("Error loading learning settings:", learningSettingsErr);
            setLearningSettings(DEFAULT_LEARNING_SETTINGS);
          } else {
            setLearningSettings({
              ...DEFAULT_LEARNING_SETTINGS,
              ...((learningSettingsRow as Partial<LearningSettingsRow> | null) ?? {}),
            });
          }

          try {
            const counts: Record<string, number> = {};
            const normalizedKeyByStudyIdentityKey: Record<string, string> = {};

            const { data: summaryRows, error: summaryErr } = await supabase
              .from("user_library_word_summaries")
              .select("study_identity_key, surface, reading, total_encounter_count")
              .eq("user_id", ownerUserId)
              .returns<LibraryWordSummaryRow[]>();

            if (!summaryErr && summaryRows && summaryRows.length > 0) {
              for (const row of summaryRows) {
                const key = row.study_identity_key;
                if (!key) continue;

                const encounterCount = row.total_encounter_count ?? 0;
                counts[key] = encounterCount;

                const normalizedKey = studyIdentityKey(row.surface, row.reading);
                if (normalizedKey) {
                  counts[normalizedKey] = encounterCount;
                  normalizedKeyByStudyIdentityKey[key] = normalizedKey;
                }
              }
            } else {
              if (summaryErr) {
                console.warn("Library word summaries are not available yet:", summaryErr);
              }

              const globalWords = await loadAllGlobalEncounterRows(ownerUserId);
              for (const row of globalWords) {
                const key = studyIdentityKey(row.surface, row.reading);
                if (!key) continue;
                counts[key] = (counts[key] ?? 0) + 1;
              }
            }

            setGlobalEncounterCounts(counts);

            const { data: progressRows, error: progressErr } = await supabase
              .from("user_library_word_progress")
              .select(
                `
          study_identity_key,
          reading_gate_status,
          meaning_gate_status,
          held_before_reading_gate,
          held_before_meaning_gate,
          mastered
        `
              )
              .eq("user_id", ownerUserId)
              .returns<LibraryWordProgressRow[]>();

            if (progressErr) {
              console.warn("Library word progress is not available yet:", progressErr);
              setLibraryProgressByKey({});
            } else {
              const progressMap: Record<string, LibraryWordProgressRow> = {};

              for (const row of progressRows ?? []) {
                if (!row.study_identity_key) continue;

                progressMap[row.study_identity_key] = row;

                const normalizedKey = normalizedKeyByStudyIdentityKey[row.study_identity_key];
                if (normalizedKey) {
                  progressMap[normalizedKey] = row;
                }
              }

              setLibraryProgressByKey(progressMap);
            }
          } catch (globalWordsErr) {
            console.error("Error loading global word encounters/progress:", globalWordsErr);
            setGlobalEncounterCounts({});
            setLibraryProgressByKey({});
          }
        } else {
          setGlobalEncounterCounts({});
          setLibraryProgressByKey({});
        }

        let wordsQuery = supabase
          .from("user_book_words")
          .select(
            `
              id,
              user_book_id,
              surface,
              reading,
              meaning,
              other_definition,
              jlpt,
              is_common,
              page_number,
              page_order,
              chapter_number,
              chapter_name,
              seen_on,
              created_at,
              hidden,
              meaning_choices,
              meaning_choice_index,
              hide_kanji_in_reading_support,
              target_language_code,
              vocabulary_cache_id,
              vocabulary_cache: vocabulary_cache_id (
                surface
              )
            `
          )
          .eq("user_book_id", userBookId)
          .order("chapter_number", { ascending: true, nullsFirst: false })
          .order("page_number", { ascending: true, nullsFirst: false })
          .order("page_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true });

        if (showHidden) {
          wordsQuery = wordsQuery.eq("hidden", true);
        } else {
          wordsQuery = wordsQuery.eq("hidden", false);
        }

        const { data: rows, error: wErr } = await wordsQuery.returns<WordRow[]>();

        if (wErr) throw wErr;

        const list = (rows ?? []).map((w: any) => ({
          ...w,
          cache_surface: w.vocabulary_cache?.surface ?? null,
        }));
        setWords(list);

        const optMap = new Map<string, string>();
        for (const w of list) {
          optMap.set(chapterKey(w), chapterDisplayParts(w).fallback);
        }

        const opts = Array.from(optMap.entries()).map(([value, label]) => ({ value, label }));

        opts.sort((a, b) => {
          const anum = a.label.match(/Chapter\s+(\d+)/i)?.[1];
          const bnum = b.label.match(/Chapter\s+(\d+)/i)?.[1];
          if (anum && bnum) return Number(anum) - Number(bnum);
          return a.label.localeCompare(b.label);
        });

        setChapterOptions(opts);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load words");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userBookId, showHidden, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadLibraryColorsForVocabList() {
      const wordsToCheck = words
        .filter((word) => word.target_language_code == null || word.target_language_code === "ja")
        .map((word) => ({
          surface: word.surface,
          reading: word.reading,
        }));

      const hasAnyLookupWord = wordsToCheck.some(
        (word) => word.surface?.trim() && word.reading?.trim()
      );

      if (!canUseVocabularyTools || !hasAnyLookupWord) {
        setLibraryColorByWordKey({});
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      const next = await fetchLibraryStudyColorInfoByWord(
        supabase,
        user.id,
        wordsToCheck
      );

      if (!cancelled) {
        setLibraryColorByWordKey(next);
      }
    }

    void loadLibraryColorsForVocabList();

    return () => {
      cancelled = true;
    };
  }, [words, canUseVocabularyTools]);

  const repeatCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of words) {
      const key = repeatKey(w);
      if (!key) continue;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [words]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return words.filter((w) => {
      const chValue = chapterKey(w);
      const chLabel = chapterDisplayParts(w).fallback;

      if (chapterFilter !== "all" && chValue !== chapterFilter) return false;
      if (!q) return true;

      const hay = [
        w.surface,
        w.reading ?? "",
        w.meaning ?? "",
        normalizeJlpt(w.jlpt),
        chLabel,
        w.page_number?.toString() ?? "",
        w.meaning_choice_index != null ? String(w.meaning_choice_index + 1) : "o",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [words, query, chapterFilter]);

  const filteredSorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aChapter = a.chapter_number ?? Number.MAX_SAFE_INTEGER;
      const bChapter = b.chapter_number ?? Number.MAX_SAFE_INTEGER;
      if (aChapter !== bChapter) return aChapter - bChapter;

      const aPage = a.page_number ?? Number.MAX_SAFE_INTEGER;
      const bPage = b.page_number ?? Number.MAX_SAFE_INTEGER;
      if (aPage !== bPage) return aPage - bPage;

      const aOrder = a.page_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.page_order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const created = a.created_at.localeCompare(b.created_at);
      if (created !== 0) return created;

      return a.id.localeCompare(b.id);
    });
  }, [filtered]);

  function handleExportVocabCsv(exportChapter: string, exportJlpt: string) {
    const exportWords = words.filter((word) => {
      const chapterMatches = exportChapter === "all" || chapterKey(word) === exportChapter;
      const jlptMatches = exportJlpt === "all" || normalizeJlpt(word.jlpt) === exportJlpt;

      return chapterMatches && jlptMatches;
    });

    if (exportWords.length === 0) {
      window.alert("There are no words to export for those filters yet.");
      return;
    }

    const selectedChapterLabel =
      exportChapter === "all"
        ? "all-chapters"
        : chapterOptions.find((option) => option.value === exportChapter)?.label ?? "chapter";

    const rows = [
      ["Surface", "Reading", "Meaning", "Def #", "Chapter", "Page", "JLPT", "Common"],
      ...exportWords.map((word) => [
        word.surface,
        word.reading ?? "",
        word.meaning ?? "",
        word.meaning_choice_index == null ? "" : word.meaning_choice_index + 1,
        chapterCsvLabel(word),
        word.page_number == null ? "" : word.page_number,
        word.jlpt ?? "",
        commonCsvLabel(word.is_common),
      ]),
    ];

    const filename = `${safeCsvFilenamePart(bookTitle)}-${safeCsvFilenamePart(
      selectedChapterLabel
    )}-${safeCsvFilenamePart(
      exportJlpt === "all" ? "all-jlpt" : exportJlpt
    )}-vocab.csv`;

    downloadCsv(filename, rows);
  }

  const headerStickyStyle = { top: "0px" };

  if (loading) {
    return <BookVocabLoadingState />;
  }

  if (needsSignIn) {
    return <BookVocabSignInState onGoToLogin={() => router.push("/login")} />;
  }

  if (errorMsg) {
    if (errorMsg === "You do not have access to this vocabulary list.") {
      return <AccessDeniedMessage message={errorMsg} />;
    }

    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-700">{errorMsg}</p>
        <button
          type="button"
          onClick={() => router.push("/books")}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Back to Books
        </button>
      </main>
    );
  }

  if (fullAccessLocked) {
    const copy = getFullAccessRequiredCopy("vocabulary_list");

    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              Full access feature
            </p>

            <h1 className="mt-2 text-2xl font-black text-stone-950">
              {copy.title}
            </h1>

            <p className="mt-3 text-sm leading-6 text-stone-600">
              {copy.message}
            </p>

            <p className="mt-3 text-sm leading-6 text-stone-600">
              Your vocabulary progress is saved. Full vocabulary study is available with full Mekuru access.
            </p>

            {bookTitle ? (
              <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">
                  Current book
                </p>
                <p className="mt-1 font-semibold text-stone-900">{bookTitle}</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                Back to Book Hub
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(`/books/${encodeURIComponent(userBookId)}/just-reading`)
                }
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                Use Just Reading Timer
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  function openBookHub() {
    const contextSuffix = studentWorkspaceBackContext
      ? `?from=student-workspace&studentId=${encodeURIComponent(studentWorkspaceBackContext.studentId)}`
      : "";
    router.push(`/books/${encodeURIComponent(userBookId)}${contextSuffix}`);
  }

  return (
    <main className="max-w-6xl mx-auto p-6 pb-24">
      {studentWorkspaceBackContext ? (
        <button
          type="button"
          onClick={() => router.push(studentWorkspaceBackContext.href)}
          className="mb-3 text-sm font-semibold text-stone-500 hover:text-stone-900"
        >
          {studentWorkspaceBackContext.label}
        </button>
      ) : null}

      {editing && isTeacher ? (
        <BookVocabEditModalShell
          surface={editing.surface}
          wordId={editing.id}
          editErr={editErr}
          editSaving={editSaving}
          saveDisabled={editSaving || !editSurface.trim()}
          onClose={closeEdit}
          onSave={saveEdit}
        >
          <BookVocabEditFormBody
            cacheSurface={editing.cache_surface}
            editSurface={editSurface}
            editReading={editReading}
            editJlpt={editJlpt}
            editMeaning={editMeaning}
            editChapterNum={editChapterNum}
            editChapterName={editChapterName}
            editPage={editPage}
            editMeaningChoices={editMeaningChoices}
            editMeaningChoiceIndex={editMeaningChoiceIndex}
            editHideKanjiInReadingSupport={editHideKanjiInReadingSupport}
            onEditSurfaceChange={setEditSurface}
            onEditReadingChange={setEditReading}
            onEditJlptChange={setEditJlpt}
            onDefinitionChange={changeDefinition}
            onEditMeaningChange={setEditMeaning}
            onEditChapterNumChange={setEditChapterNum}
            onEditChapterNameChange={setEditChapterName}
            onEditPageChange={setEditPage}
            onEditHideKanjiInReadingSupportChange={
              setEditHideKanjiInReadingSupport
            }
          />

        </BookVocabEditModalShell>
      ) : null}

      <BookVocabIntroCopy />

      {!canUseVocabularyTools ? (
        <section className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
          This is a read-only vocabulary archive. You can view saved words, open word details, and export CSV.
          Adding, editing, deleting, reordering, study, and progress colors are available with full Mekuru access.
        </section>
      ) : null}

      <div className="border-b border-stone-200">
        <div className="space-y-3 py-4">
          <BookVocabContextCard
            bookTitle={bookTitle}
            bookCover={bookCover}
            totalCount={words.length}
            visibleCount={filteredSorted.length}
            onOpenBookHub={openBookHub}
          />

          <BookVocabFilterPanel
            query={query}
            showHidden={showHidden}
            chapterFilter={chapterFilter}
            chapterOptions={chapterOptions}
            onQueryChange={setQuery}
            onShowHiddenChange={setShowHidden}
            onChapterFilterChange={setChapterFilter}
          />

          <BookVocabCsvExportPanel
            chapterOptions={chapterOptions}
            wordCount={words.length}
            onExportCsv={handleExportVocabCsv}
          />
        </div>
      </div>

      <BookVocabReorderHint reordering={reordering} readOnly={!canUseVocabularyTools} />

      <div className="space-y-3 md:hidden">
        {filteredSorted.map((w) => {
          const orderPosition = wordOrderPosition(w);

          return (
            <BookVocabMobileCard
              key={w.id}
              hidden={w.hidden}
              surface={w.surface}
              reading={w.reading}
              meaning={w.meaning}
              pageNumber={w.page_number}
              readOnly={!canUseVocabularyTools}
              onPageChange={(value) => updateWordPage(w, value)}
              canMoveUp={orderPosition.canMoveUp}
              canMoveDown={orderPosition.canMoveDown}
              onMoveUp={async () => {
                const scrollY = window.scrollY;
                await moveWordInGroup(w.id, "up");
                requestAnimationFrame(() => {
                  window.scrollTo({ top: scrollY });
                });
              }}
              onMoveDown={async () => {
                const scrollY = window.scrollY;
                await moveWordInGroup(w.id, "down");
                requestAnimationFrame(() => {
                  window.scrollTo({ top: scrollY });
                });
              }}
              onOpen={() =>
                router.push(`/books/${encodeURIComponent(userBookId)}/words/${w.id}`)
              }
              onDelete={() => void deleteWord(w)}
            />
          );
        })}

        {filteredSorted.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500">
            No words match your filters.
          </div>
        ) : null}
      </div>

      <div className="hidden md:block">
        <BookVocabTableShell headerStickyStyle={headerStickyStyle} readOnly={!canUseVocabularyTools}>
          {filteredSorted.map((w) => {
            const orderPosition = wordOrderPosition(w);

            return (
              <BookVocabRow
                key={w.id}
                hidden={w.hidden}
                surface={w.surface}
                reading={w.reading}
                meaning={w.meaning}
                pageNumber={w.page_number}
                readOnly={!canUseVocabularyTools}
                onPageChange={(value) => updateWordPage(w, value)}
                canMoveUp={orderPosition.canMoveUp}
                canMoveDown={orderPosition.canMoveDown}
                onMoveUp={async () => {
                  const scrollY = window.scrollY;
                  await moveWordInGroup(w.id, "up");
                  requestAnimationFrame(() => {
                    window.scrollTo({ top: scrollY });
                  });
                }}
                onMoveDown={async () => {
                  const scrollY = window.scrollY;
                  await moveWordInGroup(w.id, "down");
                  requestAnimationFrame(() => {
                    window.scrollTo({ top: scrollY });
                  });
                }}
                onOpen={() =>
                  router.push(`/books/${encodeURIComponent(userBookId)}/words/${w.id}`)
                }
                onDelete={() => void deleteWord(w)}
              />
            );
          })}

          {filteredSorted.length === 0 ? <BookVocabEmptyRow /> : null}
        </BookVocabTableShell>
      </div>
      <BookVocabBackToTopButton />
    </main >
  );
}
