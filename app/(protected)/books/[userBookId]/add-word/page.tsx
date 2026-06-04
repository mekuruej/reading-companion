//Single Add 
// 
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import KanjiComponentLookup from "@/components/KanjiComponentLookup";
import LibraryColorBadge from "@/components/LibraryColorBadge";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
  canUseFullAccessFeature,
  getFullAccessRequiredCopy,
} from "@/lib/access/requireFullAccess";
import {
  fetchLibraryStudyColorInfoByWord,
  makeLibraryStudyColorKey,
  type LibraryStudyWordColorInfo,
} from "@/lib/libraryStudyColorLookup";
import AddWordPageHeader from "../components/AddWordPageHeader";
import AddWordStatusMessage from "../components/AddWordStatusMessage";
import AddWordBookContextCard from "../components/AddWordBookContextCard";
import AddWordFullAccessRequired from "../components/AddWordFullAccessRequired";

type JishoChoice = {
  surface: string;
  reading: string;
  jlpt: string;
  isCommon: boolean;
  meaningChoices: string[];
  defaultMeaning: string;
};

type JishoCandidate = JishoChoice & {
  id: string;
};

type SessionWord = {
  id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  jlpt: string;
  isCommon: boolean;
  meaningChoices: string[];
  meaningChoiceIndex: number | null;
  pageNumber: string;
  chapterNumber: string;
  chapterName: string;
  hideKanjiInReadingSupport: boolean;
  pageOrder: number | null;
};

function normalizeJlpt(val: string): string {
  if (!val) return "NON-JLPT";
  const v = val.toUpperCase();

  if (v.includes("N5")) return "N5";
  if (v.includes("N4")) return "N4";
  if (v.includes("N3")) return "N3";
  if (v.includes("N2")) return "N2";
  if (v.includes("N1")) return "N1";

  return "NON-JLPT";
}

