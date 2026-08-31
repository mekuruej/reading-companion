// Word Card
// 

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { canUseFullAccessFeature } from "@/lib/access/requireFullAccess";
import { supabase } from "@/lib/supabaseClient";
import WordDetailErrorState from "./components/WordDetailErrorState";
import WordDetailLoadingState from "./components/WordDetailLoadingState";
import WordDetailNeedsSignInState from "./components/WordDetailNeedsSignInState";
import WordDetailHeader from "./components/WordDetailHeader";
import WordDetailFooterActions from "./components/WordDetailFooterActions";
import WordDetailReportIssueLink from "./components/WordDetailReportIssueLink";
import WordSeenInSection from "./components/WordSeenInSection";
import WordDictionaryInfoSection from "./components/WordDictionaryInfoSection";
import BookVocabEditModalShell from "../components/BookVocabEditModalShell";
import BookVocabEditFormBody from "../components/BookVocabEditFormBody";
import {
  makeLibraryStudyColorKey,
  type LibraryStudyWordColorInfo,
} from "@/lib/libraryStudyColorLookup";
import { parseOptionalPageLocationInput } from "@/lib/pageLocation";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
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
  chapter_number: number | null;
  chapter_name: string | null;
  created_at: string;
  meaning_choices: any | null;
  meaning_choice_index: number | null;
  hidden: boolean | null;
  hide_kanji_in_reading_support?: boolean | null;
  target_language_code?: string | null;
};

type SeenInstance = {
  id: string;
  user_book_id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  meaning_choice_index: number | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  created_at: string;
  books_title: string;
  books_cover_url: string | null;
};

type WordNeighbor = {
  id: string;
  surface: string;
  reading: string | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  page_order: number | null;
  created_at: string;
  hidden: boolean | null;
};

type JishoCandidate = {
  id: string;
  surface: string;
  reading: string;
  jlpt: string;
  isCommon: boolean;
  meaningChoices: string[];
};


// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
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

function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
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
    (form: any) => (form?.word ?? "") === cleanQuery || (form?.reading ?? "") === cleanQuery
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
      japaneseForms.find((form: any) => form?.word || form?.reading) ?? japaneseForms[0] ?? {};

    const surface = primaryForm?.word || entry?.slug || fallbackWord;
    const reading = primaryForm?.reading || "";
    const meaningChoices = extractMeaningChoices(entry);

    if (meaningChoices.length === 0) continue;

    const candidate: JishoCandidate = {
      id: `${surface}__${reading || "no-reading"}__${index}`,
      surface,
      reading,
      jlpt: normalizeJlpt(entry?.jlpt?.[0] || ""),
      isCommon: !!entry?.is_common,
      meaningChoices,
    };

    const dedupeKey = [
      candidate.surface,
      candidate.reading,
      candidate.meaningChoices.join("||"),
    ].join("___");

    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    candidates.push(candidate);
  }

  return candidates;
}

function isReadyForFlashcards(word: {
  surface?: string | null;
  reading?: string | null;
  meaning?: string | null;
  target_language_code?: string | null;
}) {
  const surface = (word.surface ?? "").trim();
  const reading = (word.reading ?? "").trim();
  const meaning = (word.meaning ?? "").trim();
  const targetLanguageCode = (word.target_language_code ?? "").trim();

  if (!surface || !meaning) return false;
  if (targetLanguageCode === "en") return true;
  return Boolean(reading);
}

function chapterDisplay(chNum: number | null, chName: string | null) {
  const name = (chName ?? "").trim();
  const num = chNum;

  if (num != null && name) return `Chapter ${num}: ${name}`;
  if (num != null) return `Chapter ${num}`;
  if (name) return name;
  return "";
}