function extractMeaningChoices(entry: any): string[] {
  const senses = entry?.senses ?? [];
  const choices: string[] = [];

  for (const s of senses) {
    const defs: string[] = s?.english_definitions ?? [];
    const text = defs.join("; ").trim();
    if (text) choices.push(text);
  }

  const seen = new Set<string>();
  return choices.filter((c) => {
    const key = c.toLowerCase();
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
      japaneseForms.find((j: any) => j?.word || j?.reading) ?? japaneseForms[0] ?? {};

    const surface = primaryForm?.word || entry?.slug || fallbackWord;
    const reading = primaryForm?.reading || "";
    const meaningChoices = extractMeaningChoices(entry);

    const candidate: JishoCandidate = {
      id: `${surface}__${reading || "no-reading"}__${index}`,
      surface,
      reading,
      jlpt: normalizeJlpt(entry?.jlpt?.[0] || ""),
      isCommon: !!entry?.is_common,
      meaningChoices,
      defaultMeaning: meaningChoices[0] || "",
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

function toNullableInt(value: string): number | null {
  const t = (value ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toDisplayString(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function isSmallViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 640px)").matches;
}

function hasKanji(text: string) {
  return /[\p{Script=Han}]/u.test(text);
}

async function generateVocabularyKanjiMap(vocabularyCacheId: number) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch("/api/vocabulary-kanji-map/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ vocabulary_cache_id: vocabularyCacheId }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    console.error("Could not generate vocabulary kanji map:", data?.error ?? response.status);
  }
}

export default function AddWordPage() {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccessBook, setCanAccessBook] = useState(false);
  const [canUseAddWord, setCanUseAddWord] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [word, setWord] = useState("");
  const [scratchWord, setScratchWord] = useState("");
  const [alternateSurface, setAlternateSurface] = useState("");
  const [useAlternateSurface, setUseAlternateSurface] = useState(false);

  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");
  const [jlpt, setJlpt] = useState("NON-JLPT");
  const [isCommon, setIsCommon] = useState(false);

  const [meaningChoices, setMeaningChoices] = useState<string[]>([]);
  const [meaningChoiceIndex, setMeaningChoiceIndex] = useState<number | null>(0);

  const [pageNumber, setPageNumber] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [hideKanjiInReadingSupport, setHideKanjiInReadingSupport] = useState(false);
  const [isWordHelpOpen, setIsWordHelpOpen] = useState(false);
  const [pickedKanji, setPickedKanji] = useState("");
  const [kanjiLookupResetKey, setKanjiLookupResetKey] = useState(0);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [superTeacherRole, setSuperTeacherRole] = useState<string | null>(null);
  const [profileIsSuperTeacher, setProfileIsSuperTeacher] = useState(false);
  const [superToolSaving, setSuperToolSaving] = useState<"cache" | "wordSky" | null>(null);
  const [superToolMessage, setSuperToolMessage] = useState("");
  const [message, setMessage] = useState("");
  const [lookupCandidates, setLookupCandidates] = useState<JishoCandidate[]>([]);
  const [savedNotice, setSavedNotice] = useState("");

  const [editingSessionWordId, setEditingSessionWordId] = useState<string | null>(null);
  const [sessionWords, setSessionWords] = useState<SessionWord[]>([]);
  const [libraryColorByWordKey, setLibraryColorByWordKey] = useState<
    Record<string, LibraryStudyWordColorInfo>
  >({});

  const wordInputRef = useRef<HTMLInputElement | null>(null);

  function closeAndClearWordHelp() {
    setIsWordHelpOpen(false);
    setScratchWord("");
    setPickedKanji("");
    setKanjiLookupResetKey((key) => key + 1);
  }

  function clearKanjiLookupSelection() {
    setPickedKanji("");
    setKanjiLookupResetKey((key) => key + 1);
  }
  const wordFieldsRef = useRef<HTMLDivElement | null>(null);
  const isSuperTeacher = superTeacherRole === "super_teacher" || profileIsSuperTeacher;

  async function canAccessUserBook(
    authedUserId: string,
    ownerUserId: string,
    profile: { role?: string | null; is_super_teacher?: boolean | null } | null
  ) {
    if (ownerUserId === authedUserId) return true;
    if (profile?.role === "super_teacher" || profile?.is_super_teacher) return true;
    if (profile?.role !== "teacher") return false;

    const { data: teacherStudentRow, error: teacherStudentErr } = await supabase
      .from("teacher_students")
      .select("teacher_id")
      .eq("teacher_id", authedUserId)
      .eq("student_id", ownerUserId)
      .maybeSingle();

    if (teacherStudentErr) {
      console.error("Error checking teacher/student access:", teacherStudentErr);
    }

    return Boolean(teacherStudentRow);
  }

  useEffect(() => {
    if (!userBookId) return;

    const saved = localStorage.getItem(`chapter_userBook_${userBookId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChapterNumber(parsed?.number || "");
        setChapterName(parsed?.name || "");
      } catch { }
    }

    async function loadBookInfo() {
      setAccessChecked(false);
      setCanAccessBook(false);
      setCanUseAddWord(false);
      setAccessMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setSuperTeacherRole(null);
        setProfileIsSuperTeacher(false);
        setCanUseAddWord(false);
        setAccessMessage("Please sign in.");
        setAccessChecked(true);
        setCanAccessBook(false);
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role, is_super_teacher, app_access_type, app_access_expires_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr) {
        console.error("Error loading profile role:", profileErr);
      }

      setSuperTeacherRole(profile?.role ?? null);
      setProfileIsSuperTeacher(!!profile?.is_super_teacher);

      const appAccessStatus = profile
        ? getAppAccessStatus(profile)
        : { hasAccess: false, hasFullAccess: false, reason: "missing_profile" };

      const featureAccess = getFeatureAccess({
        role: profile?.is_super_teacher ? "super_teacher" : profile?.role ?? null,

        // For this first pass, anyone who currently has app access keeps
        // full vocabulary access. Later, when expired trials become free users,
        // we can separate "can enter app" from "has full learning access."
        hasFullAccess: appAccessStatus.hasFullAccess,
      });

      setCanUseAddWord(canUseFullAccessFeature(featureAccess, "add_word"));

      const { data, error } = await supabase
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

      if (error) {
        setMessage(`❌ Could not load book info: ${error.message}`);
        setAccessMessage("You do not have access to this book.");
        setAccessChecked(true);
        setCanAccessBook(false);
        return;
      }

      if (!data) {
        setAccessMessage("You do not have access to this book.");
        setAccessChecked(true);
        setCanAccessBook(false);
        return;
      }

      const ownerUserId = (data as any)?.user_id ?? "";
      const allowed = await canAccessUserBook(user.id, ownerUserId, profile ?? null);

      if (!allowed) {
        setAccessMessage("You do not have access to this book.");
        setAccessChecked(true);
        setCanAccessBook(false);
        return;
      }

      setCanAccessBook(true);
      setAccessChecked(true);
      const b = (data as any)?.books;
      setBookTitle(b?.title ?? "");
      setBookCover(b?.cover_url ?? "");
    }

    loadBookInfo();
  }, [userBookId]);

  useEffect(() => {
    if (!userBookId) return;

    const hasAnyChapterInfo = chapterNumber.trim() || chapterName.trim();

    if (!hasAnyChapterInfo) return;

    localStorage.setItem(
      `chapter_userBook_${userBookId}`,
      JSON.stringify({
        number: chapterNumber,
        name: chapterName,
      })
    );
  }, [chapterNumber, chapterName, userBookId]);

  useEffect(() => {
    let cancelled = false;

    async function loadLibraryColors() {
      const currentSurface = useAlternateSurface ? alternateSurface : word;
      const wordsToCheck = [
        ...sessionWords.map((item) => ({
          surface: item.surface,
          reading: item.reading,
        })),
        {
          surface: currentSurface,
          reading,
        },
      ];

      const hasAnyLookupWord = wordsToCheck.some(
        (item) => item.surface?.trim() && item.reading?.trim()
      );

      if (!hasAnyLookupWord) {
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
        wordsToCheck,
        {
          includeMissingAsFirstEncounter: true,
        }
      );

      if (!cancelled) {
        setLibraryColorByWordKey(next);
      }
    }

    void loadLibraryColors();

    return () => {
      cancelled = true;
    };
  }, [sessionWords, word, alternateSurface, useAlternateSurface, reading, editingSessionWordId]);

  function prepareForNextWord() {
    window.setTimeout(() => {
      const input = wordInputRef.current;
      if (!input) return;

      if (isSmallViewport()) {
        input.focus({ preventScroll: true });
        return;
      }

      input.focus();
    }, 0);
  }

  function jumpToWordFields() {
    window.setTimeout(() => {
      const target = wordFieldsRef.current;
      if (!target) return;

      const top = window.scrollY + target.getBoundingClientRect().top - (isSmallViewport() ? 18 : 96);
      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    }, 0);
  }

  function clearForm(
    keepLocation = true,
    options: { preserveSavedNotice?: boolean } = {}
  ) {
    setWord("");
    setAlternateSurface("");
    setUseAlternateSurface(false);
    setReading("");
    setMeaning("");
    setJlpt("NON-JLPT");
    setIsCommon(false);
    setMeaningChoices([]);
    setMeaningChoiceIndex(0);
    setHideKanjiInReadingSupport(false);
    setEditingSessionWordId(null);
    setLookupCandidates([]);
    setMessage("");
    if (!options.preserveSavedNotice) {
      setSavedNotice("");
    }

    if (!keepLocation) {
      setPageNumber("");
      setChapterNumber("");
      setChapterName("");
    }

    window.setTimeout(() => wordInputRef.current?.focus({ preventScroll: true }), 0);
  }

  function applyJisho(entry: JishoChoice) {
    setWord(entry.surface);
    setReading(entry.reading);
    setJlpt(entry.jlpt);
    setIsCommon(entry.isCommon);
    setMeaningChoices(entry.meaningChoices);
    setMeaningChoiceIndex(entry.meaningChoices.length > 0 ? 0 : null);
    setMeaning(entry.defaultMeaning);
  }

  function loadSessionWordIntoForm(sessionWord: SessionWord) {
    setEditingSessionWordId(sessionWord.id);
    setWord(sessionWord.surface);
    setAlternateSurface("");
    setUseAlternateSurface(false);
    setReading(sessionWord.reading ?? "");
    setMeaning(sessionWord.meaning ?? "");
    setJlpt(sessionWord.jlpt || "NON-JLPT");
    setIsCommon(!!sessionWord.isCommon);
    setMeaningChoices(sessionWord.meaningChoices ?? []);
    setMeaningChoiceIndex(sessionWord.meaningChoiceIndex);
    setPageNumber(sessionWord.pageNumber);
    setChapterNumber(sessionWord.chapterNumber);
    setChapterName(sessionWord.chapterName);
    setHideKanjiInReadingSupport(sessionWord.hideKanjiInReadingSupport);
    setLookupCandidates([]);
    setMessage(`Editing "${sessionWord.surface}"`);

    jumpToWordFields();

    window.setTimeout(() => {
      wordInputRef.current?.focus({ preventScroll: true });
    }, 150);
  }

  async function handleLookup() {
    setMessage("");
    setSavedNotice("");

    const cleanWord = word.trim();
    if (!cleanWord) {
      setMessage("❌ Enter a word first.");
      return;
    }

    setLookupLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(cleanWord)}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (!res.ok) {
        setMessage("❌ Could not load dictionary data.");
        return;
      }

      const data = await res.json();
      const candidates = buildJishoCandidates(data?.data ?? [], cleanWord);
      const entry = candidates[0];

      if (!entry) {
        setMeaningChoices([]);
        setMeaningChoiceIndex(null);
        setReading("");
        setMeaning("");
        setJlpt("NON-JLPT");
        setIsCommon(false);
        setLookupCandidates([]);
        setMessage("❌ No dictionary result found. You can still enter it manually.");
        return;
      }

      applyJisho({
        surface: entry.surface,
        reading: entry.reading,
        jlpt: entry.jlpt,
        isCommon: entry.isCommon,
        meaningChoices: entry.meaningChoices,
        defaultMeaning: entry.defaultMeaning,
      });

      setLookupCandidates(candidates);
      setMessage(
        candidates.length > 1
          ? "✅ Dictionary info loaded. Pick the reading that matches your book if needed."
          : "✅ Dictionary info loaded."
      );

    } catch (err: any) {
      console.error("Lookup error:", err);
      setMessage("❌ Could not load dictionary data.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function getNextPageOrder(
    userBookIdValue: string,
    chapterNum: number | null,
    pageNum: number | null
  ) {
    let query = supabase
      .from("user_book_words")
      .select("page_order")
      .eq("user_book_id", userBookIdValue);

    if (chapterNum == null) query = query.is("chapter_number", null);
    else query = query.eq("chapter_number", chapterNum);

    if (pageNum == null) query = query.is("page_number", null);
    else query = query.eq("page_number", pageNum);

    const { data, error } = await query;
    if (error) throw error;

    const maxPageOrder = Math.max(
      0,
      ...((data ?? []).map((r: any) => Number(r.page_order) || 0))
    );

    return maxPageOrder + 1;
  }

  function buildCurrentWordPayload() {
    const cleanWord = word.trim();
    const cleanAlternateSurface = alternateSurface.trim();
    const cleanReading = reading.trim();
    const cleanMeaning = meaning.trim();
    const finalSurface = useAlternateSurface ? cleanAlternateSurface : cleanWord;
    const cleanedMeanings = meaningChoices.map((choice) => choice.trim()).filter(Boolean);
    const meanings = cleanMeaning
      ? [cleanMeaning, ...cleanedMeanings.filter((choice) => choice !== cleanMeaning)]
      : cleanedMeanings;

    return {
      surface: finalSurface,
      reading: cleanReading,
      meaning: cleanMeaning || meanings[0] || "",
      meanings,
      jlpt_level: normalizeJlpt(jlpt),
    };
  }

  async function saveToGlobalWordData(approveForWordSky: boolean) {
    setSuperToolMessage("");
    setMessage("");

    const payload = buildCurrentWordPayload();

    if (!payload.surface) {
      setSuperToolMessage("❌ Enter a word first.");
      return;
    }

    if (!payload.reading) {
      setSuperToolMessage("❌ Add a reading first.");
      return;
    }

    if (!payload.meaning) {
      setSuperToolMessage("❌ Add a meaning first.");
      return;
    }

    setSuperToolSaving(approveForWordSky ? "wordSky" : "cache");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/word-sky/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          ...payload,
          approveForWordSky,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? "Could not update global word data.");
      }

      setSuperToolMessage(
        approveForWordSky
          ? `✅ Saved to cache and approved for Word Sky: ${payload.surface}`
          : `✅ Saved to vocabulary cache: ${payload.surface}`
      );
    } catch (err: any) {
      console.error("Super teacher word tool error:", err);
      setSuperToolMessage(`❌ ${err?.message ?? "Could not update global word data."}`);
    } finally {
      setSuperToolSaving(null);
    }
  }

  function sameGroup(
    existing: SessionWord,
    nextChapterNum: number | null,
    nextPageNum: number | null,
    nextChapterName: string
  ) {
    const oldChapterNum = toNullableInt(existing.chapterNumber);
    const oldPageNum = toNullableInt(existing.pageNumber);
    const oldChapterName = (existing.chapterName ?? "").trim();
    const newChapterName = (nextChapterName ?? "").trim();

    return (
      oldChapterNum === nextChapterNum &&
      oldPageNum === nextPageNum &&
      oldChapterName === newChapterName
    );
  }

  async function handleSave() {
    setMessage("");

    const cleanWord = word.trim();
    const cleanAlternateSurface = alternateSurface.trim();
    const cleanReading = reading.trim();
    const cleanMeaning = meaning.trim();

    if (!userBookId) {
      setMessage("❌ Missing userBookId.");
      return;
    }

    if (!cleanWord) {
      setMessage("❌ Enter a word first.");
      return;
    }

    if (useAlternateSurface && !cleanAlternateSurface) {
      setMessage("❌ Add the alternate kanji form or uncheck the box.");
      return;
    }

    if (!cleanReading) {
      setMessage("❌ Add a reading.");
      return;
    }

    if (!cleanMeaning) {
      setMessage("❌ Add a meaning.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("❌ Please sign in.");
        return;
      }

      if (!canAccessBook) {
        setMessage("❌ You do not have access to save words to this book.");
        setSaving(false);
        return;
      }

      if (!canUseAddWord) {
        const copy = getFullAccessRequiredCopy("add_word");
        setMessage(`❌ ${copy.message}`);
        setSaving(false);
        return;
      }

      const finalSurface = useAlternateSurface ? cleanAlternateSurface : cleanWord;
      const hasVerifiedDictionaryMatch = lookupCandidates.some(
        (candidate) =>
          candidate.surface === finalSurface &&
          candidate.reading === cleanReading &&
          candidate.meaningChoices.length > 0
      );
      let vocabularyCacheId: number | null = null;

      if (hasKanji(finalSurface) && hasVerifiedDictionaryMatch) {
        const { data: existingCache, error: cacheLookupError } = await supabase
          .from("vocabulary_cache")
          .select("id")
          .eq("surface", finalSurface)
          .eq("reading", cleanReading)
          .maybeSingle();

        if (cacheLookupError) {
          console.error("Error looking up vocabulary cache:", cacheLookupError);
          setMessage("❌ Could not save word: vocabulary cache lookup failed.");
          return;
        }

        if (existingCache?.id) {
          vocabularyCacheId = existingCache.id;
        } else {
          const { data: createdCache, error: cacheInsertError } = await supabase
            .from("vocabulary_cache")
            .insert({
              surface: finalSurface,
              reading: cleanReading,
            })
            .select("id")
            .single();

          if (cacheInsertError) {
            console.error("Error creating vocabulary cache row:", cacheInsertError);
            setMessage("❌ Could not save word: vocabulary cache creation failed.");
            return;
          }

          vocabularyCacheId = createdCache.id;
        }
      }

      const chapterNum = toNullableInt(chapterNumber);
      const pageNum = toNullableInt(pageNumber);
      const chapterNameTrimmed = chapterName.trim() || null;
      const today = new Date().toISOString().slice(0, 10);

      const editingExisting =
        editingSessionWordId != null
          ? sessionWords.find((w) => w.id === editingSessionWordId) ?? null
          : null;

      let pageOrderToUse: number | null;

      if (!editingExisting) {
        pageOrderToUse = await getNextPageOrder(userBookId, chapterNum, pageNum);
      } else if (sameGroup(editingExisting, chapterNum, pageNum, chapterNameTrimmed ?? "")) {
        pageOrderToUse = editingExisting.pageOrder;
      } else {
        pageOrderToUse = await getNextPageOrder(userBookId, chapterNum, pageNum);
      }

      const payload = {
        user_book_id: userBookId,
        vocabulary_cache_id: vocabularyCacheId,
        surface: finalSurface,
        reading: cleanReading,
        meaning: cleanMeaning,
        other_definition: meaningChoiceIndex == null ? cleanMeaning : null,
        meaning_choices: meaningChoices,
        meaning_choice_index: meaningChoiceIndex,
        jlpt: normalizeJlpt(jlpt),
        is_common: !!isCommon,
        page_number: pageNum,
        page_order: pageOrderToUse,
        chapter_number: chapterNum,
        chapter_name: chapterNameTrimmed,
        hide_kanji_in_reading_support: hideKanjiInReadingSupport,
        seen_on: today,
      };

      if (!editingExisting) {
        const { data: insertedRow, error } = await supabase
          .from("user_book_words")
          .insert(payload)
          .select(
            `
            id,
            surface,
            reading,
            meaning,
            jlpt,
            is_common,
            meaning_choices,
            meaning_choice_index,
            page_number,
            chapter_number,
            chapter_name,
            hide_kanji_in_reading_support,
            page_order,
            vocabulary_cache_id
          `
          )
          .single();

        if (error) throw error;

        const newSessionWord: SessionWord = {
          id: insertedRow.id,
          surface: insertedRow.surface ?? finalSurface,
          reading: insertedRow.reading ?? cleanReading,
          meaning: insertedRow.meaning ?? cleanMeaning,
          jlpt: insertedRow.jlpt ?? normalizeJlpt(jlpt),
          isCommon: !!insertedRow.is_common,
          meaningChoices: insertedRow.meaning_choices ?? [],
          meaningChoiceIndex: insertedRow.meaning_choice_index,
          pageNumber: toDisplayString(insertedRow.page_number),
          chapterNumber: toDisplayString(insertedRow.chapter_number),
          chapterName: insertedRow.chapter_name ?? "",
          hideKanjiInReadingSupport: !!insertedRow.hide_kanji_in_reading_support,
          pageOrder: insertedRow.page_order ?? null,
        };

        setSessionWords((prev) => [
          newSessionWord,
          ...prev.filter((item) => item.id !== newSessionWord.id),
        ]);
        setSavedNotice(`Saved: ${finalSurface}`);
        setMessage("");
      } else {
        const { data: updatedRow, error } = await supabase
          .from("user_book_words")
          .update(payload)
          .eq("id", editingExisting.id)
          .eq("user_book_id", userBookId)
          .select(
            `
            id,
            surface,
            reading,
            meaning,
            jlpt,
            is_common,
            meaning_choices,
            meaning_choice_index,
            page_number,
            chapter_number,
            chapter_name,
            hide_kanji_in_reading_support,
            page_order,
            vocabulary_cache_id
          `
          )
          .single();

        if (error) throw error;

        const updatedSessionWord: SessionWord = {
          id: updatedRow.id,
          surface: updatedRow.surface ?? finalSurface,
          reading: updatedRow.reading ?? cleanReading,
          meaning: updatedRow.meaning ?? cleanMeaning,
          jlpt: updatedRow.jlpt ?? normalizeJlpt(jlpt),
          isCommon: !!updatedRow.is_common,
          meaningChoices: updatedRow.meaning_choices ?? [],
          meaningChoiceIndex: updatedRow.meaning_choice_index,
          pageNumber: toDisplayString(updatedRow.page_number),
          chapterNumber: toDisplayString(updatedRow.chapter_number),
          chapterName: updatedRow.chapter_name ?? "",
          hideKanjiInReadingSupport: !!updatedRow.hide_kanji_in_reading_support,
          pageOrder: updatedRow.page_order ?? null,
        };

        setSessionWords((prev) => [
          updatedSessionWord,
          ...prev.filter((item) => item.id !== updatedSessionWord.id),
        ]);
        setSavedNotice(`Saved: ${finalSurface}`);
        setMessage("");
      }

      if (vocabularyCacheId && hasKanji(finalSurface)) {
        await generateVocabularyKanjiMap(vocabularyCacheId);
      }

      clearForm(true, { preserveSavedNotice: true });
      prepareForNextWord();
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage(`❌ Failed saving: ${err?.message ?? "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSessionWord(id: string) {
    const { error } = await supabase
      .from("user_book_words")
      .delete()
      .eq("id", id)
      .eq("user_book_id", userBookId);

    if (error) {
      console.error("Error deleting word:", error);
      setMessage(`❌ Could not delete word: ${error.message}`);
      return;
    }

    setSessionWords((prev) => prev.filter((item) => item.id !== id));

    if (editingSessionWordId === id) {
      clearForm(true);
    }

    setMessage("✅ Word deleted from Vocab List.");
  }

  const currentColorSurface = useAlternateSurface ? alternateSurface : word;

  const currentLibraryColorInfo =
    libraryColorByWordKey[
    makeLibraryStudyColorKey(currentColorSurface, reading)
    ] ?? null;

  if (!accessChecked) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-gray-500">Loading book info…</p>
        </div>
      </main>
    );
  }

  if (!canAccessBook) {
    return (
      <AccessDeniedMessage message={accessMessage || "You do not have access to this book."} />
    );
  }

  if (!canUseAddWord) {
    const copy = getFullAccessRequiredCopy("add_word");

    return (
      <AddWordFullAccessRequired
        title={copy.title}
        message={copy.message}
        bookTitle={bookTitle}
        onBackToBookHub={() => {
          router.push(`/books/${encodeURIComponent(userBookId)}`);
        }}
        onGoToLibrary={() => {
          router.push("/books");
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <AddWordPageHeader />

        {bookTitle ? (
          <AddWordBookContextCard
            bookTitle={bookTitle}
            bookCover={bookCover}
            onOpenBookHub={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
            onOpenVocabList={() =>
              router.push(`/books/${encodeURIComponent(userBookId)}/words`)
            }
          />
        ) : (
          <p className="mb-6 text-sm text-gray-500">Loading book info…</p>
        )}

        <AddWordStatusMessage message={message} />

        <div className="mt-4 rounded-2xl border border-stone-300 bg-white p-4">
          <div className="mb-3">
            <div className="text-sm font-semibold text-stone-900">Add / Edit Word</div>
            <p className="mt-1 text-sm text-stone-600">
              Search, adjust, and save from one place. Page and chapter stay ready for the next word.
            </p>
          </div>

          <div className={`space-y-4 rounded-xl border p-4 ${editingSessionWordId
            ? "border-amber-200 bg-amber-50"
            : "border-stone-200 bg-stone-50"
            }`}
          >
            {editingSessionWordId ? (
              <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-800">
                Editing "{word}"
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2 lg:items-end">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!word.trim() || lookupLoading) return;
                  void handleLookup();
                }}
                className="space-y-1"
              >
                <label className="block text-sm font-medium text-stone-700">
                  Rapid search
                </label>
                <p className="text-xs text-stone-500">
                  Already know the kanji? Search with a simple Enter tap.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={wordInputRef}
                    value={word}
                    onChange={(event) => {
                      setWord(event.target.value);
                      setSavedNotice("");
                      if (lookupCandidates.length > 0) setLookupCandidates([]);
                    }}
                    placeholder="Search or edit a word..."
                    className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                  />

                  <button
                    type="submit"
                    disabled={lookupLoading || !word.trim()}
                    className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                  >
                    {lookupLoading ? "Searching..." : "Search"}
                  </button>
                </div>
              </form>

              {currentColorSurface.trim() && reading.trim() ? (
                <div className="flex min-h-12 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
                  <span>Current library status:</span>
                  {currentLibraryColorInfo ? (
                    <LibraryColorBadge
                      colorStatus={currentLibraryColorInfo.colorStatus}
                      stageLabel={currentLibraryColorInfo.stageLabel}
                    />
                  ) : (
                    <LibraryColorBadge color="none" label="Not in library yet" />
                  )}
                </div>
              ) : null}
            </div>

            <details
              open={isWordHelpOpen}
              onToggle={(event) =>
                setIsWordHelpOpen((event.currentTarget as HTMLDetailsElement).open)
              }
              className="rounded-xl border border-stone-200 bg-white/75 p-3"
            >
              <summary className="cursor-pointer text-sm font-semibold text-stone-800">
                Having trouble? Look up a kanji. Build a word.
              </summary>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700">
                    Build a word
                  </label>
                  <p className="mt-1 text-xs text-stone-500">
                    Try pieces here first. Nothing will search until you use it.
                  </p>

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={scratchWord}
                      onChange={(event) => setScratchWord(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.stopPropagation();
                        }
                      }}
                      placeholder="Try building the word here..."
                      className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                    />
                    <button
                      type="button"
                      disabled={!scratchWord.trim()}
                      onClick={() => {
                        setWord(scratchWord.trim());
                        closeAndClearWordHelp();
                        setSavedNotice("");
                        if (lookupCandidates.length > 0) setLookupCandidates([]);
                        window.requestAnimationFrame(() => wordInputRef.current?.focus());
                      }}
                      className="shrink-0 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                    >
                      Use this word
                    </button>
                  </div>
                </div>

                {pickedKanji ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-stone-600">
                      Last Kanji:{" "}
                      <span className="text-2xl font-semibold text-stone-900">
                        {pickedKanji}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearKanjiLookupSelection();
                      }}
                      className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                    >
                      Use this kanji
                    </button>
                  </div>
                ) : null}

                <KanjiComponentLookup
                  resetKey={kanjiLookupResetKey}
                  onPickKanji={(kanji) => {
                    setPickedKanji(kanji);
                    setScratchWord((prev) => `${prev}${kanji}`);
                  }}
                />
              </div>
            </details>

            {message ? (
              <div className={`text-sm ${message.startsWith("❌") ? "text-red-700" : "text-stone-600"}`}>
                {message}
              </div>
            ) : null}

            {lookupCandidates.length > 1 ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <div className="text-sm font-medium text-sky-900">
                  Dictionary choices for "{word.trim()}"
                </div>
                <p className="mt-1 text-sm text-sky-800">
                  Choose the reading and meaning that match your book.
                </p>

                <div className="mt-3 space-y-2">
                  {lookupCandidates.map((candidate) => {
                    const isSelected =
                      candidate.surface === word &&
                      candidate.reading === reading &&
                      candidate.defaultMeaning === meaning;

                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          applyJisho(candidate);
                          setMessage(
                            `✅ Loaded ${candidate.surface}${candidate.reading ? `【${candidate.reading}】` : ""
                            }.`
                          );
                          jumpToWordFields();
                        }}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${isSelected
                          ? "border-sky-400 bg-white shadow-sm"
                          : "border-sky-200 bg-white/80 hover:bg-white"
                          }`}
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-base font-semibold text-stone-900">
                            {candidate.surface}
                          </span>
                          <span className="text-sm text-stone-600">
                            {candidate.reading || "No reading listed"}
                          </span>
                          {candidate.jlpt !== "NON-JLPT" ? (
                            <span className="text-xs font-medium text-sky-700">
                              {candidate.jlpt}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm text-stone-700">
                          {candidate.defaultMeaning || "No meaning listed"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div ref={wordFieldsRef} className="space-y-3">
              <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
                <span className="font-semibold text-stone-900">Manual entry:</span>{" "}
                1. Type the word. 2. Add the reading. 3. Add the meaning. 4. Save.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">Reading</label>
                  <input
                    value={reading}
                    onChange={(e) => setReading(e.target.value)}
                    placeholder="Reading"
                    className="w-full rounded border bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Alternate surface
                  </label>
                  <input
                    value={alternateSurface}
                    onChange={(e) => {
                      setAlternateSurface(e.target.value);
                      setUseAlternateSurface(e.target.value.trim().length > 0);
                    }}
                    placeholder="Book form, if different"
                    className="w-full rounded border bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Meaning</label>

              <div className="space-y-2">
                {meaningChoices.length > 0 ? (
                  <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-3">
                    {meaningChoices.map((choice, index) => (
                      <label
                        key={index}
                        className="flex items-start gap-2 text-sm text-stone-700"
                      >
                        <input
                          type="radio"
                          checked={meaningChoiceIndex === index}
                          onChange={() => {
                            setMeaningChoiceIndex(index);
                            setMeaning(choice);
                          }}
                        />
                        <span>{choice || "—"}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">
                    No dictionary meanings loaded. Enter your own meaning below.
                  </p>
                )}

                <textarea
                  value={meaningChoiceIndex == null ? meaning : ""}
                  onChange={(e) => {
                    setMeaningChoiceIndex(null);
                    setMeaning(e.target.value);
                  }}
                  placeholder="Type your meaning"
                  className="min-h-[80px] w-full rounded border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">Page</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="Page"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">Chapter number</span>
                <input
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  placeholder="Chapter #"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">Chapter name</span>
                <input
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                  placeholder="Chapter name"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={hideKanjiInReadingSupport}
                onChange={(e) => setHideKanjiInReadingSupport(e.target.checked)}
              />
              <span>Hide kanji in Read Along (does not affect Vocab List)</span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !word.trim()}
                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Word"}
              </button>

              <button
                type="button"
                onClick={() => clearForm(true)}
                className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
              >
                Clear Word Fields
              </button>

              {savedNotice ? (
                <span className="text-sm font-medium text-emerald-700">{savedNotice}</span>
              ) : null}
            </div>

            {isSuperTeacher && (
              <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="text-sm font-semibold text-amber-950">
                  Super teacher tools
                </div>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  These actions update global word data. They do not have to save the word
                  to this book.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveToGlobalWordData(false)}
                    disabled={superToolSaving != null}
                    className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {superToolSaving === "cache"
                      ? "Saving..."
                      : "Save to vocabulary cache only"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void saveToGlobalWordData(true)}
                    disabled={superToolSaving != null}
                    className="rounded-xl bg-amber-900 px-3 py-2 text-sm font-medium text-white hover:bg-amber-950 disabled:opacity-50"
                  >
                    {superToolSaving === "wordSky"
                      ? "Approving..."
                      : "Save to cache + approve for Word Sky"}
                  </button>
                </div>

                {superToolMessage ? (
                  <p
                    className={`mt-2 text-sm font-medium ${superToolMessage.startsWith("❌")
                      ? "text-red-700"
                      : "text-emerald-700"
                      }`}
                  >
                    {superToolMessage}
                  </p>
                ) : null}
              </section>
            )}
          </div>

          {sessionWords.length > 0 ? (
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div>
                <div className="text-sm font-medium text-stone-900">
                  Recently added
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {sessionWords.length} word{sessionWords.length === 1 ? "" : "s"} saved this session
                </p>
              </div>

              <div className="mt-3 space-y-3">
                {sessionWords.slice(0, 2).map((item, index) => {
                  const colorInfo =
                    libraryColorByWordKey[makeLibraryStudyColorKey(item.surface, item.reading)] ?? null;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border bg-white p-3 ${index === 1 ? "hidden sm:block" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-stone-900">{item.surface}</div>
                            {colorInfo ? (
                              <LibraryColorBadge
                                colorStatus={colorInfo.colorStatus}
                                stageLabel={colorInfo.stageLabel}
                              />
                            ) : null}
                          </div>
                          <div className="text-stone-500">{item.reading || "—"}</div>
                          <div className="mt-1 text-stone-700">{item.meaning || "—"}</div>
                          <div className="mt-1 text-xs text-stone-500">
                            Page {item.pageNumber || "—"} · Ch {item.chapterNumber || "—"} ·{" "}
                            {item.chapterName || "—"}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => loadSessionWordIntoForm(item)}
                            className="rounded bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteSessionWord(item.id)}
                            className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {sessionWords.length > 1 ? (
                <details className="mt-3 rounded-lg border border-stone-200 bg-white sm:hidden">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-stone-700">
                    Saved words from this session
                  </summary>
                  <div className="space-y-3 border-t border-stone-200 p-3">
                    {sessionWords.slice(1).map((item) => {
                      const colorInfo =
                        libraryColorByWordKey[makeLibraryStudyColorKey(item.surface, item.reading)] ?? null;

                      return (
                        <div key={item.id} className="rounded-lg border bg-stone-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-sm">
                              <div className="font-medium text-stone-900">{item.surface}</div>
                              <div className="text-stone-500">{item.reading || "—"}</div>
                              <div className="mt-1 text-stone-700">{item.meaning || "—"}</div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => loadSessionWordIntoForm(item)}
                                className="rounded bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteSessionWord(item.id)}
                                className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ) : null}

              {sessionWords.length > 2 ? (
                <details className="mt-3 hidden rounded-lg border border-stone-200 bg-white sm:block">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-stone-700">
                    Saved words from this session
                  </summary>
                  <div className="space-y-3 border-t border-stone-200 p-3">
                    {sessionWords.slice(1).map((item) => {
                      const colorInfo =
                        libraryColorByWordKey[makeLibraryStudyColorKey(item.surface, item.reading)] ?? null;

                      return (
                        <div key={item.id} className="rounded-lg border bg-stone-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-sm">
                              <div className="font-medium text-stone-900">{item.surface}</div>
                              <div className="text-stone-500">{item.reading || "—"}</div>
                              <div className="mt-1 text-stone-700">{item.meaning || "—"}</div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => loadSessionWordIntoForm(item)}
                                className="rounded bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteSessionWord(item.id)}
                                className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main >
  );
}