function sortWordNeighbors(words: WordNeighbor[]) {
  return [...words].sort((a, b) => {
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
}


// -------------------------------------------------------------
// Page
// -------------------------------------------------------------
export default function WordDetailPage() {
  const params = useParams<{ userBookId: string; wordId: string }>();
  const userBookId = params.userBookId;
  const wordId = params.wordId;

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canUseVocabularyTools, setCanUseVocabularyTools] = useState(false);

  const [myRole, setMyRole] = useState<"teacher" | "member" | "super_teacher" | "admin">("member");
  const isTeacher = myRole === "teacher";

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState<string | null>(null);
  const [bookPageCount, setBookPageCount] = useState<number | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  const [word, setWord] = useState<WordRow | null>(null);
  const [meaningChoices, setMeaningChoices] = useState<string[]>([]);
  const [previousWord, setPreviousWord] = useState<WordNeighbor | null>(null);
  const [nextWord, setNextWord] = useState<WordNeighbor | null>(null);

  const [editing, setEditing] = useState<WordRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editSurface, setEditSurface] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const [editJlpt, setEditJlpt] = useState("");
  const [editPage, setEditPage] = useState<string>("");
  const [editChapterNum, setEditChapterNum] = useState<string>("");
  const [editChapterName, setEditChapterName] = useState("");
  const [editMeaningChoices, setEditMeaningChoices] = useState<string[]>([]);
  const [editMeaningChoiceIndex, setEditMeaningChoiceIndex] = useState<number | null>(0);
  const [editHideKanjiInReadingSupport, setEditHideKanjiInReadingSupport] = useState(false);

  const [repeatsInThisBook, setRepeatsInThisBook] = useState<number>(0);
  const [seenInstances, setSeenInstances] = useState<SeenInstance[]>([]);
  const [libraryColorInfo, setLibraryColorInfo] = useState<LibraryStudyWordColorInfo | null>(null);
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchQuery, setResearchQuery] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchSavingKey, setResearchSavingKey] = useState<string | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchCandidates, setResearchCandidates] = useState<JishoCandidate[]>([]);


  function openEdit(w: WordRow) {
    if (!canUseVocabularyTools) return;

    setEditErr(null);
    setEditing(w);
    setEditSurface(w.surface ?? "");
    setEditReading(w.reading ?? "");
    setEditMeaning(w.meaning ?? "");
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
    setEditMeaning(idx != null && choices.length && choices[idx] ? choices[idx] : w.meaning ?? "");
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

    const safe = Math.max(0, Number(newValue));
    setEditMeaningChoiceIndex(safe);

    if (choices.length) {
      const clamped = Math.min(safe, choices.length - 1);
      setEditMeaning(choices[clamped] ?? "");
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
    const parsedEditPage = parseOptionalPageLocationInput(editPage, bookPageCount);
    if (parsedEditPage.error) {
      setEditErr(parsedEditPage.error);
      setEditSaving(false);
      return;
    }

    const patch: any = {
      surface: editSurface.trim(),
      reading: editReading.trim() ? editReading.trim() : null,
      meaning: editMeaning.trim() ? editMeaning.trim() : null,
      other_definition: null,
      jlpt: editJlpt.trim() ? editJlpt.trim().toUpperCase() : null,
      page_number: parsedEditPage.value,
      chapter_number: parseNullableInt(editChapterNum),
      chapter_name: editChapterName.trim() ? editChapterName.trim() : null,
      hide_kanji_in_reading_support: editHideKanjiInReadingSupport,
    };

    patch.excluded_from_flashcards = !isReadyForFlashcards({
      ...editing,
      ...patch,
    });

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

      const updatedWord = { ...editing, ...patch } as WordRow;
      setWord(updatedWord);
      setMeaningChoices(asStringArray(updatedWord.meaning_choices));
      closeEdit();
    } catch (e: any) {
      setEditErr(e?.message ?? "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  }

  async function hideWord(nextHidden: boolean) {
    if (!word) return;
    if (!canUseVocabularyTools) return;

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({ hidden: nextHidden })
        .eq("id", word.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;
      setWord({ ...word, hidden: nextHidden });
    } catch (e: any) {
      alert(e?.message ?? "Failed to update word visibility");
    }
  }

  async function deleteWord() {
    if (!word) return;
    if (!canUseVocabularyTools) return;

    const ok = window.confirm(`Delete "${word.surface}"? This cannot be undone.`);
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("user_book_words")
        .delete()
        .eq("id", word.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;
      router.push(`/books/${encodeURIComponent(userBookId)}/words`);
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete word");
    }
  }

  function openResearch() {
    if (!word || !canUseVocabularyTools) return;
    setResearchOpen(true);
    setResearchQuery(word.surface ?? "");
    setResearchError(null);
    setResearchCandidates([]);
  }

  async function researchWord() {
    if (!canUseVocabularyTools) return;

    const query = researchQuery.trim();
    if (!query) {
      setResearchError("Enter a word to research.");
      return;
    }

    setResearchLoading(true);
    setResearchError(null);
    setResearchCandidates([]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) throw new Error("Missing session.");

      const response = await fetch(`/api/jisho?keyword=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Dictionary lookup failed.");
      }

      const candidates = buildJishoCandidates(payload?.data ?? [], query);
      setResearchCandidates(candidates);
      if (candidates.length === 0) {
        setResearchError("No dictionary meanings found. Try a different spelling or reading.");
      }
    } catch (error: any) {
      setResearchError(error?.message ?? "Could not research this word.");
    } finally {
      setResearchLoading(false);
    }
  }

  async function useResearchedMeaning(candidate: JishoCandidate, meaningIndex: number) {
    if (!word || !canUseVocabularyTools) return;

    const meaning = candidate.meaningChoices[meaningIndex]?.trim();
    if (!meaning) return;

    const savingKey = `${candidate.id}-${meaningIndex}`;
    setResearchSavingKey(savingKey);
    setResearchError(null);

    const patch: any = {
      surface: candidate.surface.trim() || word.surface,
      reading: candidate.reading.trim() || null,
      meaning,
      other_definition: null,
      jlpt: candidate.jlpt === "NON-JLPT" ? null : candidate.jlpt,
      is_common: candidate.isCommon,
      meaning_choices: candidate.meaningChoices,
      meaning_choice_index: meaningIndex,
    };

    patch.excluded_from_flashcards = !isReadyForFlashcards({
      ...word,
      ...patch,
    });

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update(patch)
        .eq("id", word.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      const updatedWord = { ...word, ...patch } as WordRow;
      setWord(updatedWord);
      setMeaningChoices(asStringArray(updatedWord.meaning_choices));
      setResearchOpen(false);
      setResearchCandidates([]);
    } catch (error: any) {
      setResearchError(error?.message ?? "Could not update this saved word.");
    } finally {
      setResearchSavingKey(null);
    }
  }

  async function loadAll() {
    setLoading(true);
    setErrorMsg(null);
    setNeedsSignIn(false);
    setCanUseVocabularyTools(false);
    setPreviousWord(null);
    setNextWord(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setNeedsSignIn(true);
        setWord(null);
        setBookTitle("");
        setBookCover(null);
        return;
      }

      const { data: meProfile, error: meProfileErr } = await supabase
        .from("profiles")
        .select("role, is_super_teacher, app_access_type, app_access_expires_at")
        .eq("id", user.id)
        .maybeSingle();

      if (meProfileErr) {
        console.error("Error loading profile role:", meProfileErr);
      }

      setMyRole((meProfile?.role as "teacher" | "member" | "super_teacher" | "admin") ?? "member");

      const appAccessStatus = meProfile
        ? getAppAccessStatus(meProfile)
        : { hasAccess: false, hasFullAccess: false, reason: "missing_profile" };
      const featureAccess = getFeatureAccess({
        role: meProfile?.is_super_teacher ? "super_teacher" : meProfile?.role ?? null,
        hasFullAccess: appAccessStatus.hasFullAccess,
        isTrialActive: appAccessStatus.reason === "trial",
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
	            cover_url,
	            page_count
	          )
        `
        )
        .eq("id", userBookId)
        .maybeSingle();

      if (ubErr) throw ubErr;

      if (!ub) {
        setErrorMsg("You do not have access to this word.");
        setWord(null);
        return;
      }

      const bookOwnerUserId = (ub as any)?.user_id ?? "";
      const isOwner = bookOwnerUserId === user.id;
      const isSuperTeacher =
        meProfile?.role === "super_teacher" || Boolean((meProfile as any)?.is_super_teacher);
      let isLinkedTeacher = false;

      if (!isOwner && !isSuperTeacher && meProfile?.role === "teacher") {
        const { data: teacherStudentRow, error: teacherStudentErr } = await supabase
          .from("teacher_students")
          .select("teacher_id")
          .eq("teacher_id", user.id)
          .eq("student_id", bookOwnerUserId)
          .is("archived_at", null)
          .maybeSingle();

        if (teacherStudentErr) {
          console.error("Error checking teacher/student access:", teacherStudentErr);
        }

        isLinkedTeacher = Boolean(teacherStudentRow);
      }

      if (!isOwner && !isSuperTeacher && !isLinkedTeacher) {
        setErrorMsg("You do not have access to this word.");
        setWord(null);
        return;
      }

      setBookTitle((ub as any)?.books?.title ?? "");
      setBookCover((ub as any)?.books?.cover_url ?? null);
      setBookPageCount((ub as any)?.books?.page_count ?? null);
      setOwnerUserId(bookOwnerUserId);

      const { data: w, error: wErr } = await supabase
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
          chapter_number,
          chapter_name,
          created_at,
          meaning_choices,
          meaning_choice_index,
          hidden,
          hide_kanji_in_reading_support,
          target_language_code
        `
        )
        .eq("id", wordId)
        .eq("user_book_id", userBookId)
        .maybeSingle()
        .returns<WordRow>();

      if (wErr) throw wErr;

      if (!w) {
        setErrorMsg("Word not found.");
        setWord(null);
        return;
      }

      setWord(w);
      setMeaningChoices(asStringArray((w as any).meaning_choices));

      const { data: neighborRows, error: neighborErr } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          surface,
          reading,
          page_number,
          chapter_number,
          chapter_name,
          page_order,
          created_at,
          hidden
        `
        )
        .eq("user_book_id", userBookId)
        .returns<WordNeighbor[]>();

      if (neighborErr) throw neighborErr;

      const orderedNeighbors = sortWordNeighbors(neighborRows ?? []);
      const currentIndex = orderedNeighbors.findIndex((item) => item.id === wordId);

      setPreviousWord(currentIndex > 0 ? orderedNeighbors[currentIndex - 1] : null);
      setNextWord(
        currentIndex >= 0 && currentIndex < orderedNeighbors.length - 1
          ? orderedNeighbors[currentIndex + 1]
          : null
      );
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load word");
      setWord(null);
      setSeenInstances([]);
      setPreviousWord(null);
      setNextWord(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadBookAwareInfo(surface: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) throw new Error("Missing session.");

      const response = await fetch(`/api/books/${userBookId}/word-context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ surface }),
      });

      if (!response.ok) throw new Error(await response.text());

      const payload = (await response.json()) as {
        repeatCount?: number;
        seenInstances?: SeenInstance[];
      };

      setRepeatsInThisBook(payload.repeatCount ?? 0);
      setSeenInstances(payload.seenInstances ?? []);
    } catch {
      setRepeatsInThisBook(0);
      setSeenInstances([]);
    }
  }

  async function loadLibraryColorInfo(surface: string, reading: string | null) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) throw new Error("Missing session.");

      const response = await fetch(`/api/books/${userBookId}/library-colors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ words: [{ surface, reading }] }),
      });

      if (!response.ok) throw new Error(await response.text());

      const payload = (await response.json()) as {
        colors?: Record<string, LibraryStudyWordColorInfo>;
      };
      const colorMap = payload.colors ?? {};
      setLibraryColorInfo(colorMap[makeLibraryStudyColorKey(surface, reading)] ?? null);
    } catch {
      setLibraryColorInfo(null);
    }
  }


  useEffect(() => {
    if (!userBookId || !wordId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBookId, wordId]);

  useEffect(() => {
    async function refreshDerivedData() {
      if (!word) return;

      await loadBookAwareInfo(word.surface);
      if (canUseVocabularyTools) {
        await loadLibraryColorInfo(word.surface, word.reading);
      } else {
        setLibraryColorInfo(null);
      }
    }

    refreshDerivedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, ownerUserId, canUseVocabularyTools]);

  if (loading) {
    return <WordDetailLoadingState />;
  }

  if (needsSignIn) {
    return (
      <WordDetailNeedsSignInState
        onBackToBooks={() => router.push(`/books`)}
      />
    );
  }

  if (errorMsg || !word) {
    return (
      <WordDetailErrorState
        errorMsg={errorMsg}
        onBack={() => router.back()}
      />
    );
  }

  const jlpt = normalizeJlpt(word.jlpt);
  const chapter = chapterDisplay(word.chapter_number, word.chapter_name);
  const definitionNumber =
    word.meaning_choice_index != null ? word.meaning_choice_index + 1 : null;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-4xl">
        {editing && canUseVocabularyTools ? (
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
              cacheSurface={null}
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
              onEditHideKanjiInReadingSupportChange={setEditHideKanjiInReadingSupport}
            />
          </BookVocabEditModalShell>
        ) : null}

        <WordDetailHeader
          bookTitle={bookTitle}
          bookCover={bookCover}
          chapter={chapter}
          pageNumber={word.page_number}
          bookHubHref={`/books/${encodeURIComponent(userBookId)}`}
          vocabListHref={`/books/${encodeURIComponent(userBookId)}/words`}
        />

        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!previousWord}
            onClick={() => {
              if (!previousWord) return;
              router.push(
                `/books/${encodeURIComponent(userBookId)}/words/${previousWord.id}`
              );
            }}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
              ← Previous word
            </div>
            <div className="mt-1 truncate text-base font-black text-stone-900">
              {previousWord?.surface ?? "Start of list"}
            </div>
            {previousWord?.reading ? (
              <div className="truncate text-sm font-medium text-stone-500">
                {previousWord.reading}
              </div>
            ) : null}
          </button>

          <button
            type="button"
            disabled={!nextWord}
            onClick={() => {
              if (!nextWord) return;
              router.push(`/books/${encodeURIComponent(userBookId)}/words/${nextWord.id}`);
            }}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-right"
          >
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
              Next word →
            </div>
            <div className="mt-1 truncate text-base font-black text-stone-900">
              {nextWord?.surface ?? "End of list"}
            </div>
            {nextWord?.reading ? (
              <div className="truncate text-sm font-medium text-stone-500">
                {nextWord.reading}
              </div>
            ) : null}
          </button>
        </div>

        <WordDictionaryInfoSection
          surface={word.surface}
          reading={word.reading}
          meaning={word.meaning}
          jlpt={jlpt}
          isCommon={word.is_common}
          definitionNumber={definitionNumber}
          repeatsInThisBook={repeatsInThisBook}
          hidden={word.hidden}
          colorInfo={canUseVocabularyTools ? libraryColorInfo : null}
          showStudyColor={canUseVocabularyTools}
        >
          {canUseVocabularyTools ? (
            <WordDetailFooterActions
              hidden={word.hidden}
              onEdit={() => openEdit(word)}
              onResearch={openResearch}
              onHide={() => hideWord(true)}
              onUnhide={() => hideWord(false)}
              onDelete={() => deleteWord()}
            />
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              <span className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-600">
                Read-only archive
              </span>
            </div>
          )}
        </WordDictionaryInfoSection>

        {researchOpen && canUseVocabularyTools ? (
          <section className="mb-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                  Research Again
                </p>
                <h2 className="mt-2 text-xl font-black text-stone-950">
                  Choose a better meaning for this sentence
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  Re-check the dictionary while keeping this book context nearby. This updates only
                  your saved word for this book.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResearchOpen(false);
                  setResearchError(null);
                  setResearchCandidates([]);
                }}
                className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={researchQuery}
                onChange={(event) => setResearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void researchWord();
                }}
                placeholder="Word or reading"
                className="min-w-0 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-violet-400"
              />
              <button
                type="button"
                onClick={() => void researchWord()}
                disabled={researchLoading || !researchQuery.trim()}
                className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {researchLoading ? "Researching..." : "Look Up"}
              </button>
            </div>

            {researchError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {researchError}
              </div>
            ) : null}

            {researchCandidates.length > 0 ? (
              <div className="mt-4 space-y-3">
                {researchCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-lg font-black text-stone-950">{candidate.surface}</h3>
                      {candidate.reading ? (
                        <span className="text-sm font-semibold text-stone-500">
                          {candidate.reading}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-black text-stone-600">
                        {candidate.jlpt}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {candidate.meaningChoices.map((candidateMeaning, index) => {
                        const savingKey = `${candidate.id}-${index}`;
                        return (
                          <button
                            key={`${candidate.id}-${candidateMeaning}-${index}`}
                            type="button"
                            onClick={() => void useResearchedMeaning(candidate, index)}
                            disabled={researchSavingKey != null}
                            className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-left text-sm transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
                          >
                            <span className="font-black text-violet-700">
                              Def. {index + 1}
                            </span>
                            <span className="ml-2 text-stone-800">{candidateMeaning}</span>
                            <span className="mt-1 block text-xs font-semibold text-stone-500">
                              {researchSavingKey === savingKey ? "Saving..." : "Use this meaning"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <WordSeenInSection
          seenInstances={seenInstances}
          meaningChoices={meaningChoices}
          getChapterDisplay={chapterDisplay}
        />

        {!isTeacher ? (
          <WordDetailReportIssueLink
            onReportIssue={() => {
              alert("Thanks! Your teacher will review this word.");
            }}
          />
        ) : null}

      </div>
    </main>
  );
}
