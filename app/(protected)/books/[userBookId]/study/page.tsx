// Vocab Flashcards
// 
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { recordStudyEvent } from "@/lib/studyEvents";

type StudySet =
  | "READING"
  | "READING_MC"
  | "MEANING"
  | "MEANING_MC"
  | "FROM_READING_MEANING"
  | "FROM_READING_MC"
  | "FROM_READING_MEANING_MC"
  | "COMPLETE";

type StepField = "word" | "reading" | "meaning";

function studySetLabel(s: StudySet) {
  switch (s) {
    case "READING":
      return "Reading Typing";
    case "MEANING":
      return "Meaning Typing";
    case "FROM_READING_MEANING":
      return "Reading to Meaning Typing";
    case "READING_MC":
      return "Reading MC";
    case "MEANING_MC":
      return "Meaning MC";
    case "FROM_READING_MC":
      return "Reading to Kanji MC";
    case "FROM_READING_MEANING_MC":
      return "Reading to Meaning MC";
    case "COMPLETE":
      return "Complete Review";
    default:
      return "Reading Typing";
  }
}

type KanjiMetaItem = {
  kanji: string;
  strokes: number | null;
};

type WordRow = {
  id: string;
  user_book_id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  is_common: boolean | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  seen_on: string | null;
  created_at: string;
  meaning_choices: any | null;
  meaning_choice_index: number | null;
  hidden: boolean | null;
  skipped_on: string | null;
  kanji_meta: KanjiMetaItem[] | null;
  flagged_for_review: boolean | null;
  excluded_from_flashcards: boolean | null;
  flag_note: string | null;
  flagged_by_user_id: string | null;
  flagged_at: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
};

type Flashcard = {
  id: string;
  word: string;
  reading: string | null;
  meaning: string | null;
  jlpt: string;
  chapterLabel: string;
  chapterDisplay: string;
  page_number: number | null;
  meaningChoices: string[];
  meaningChoiceIndex: number;
  repeatKey: string;
  repeatCount: number;
  totalCount: number;
  kanjiMeta: KanjiMetaItem[];
  isCommon: boolean | null;
};

function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

function chapterInfoFromRow(r: WordRow): { label: string; display: string } {
  const name = (r.chapter_name ?? "").trim();
  const num = r.chapter_number;

  if (num != null && name) {
    return { label: `ch${num}::${name}`, display: `Chapter ${num}: ${name}` };
  }
  if (num != null) {
    return { label: `ch${num}`, display: `Chapter ${num}` };
  }
  if (name) {
    return { label: `name::${name}`, display: name };
  }
  return { label: "(none)", display: "(none)" };
}

function kataToHira(s: string) {
  return (s ?? "").replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function normalizeReading(s: string) {
  return kataToHira(s ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[・･]/g, "")
    .replace(/ー/g, "")
    .toLowerCase();
}

function isKanaOnly(s: string) {
  return /^[ぁ-ゖァ-ヶー]+$/.test(s.trim());
}

function normalizeMeaning(s: string) {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,;:()"]/g, " ")
    .replace(/\s+/g, " ");
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

function normalizeRepeatKey(surface: string) {
  return (surface ?? "").trim();
}

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1", "NON-JLPT"] as const;

export default function BookFlashcardsPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const router = useRouter();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);
  const [libraryCards, setLibraryCards] = useState<Flashcard[]>([]);

  const [studySet, setStudySet] = useState<StudySet>("READING");
  const studyOnceMode = true;

  const [sessionOrder, setSessionOrder] = useState<number[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);

  const settingsKey = useMemo(
    () => `flashcards_settings_${userBookId}`,
    [userBookId]
  );

  const steps = useMemo<StepField[]>(() => {
    switch (studySet) {
      case "READING":
      case "READING_MC":
        return ["word", "meaning", "reading"];
      case "MEANING":
      case "MEANING_MC":
        return ["word", "reading", "meaning"];
      case "FROM_READING_MEANING":
      case "FROM_READING_MC":
      case "FROM_READING_MEANING_MC":
        return ["reading", "word", "meaning"];
      case "COMPLETE":
        return ["word", "reading", "meaning"];
      default:
        return ["word", "meaning", "reading"];
    }
  }, [studySet]);

  const isMultipleChoiceMode =
    studySet === "READING_MC" ||
    studySet === "MEANING_MC" ||
    studySet === "FROM_READING_MC" ||
    studySet === "FROM_READING_MEANING_MC";

  const typeModeEnabled =
    studySet === "READING" ||
    studySet === "MEANING" ||
    studySet === "FROM_READING_MEANING";

  const [typedInput, setTypedInput] = useState("");
  const [typedFeedback, setTypedFeedback] = useState<null | { ok: boolean; message: string }>(
    null
  );
  const [typeRevealIndex, setTypeRevealIndex] = useState(0);
  const [readyForNextCard, setReadyForNextCard] = useState(false);
  const [lastTypedResult, setLastTypedResult] = useState<
    "revealed" | "correct" | "wrong" | null
  >(null);
  const [inputResetKey, setInputResetKey] = useState(0);

  const [mcOptions, setMcOptions] = useState<string[]>([]);
  const [mcSelected, setMcSelected] = useState<string | null>(null);
  const [mcCorrectAnswer, setMcCorrectAnswer] = useState<string | null>(null);
  const [mcAnswered, setMcAnswered] = useState(false);
  const [mcWasCorrect, setMcWasCorrect] = useState<boolean | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [firstTouch, setFirstTouch] = useState(true);

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [jlptSelected, setJlptSelected] = useState<string[]>([]);
  const [chapterFilter, setChapterFilter] = useState("all");
  const [repeatsOnly, setRepeatsOnly] = useState(false);

  const [chapterOptions, setChapterOptions] = useState<{ value: string; label: string }[]>([]);

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");
  const [meId, setMeId] = useState("");

  const [defSaving, setDefSaving] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);
  const [showDefPicker, setShowDefPicker] = useState(false);

  useEffect(() => {
    if (!userBookId) return;

    try {
      const raw = localStorage.getItem(settingsKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed?.studySet) setStudySet(parsed.studySet as StudySet);
      if (Array.isArray(parsed?.jlptSelected)) setJlptSelected(parsed.jlptSelected);
      if (parsed?.chapterFilter) setChapterFilter(parsed.chapterFilter);
      if (typeof parsed?.repeatsOnly === "boolean") setRepeatsOnly(parsed.repeatsOnly);
    } catch { }
  }, [settingsKey, userBookId]);

  useEffect(() => {
    if (!userBookId) return;

    try {
      localStorage.setItem(
        settingsKey,
        JSON.stringify({
          studySet,
          studyOnceMode,
          jlptSelected,
          chapterFilter,
          repeatsOnly,
        })
      );
    } catch { }
  }, [settingsKey, userBookId, studySet, studyOnceMode, jlptSelected, chapterFilter, repeatsOnly]);

  useEffect(() => {
    if (!userBookId) return;

    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      setNeedsSignIn(false);

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (user?.id) setMeId(user.id);

        if (!user) {
          setNeedsSignIn(true);
          setCards([]);
          setFilteredCards([]);
          setLibraryCards([]);
          setBookTitle("");
          setBookCover("");
          setChapterOptions([]);
          return;
        }

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
          .single();

        if (ubErr) throw ubErr;

        setBookTitle((ub as any)?.books?.title ?? "");
        setBookCover((ub as any)?.books?.cover_url ?? "");

        const ownerUserId = (ub as any)?.user_id ?? "";
        const totalCounts = new Map<string, number>();

        if (ownerUserId) {
          const { data: ownedBooks, error: ownedBooksErr } = await supabase
            .from("user_books")
            .select("id")
            .eq("user_id", ownerUserId);

          if (ownedBooksErr) throw ownedBooksErr;

          const ownedBookIds = (ownedBooks ?? []).map((b: any) => b.id).filter(Boolean);

          if (ownedBookIds.length > 0) {
            const { data: libraryWords, error: libraryWordsErr } = await supabase
              .from("user_book_words")
              .select(
                `
                id,
                user_book_id,
                surface,
                reading,
                meaning,
                jlpt,
                is_common,
                page_number,
                chapter_number,
                chapter_name,
                seen_on,
                created_at,
                meaning_choices,
                meaning_choice_index,
                hidden,
                skipped_on,
                flagged_for_review,
                excluded_from_flashcards,
                flag_note,
                flagged_by_user_id,
                flagged_at,
                reviewed_by_user_id,
                reviewed_at,
                kanji_meta
              `
              )
              .in("user_book_id", ownedBookIds)
              .eq("excluded_from_flashcards", false)
              .eq("hidden", false)
              .order("page_number", { ascending: true })
              .order("created_at", { ascending: true });

            if (libraryWordsErr) throw libraryWordsErr;

            for (const w of libraryWords ?? []) {
              const key = normalizeRepeatKey((w as any).surface ?? "");
              if (!key) continue;
              totalCounts.set(key, (totalCounts.get(key) ?? 0) + 1);
            }

            const libraryRepeatCounts = new Map<string, number>();
            for (const w of (libraryWords ?? []) as WordRow[]) {
              const key = normalizeRepeatKey(w.surface);
              if (!key) continue;
              libraryRepeatCounts.set(key, (libraryRepeatCounts.get(key) ?? 0) + 1);
            }

            const normalizedLibrary: Flashcard[] = ((libraryWords ?? []) as WordRow[]).map((w) => {
              const ch = chapterInfoFromRow(w);
              const meaningChoices = asStringArray(w.meaning_choices);

              const safeIdx =
                typeof w.meaning_choice_index === "number" &&
                  w.meaning_choice_index >= 0 &&
                  w.meaning_choice_index < meaningChoices.length
                  ? w.meaning_choice_index
                  : 0;

              const chosenMeaning =
                meaningChoices.length > 0 ? meaningChoices[safeIdx] : w.meaning ?? null;

              const repeatKey = normalizeRepeatKey(w.surface);
              const repeatCount = repeatKey ? (libraryRepeatCounts.get(repeatKey) ?? 1) : 1;

              return {
                id: w.id,
                word: w.surface,
                reading: w.reading ?? null,
                meaning: chosenMeaning ?? w.meaning ?? null,
                jlpt: normalizeJlpt(w.jlpt),
                chapterLabel: ch.label,
                chapterDisplay: ch.display,
                page_number: w.page_number ?? null,
                meaningChoices,
                meaningChoiceIndex: safeIdx,
                repeatKey,
                repeatCount,
                totalCount: repeatKey ? (totalCounts.get(repeatKey) ?? repeatCount ?? 1) : 1,
                kanjiMeta: Array.isArray(w.kanji_meta) ? w.kanji_meta : [],
                isCommon: w.is_common ?? null,
              };
            });

            const dedupedLibraryMap = new Map<string, Flashcard>();
            for (const c of normalizedLibrary) {
              const key = normalizeRepeatKey(c.word);
              if (!key) continue;
              if (!dedupedLibraryMap.has(key)) {
                dedupedLibraryMap.set(key, c);
              }
            }

            setLibraryCards(Array.from(dedupedLibraryMap.values()));
          } else {
            setLibraryCards([]);
          }
        } else {
          setLibraryCards([]);
        }

        const today = new Date().toISOString().slice(0, 10);

        const { data: words, error: wordsErr } = await supabase
          .from("user_book_words")
          .select(
            `
            id,
            user_book_id,
            surface,
            reading,
            meaning,
            jlpt,
            is_common,
            page_number,
            chapter_number,
            chapter_name,
            seen_on,
            created_at,
            meaning_choices,
            meaning_choice_index,
            hidden,
            skipped_on,
            flagged_for_review,
            excluded_from_flashcards,
            flag_note,
            flagged_by_user_id,
            flagged_at,
            reviewed_by_user_id,
            reviewed_at,
            kanji_meta
          `
          )
          .eq("user_book_id", userBookId)
          .eq("hidden", false)
          .eq("excluded_from_flashcards", false)
          .or(`skipped_on.is.null,skipped_on.neq.${today}`)
          .order("page_number", { ascending: true })
          .order("created_at", { ascending: true });

        if (wordsErr) throw wordsErr;

        const repeatCounts = new Map<string, number>();
        for (const w of (words ?? []) as WordRow[]) {
          const key = normalizeRepeatKey(w.surface);
          if (!key) continue;
          repeatCounts.set(key, (repeatCounts.get(key) ?? 0) + 1);
        }

        const normalized: Flashcard[] = ((words ?? []) as WordRow[]).map((w) => {
          const ch = chapterInfoFromRow(w);
          const meaningChoices = asStringArray(w.meaning_choices);

          const safeIdx =
            typeof w.meaning_choice_index === "number" &&
              w.meaning_choice_index >= 0 &&
              w.meaning_choice_index < meaningChoices.length
              ? w.meaning_choice_index
              : 0;

          const chosenMeaning =
            meaningChoices.length > 0 ? meaningChoices[safeIdx] : w.meaning ?? null;

          const repeatKey = normalizeRepeatKey(w.surface);
          const repeatCount = repeatKey ? (repeatCounts.get(repeatKey) ?? 1) : 1;

          return {
            id: w.id,
            word: w.surface,
            reading: w.reading ?? null,
            meaning: chosenMeaning ?? w.meaning ?? null,
            jlpt: normalizeJlpt(w.jlpt),
            chapterLabel: ch.label,
            chapterDisplay: ch.display,
            page_number: w.page_number ?? null,
            meaningChoices,
            meaningChoiceIndex: safeIdx,
            repeatKey,
            repeatCount,
            totalCount: repeatKey ? (totalCounts.get(repeatKey) ?? repeatCount ?? 1) : 1,
            kanjiMeta: Array.isArray(w.kanji_meta) ? w.kanji_meta : [],
            isCommon: w.is_common ?? null,
          };
        });

        const dedupedMap = new Map<string, Flashcard>();
        for (const c of normalized) {
          const key = normalizeRepeatKey(c.word);
          if (!key) continue;
          if (!dedupedMap.has(key)) {
            dedupedMap.set(key, c);
          }
        }

        const deduped = Array.from(dedupedMap.values());
        setCards(deduped);
        setFilteredCards(deduped);

        const map = new Map<string, string>();
        for (const c of deduped) {
          if (!map.has(c.chapterLabel)) map.set(c.chapterLabel, c.chapterDisplay);
        }

        const opts = Array.from(map.entries())
          .map(([value, label]) => ({ value, label }))
          .filter((o) => o.value && o.label);

        opts.sort((a, b) => {
          const anum = a.label.match(/Chapter\s+(\d+)/i)?.[1];
          const bnum = b.label.match(/Chapter\s+(\d+)/i)?.[1];
          if (anum && bnum) return Number(anum) - Number(bnum);
          return a.label.localeCompare(b.label);
        });

        setChapterOptions(opts);

        setStepIndex(0);
        setTypedInput("");
        setTypedFeedback(null);
        setTypeRevealIndex(0);
        setReadyForNextCard(false);
        setLastTypedResult(null);
        setDefError(null);
        setShowDefPicker(false);
      } catch (e: any) {
        setErrorMsg(
          e?.message?.includes("single JSON object")
            ? "You may not have access to this flashcard set (or it no longer exists)."
            : e?.message ?? "Failed to load flashcards"
        );
        setCards([]);
        setFilteredCards([]);
        setLibraryCards([]);
        setChapterOptions([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userBookId]);

  useEffect(() => {
    let result = [...cards];

    const isAllSelected = jlptSelected.length === JLPT_LEVELS.length;
    if (jlptSelected.length > 0 && !isAllSelected) {
      result = result.filter((c) => jlptSelected.includes(c.jlpt));
    }

    if (chapterFilter !== "all") {
      result = result.filter((c) => c.chapterLabel === chapterFilter);
    }

    if (repeatsOnly) {
      result = result.filter((c) => (c.repeatCount ?? 1) >= 2);
    }

    if (studySet === "READING_MC") {
      result = result.filter((c) => !isKanaOnly(c.word));
    }

    setFilteredCards(result);
    setStepIndex(0);
    setTypedInput("");
    setTypedFeedback(null);
    setTypeRevealIndex(0);
    setReadyForNextCard(false);
    setLastTypedResult(null);
    setDefError(null);
    setShowDefPicker(false);
  }, [cards, jlptSelected, chapterFilter, repeatsOnly, studySet]);

  useEffect(() => {
    const order = filteredCards.map((_, i) => i);
    setSessionOrder(studyOnceMode ? shuffleArray(order) : order);
    setSessionIndex(0);
    setStepIndex(0);
    setTypedInput("");
    setTypedFeedback(null);
    setTypeRevealIndex(0);
    setReadyForNextCard(false);
    setLastTypedResult(null);
    setDefError(null);
    setShowDefPicker(false);
    setFirstTouch(true);
  }, [filteredCards, studyOnceMode]);

  useEffect(() => {
    setShowDefPicker(false);
    setDefError(null);
    setTypedInput("");
    setTypedFeedback(null);
    setTypeRevealIndex(0);
    setReadyForNextCard(false);
    setLastTypedResult(null);
    resetMcState();
  }, [sessionIndex]);

  useEffect(() => {
    setStepIndex(0);
    setTypedInput("");
    setTypedFeedback(null);
    setTypeRevealIndex(0);
    setReadyForNextCard(false);
    setLastTypedResult(null);
    resetMcState();
  }, [studySet]);

  function getFirstKana(s: string) {
    const normalized = normalizeReading(s);
    return normalized ? normalized[0] : "";
  }

  function getLastKana(s: string) {
    const normalized = normalizeReading(s);
    return normalized ? normalized[normalized.length - 1] : "";
  }

  function getReadingLength(s: string) {
    return normalizeReading(s).length;
  }

  function buildReadingMcOptions(card: Flashcard, cardsPool: Flashcard[], libraryPool: Flashcard[]) {
    const correct = normalizeReading(card.reading || "");
    if (!correct) return [];

    const pools = [
      cardsPool.filter((c) => c.id !== card.id),
      libraryPool.filter((c) => c.id !== card.id),
    ];

    const seen = new Set<string>();
    const distractors: string[] = [];

    for (const pool of pools) {
      const tier1: string[] = [];
      const tier2: string[] = [];
      const tier3: string[] = [];
      const fallback: string[] = [];

      for (const candidate of pool) {
        const reading = normalizeReading(candidate.reading || "");
        if (!reading || reading === correct || seen.has(reading)) continue;

        if (
          getFirstKana(reading) === getFirstKana(correct) &&
          getLastKana(reading) === getLastKana(correct)
        ) {
          tier1.push(reading);
        } else if (getFirstKana(reading) === getFirstKana(correct)) {
          tier2.push(reading);
        } else if (Math.abs(getReadingLength(reading) - getReadingLength(correct)) <= 1) {
          tier3.push(reading);
        } else {
          fallback.push(reading);
        }
      }

      for (const reading of [...tier1, ...tier2, ...tier3, ...fallback]) {
        if (seen.has(reading)) continue;
        seen.add(reading);
        distractors.push(reading);
        if (distractors.length === 3) break;
      }

      if (distractors.length === 3) break;
    }

    return shuffleArray([correct, ...distractors]);
  }

  function buildMeaningMcOptions(card: Flashcard, cardsPool: Flashcard[], libraryPool: Flashcard[]) {
    const correct = (card.meaning || "").trim();
    if (!correct) return [];

    const pools = [
      cardsPool.filter((c) => c.id !== card.id),
      libraryPool.filter((c) => c.id !== card.id),
    ];

    const seen = new Set<string>([correct.toLowerCase()]);
    const distractors: string[] = [];

    for (const pool of pools) {
      for (const candidate of pool) {
        const meaning = (candidate.meaning || "").trim();
        if (!meaning) continue;

        const key = meaning.toLowerCase();
        if (seen.has(key)) continue;

        seen.add(key);
        distractors.push(meaning);

        if (distractors.length === 3) break;
      }

      if (distractors.length === 3) break;
    }

    return shuffleArray([correct, ...distractors]);
  }

  function countKanji(text: string) {
    return (text.match(/[\p{Script=Han}]/gu) ?? []).length;
  }

  function countKana(text: string) {
    return (text.match(/[ぁ-ゖァ-ヶー]/g) ?? []).length;
  }

  function getOkurigana(text: string) {
    const match = text.match(/[ぁ-ゖァ-ヶー]+$/);
    return match ? match[0] : "";
  }

  function getWordShape(text: string) {
    const kanjiCount = countKanji(text);
    const kanaCount = countKana(text);

    if (kanjiCount > 0 && kanaCount === 0) {
      return `kanji-only-${kanjiCount}`;
    }

    if (kanjiCount > 0 && kanaCount > 0) {
      return `mixed-${kanjiCount}-${kanaCount}`;
    }

    if (kanjiCount === 0 && kanaCount > 0) {
      return `kana-only-${kanaCount}`;
    }

    return "other";
  }

  function buildWordMcOptions(card: Flashcard, cardsPool: Flashcard[], libraryPool: Flashcard[]) {
    const correctWord = (card.word || "").trim();
    const normalizedReading = normalizeReading(card.reading || "");
    if (!correctWord) return [];

    const correctShape = getWordShape(correctWord);
    const correctOkurigana = getOkurigana(correctWord);
    const correctEndingKana = correctOkurigana
      ? normalizeReading(correctOkurigana)
      : normalizedReading
        ? normalizedReading[normalizedReading.length - 1] ?? ""
        : "";

    const pools = [
      cardsPool.filter((c) => c.id !== card.id),
      libraryPool.filter((c) => c.id !== card.id),
    ];

    const seen = new Set<string>([correctWord]);
    const distractors: string[] = [];

    for (const pool of pools) {
      const sameOkurigana: string[] = [];
      const sameEndingKana: string[] = [];
      const sameShape: string[] = [];
      const closeShape: string[] = [];
      const fallback: string[] = [];

      for (const candidate of pool) {
        const candidateWord = (candidate.word || "").trim();
        if (!candidateWord || seen.has(candidateWord)) continue;

        const candidateShape = getWordShape(candidateWord);
        const candidateOkurigana = getOkurigana(candidateWord);
        const candidateReading = normalizeReading(candidate.reading || "");
        const candidateEndingKana = candidateOkurigana
          ? normalizeReading(candidateOkurigana)
          : candidateReading
            ? candidateReading[candidateReading.length - 1] ?? ""
            : "";

        if (correctOkurigana && candidateOkurigana && candidateOkurigana === correctOkurigana) {
          sameOkurigana.push(candidateWord);
        } else if (
          correctEndingKana &&
          candidateEndingKana &&
          candidateEndingKana === correctEndingKana
        ) {
          sameEndingKana.push(candidateWord);
        } else if (candidateShape === correctShape) {
          sameShape.push(candidateWord);
        } else if (
          countKanji(candidateWord) === countKanji(correctWord) &&
          countKana(candidateWord) === countKana(correctWord)
        ) {
          closeShape.push(candidateWord);
        } else {
          fallback.push(candidateWord);
        }
      }

      for (const word of [
        ...sameOkurigana,
        ...sameEndingKana,
        ...sameShape,
        ...closeShape,
        ...fallback,
      ]) {
        if (seen.has(word)) continue;
        seen.add(word);
        distractors.push(word);
        if (distractors.length === 3) break;
      }

      if (distractors.length === 3) break;
    }

    return shuffleArray([correctWord, ...distractors]);
  }

  const currentCardIndex = sessionOrder[sessionIndex] ?? 0;
  const card = filteredCards[currentCardIndex];

  useEffect(() => {
    if (!card || !isMultipleChoiceMode) {
      resetMcState();
      return;
    }

    if (studySet === "READING_MC") {
      const options = buildReadingMcOptions(card, cards, libraryCards);
      setMcOptions(options);
      setMcCorrectAnswer(normalizeReading(card.reading || ""));
      setMcSelected(null);
      setMcAnswered(false);
      setMcWasCorrect(null);
      return;
    }

    if (studySet === "MEANING_MC") {
      const options = buildMeaningMcOptions(card, cards, libraryCards);
      setMcOptions(options);
      setMcCorrectAnswer((card.meaning || "").trim().toLowerCase());
      setMcSelected(null);
      setMcAnswered(false);
      setMcWasCorrect(null);
      return;
    }

    if (studySet === "FROM_READING_MC") {
      const options = buildWordMcOptions(card, cards, libraryCards);
      setMcOptions(options);
      setMcCorrectAnswer((card.word || "").trim());
      setMcSelected(null);
      setMcAnswered(false);
      setMcWasCorrect(null);
      return;
    }

    if (studySet === "FROM_READING_MEANING_MC") {
      const options = buildMeaningMcOptions(card, cards, libraryCards);
      setMcOptions(options);
      setMcCorrectAnswer((card.meaning || "").trim().toLowerCase());
      setMcSelected(null);
      setMcAnswered(false);
      setMcWasCorrect(null);
      return;
    }

    resetMcState();
  }, [card, isMultipleChoiceMode, studySet, cards, libraryCards]);

  useEffect(() => {
    if (!isMultipleChoiceMode) return;
    if (
      studySet !== "READING_MC" &&
      studySet !== "MEANING_MC" &&
      studySet !== "FROM_READING_MC" &&
      studySet !== "FROM_READING_MEANING_MC"
    ) return;
    if (!mcAnswered || !mcWasCorrect) return;

    const timer = window.setTimeout(() => {
      goToNextWord("correct");
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isMultipleChoiceMode, studySet, mcAnswered, mcWasCorrect]);

  async function logStudyEvent(result: "revealed" | "correct" | "wrong") {
    if (!card || !meId) return;

    const unifiedResult =
      result === "correct"
        ? "correct"
        : result === "wrong"
          ? "incorrect"
          : "reviewed";

    const isCorrect =
      result === "correct"
        ? true
        : result === "wrong"
          ? false
          : null;

    const { error: oldLogError } = await supabase.from("study_logs").insert([
      {
        user_id: meId,
        user_book_id: userBookId,
        user_book_word_id: card.id,
        study_mode: typeModeEnabled ? "type" : "flashcard",
        step_mode: studySet,
        result,
      },
    ]);

    if (oldLogError) {
      console.error("Error writing old study log:", oldLogError);
    }

    const newLogResult = await recordStudyEvent({
      userBookId,
      userBookWordId: card.id,
      studyMode: "study_flashcards",
      cardType: studySet,
      result: unifiedResult,
      isCorrect,
      surface: card.word ?? null,
      reading: card.reading ?? null,
      meaning: card.meaning ?? null,
    });

    if (!newLogResult.ok) {
      console.error("Error writing unified study event:", newLogResult.error);
    }
  }

  async function goToNextWord(result: "revealed" | "correct" | "wrong" = "revealed") {
    if (filteredCards.length === 0 || !card) return;

    await logStudyEvent(result);

    if (studyOnceMode) {
      if (sessionIndex + 1 >= sessionOrder.length) {
        setSessionIndex(sessionOrder.length);
      } else {
        setSessionIndex((prev) => prev + 1);
      }
    } else {
      setSessionIndex(Math.floor(Math.random() * filteredCards.length));
    }

    setStepIndex(0);
    setTypedInput("");
    setTypedFeedback(null);
    setTypeRevealIndex(0);
    setReadyForNextCard(false);
    setLastTypedResult(null);
    setDefError(null);
    setShowDefPicker(false);
    resetMcState();
  }

  function goToPrevWord() {
    if (filteredCards.length === 0) return;

    if (studyOnceMode) {
      if (sessionIndex === 0) return;
      setSessionIndex((prev) => Math.max(prev - 1, 0));
    } else {
      setSessionIndex(Math.floor(Math.random() * filteredCards.length));
    }

    setStepIndex(Math.max(steps.length - 1, 0));
    setTypedInput("");
    setTypedFeedback(null);
    setTypeRevealIndex(0);
    setReadyForNextCard(false);
    setLastTypedResult(null);
    setDefError(null);
    setShowDefPicker(false);
    resetMcState();
  }

  function resetMcState() {
    setMcOptions([]);
    setMcSelected(null);
    setMcCorrectAnswer(null);
    setMcAnswered(false);
    setMcWasCorrect(null);
  }

  async function skipCardForToday(cardId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from("user_book_words")
      .update({ skipped_on: today })
      .eq("id", cardId);

    if (error) {
      console.error("Error skipping card for today:", error);
      return;
    }

    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setFilteredCards((prev) => prev.filter((c) => c.id !== cardId));
  }

  async function flagCardForReview(cardId: string) {
    const { error } = await supabase
      .from("user_book_words")
      .update({
        flagged_for_review: true,
        excluded_from_flashcards: true,
        flagged_by_user_id: meId || null,
        flagged_at: new Date().toISOString(),
      })
      .eq("id", cardId);

    if (error) {
      console.error("Error flagging card for review:", error);
      return;
    }

    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setFilteredCards((prev) => prev.filter((c) => c.id !== cardId));
    setLibraryCards((prev) => prev.filter((c) => c.id !== cardId));
  }

  async function hideCardPermanently(cardId: string) {
    const { error } = await supabase
      .from("user_book_words")
      .update({ hidden: true })
      .eq("id", cardId);

    if (error) {
      console.error("Error hiding card:", error);
      return;
    }

    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setFilteredCards((prev) => prev.filter((c) => c.id !== cardId));
  }

  function nextCardReveal() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
      return;
    }
    return goToNextWord();
  }

  function prevCardReveal() {
    if (stepIndex > 0) {
      setStepIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    return goToPrevWord();
  }

  function checkTypedAnswer() {
    if (!typeModeEnabled || !card) return;

    const userAnsRaw = typedInput.trim();
    const userAns = kataToHira(userAnsRaw);

    if (studySet === "READING") {
      const correctReading = card.reading ?? "";
      const normalizedCorrect = normalizeReading(correctReading);
      const normalizedUser = normalizeReading(userAnsRaw);

      const ok =
        !!correctReading &&
        isKanaOnly(userAnsRaw) &&
        normalizedUser === normalizedCorrect;

      if (ok) {
        setTypedFeedback({ ok: true, message: "You got it!" });
        setLastTypedResult("correct");

        window.setTimeout(() => {
          goToNextWord("correct");
        }, 500);

        return;
      }

      setTypedInput("");
      setInputResetKey((k) => k + 1);
      setTypedFeedback({
        ok: false,
        message: `Correct: ${correctReading}`,
      });
      setLastTypedResult("wrong");
      setReadyForNextCard(false);
      return;
    }

    if (studySet === "MEANING") {
      const u = normalizeMeaning(userAns);
      const possible = [card.meaning, ...(card.meaningChoices ?? [])]
        .filter(Boolean)
        .map((x) => normalizeMeaning(String(x)));

      const ok = u.length > 0 && possible.some((m) => m.includes(u) || u.includes(m));

      if (ok) {
        setTypedFeedback({
          ok: true,
          message: `Correct: ${card.meaning || "—"}`,
        });
        setTypeRevealIndex(steps.length - 1);
        setLastTypedResult("correct");
        setReadyForNextCard(false);

        window.setTimeout(() => {
          goToNextWord("correct");
        }, 1800);

        return;
      }

      setTypedFeedback({
        ok: false,
        message: `Correct: ${card.meaning || "—"}`,
      });
      setTypeRevealIndex(steps.length - 1);
      setLastTypedResult("wrong");
      setReadyForNextCard(false);
      return;
    }

    if (studySet === "FROM_READING_MEANING") {
      const u = normalizeMeaning(userAnsRaw);
      const possible = [card.meaning, ...(card.meaningChoices ?? [])]
        .filter(Boolean)
        .map((x) => normalizeMeaning(String(x)));

      const ok = u.length > 0 && possible.some((m) => m.includes(u) || u.includes(m));

      if (ok) {
        setTypedFeedback({
          ok: true,
          message: `Correct: ${card.meaning || "—"}`,
        });
        setTypeRevealIndex(steps.length - 1);
        setLastTypedResult("correct");
        setReadyForNextCard(false);

        window.setTimeout(() => {
          goToNextWord("correct");
        }, 1200);

        return;
      }

      setTypedFeedback({
        ok: false,
        message: `Correct: ${card.meaning || "—"}`,
      });
      setTypeRevealIndex(steps.length - 1);
      setLastTypedResult("wrong");
      setReadyForNextCard(false);
      return;
    }

    const wordOk = userAnsRaw === (card.word ?? "").trim();

    const u = normalizeMeaning(userAns);
    const possibleMeanings = [card.meaning, ...(card.meaningChoices ?? [])]
      .filter(Boolean)
      .map((x) => normalizeMeaning(String(x)));

    const meaningOk =
      u.length > 0 && possibleMeanings.some((m) => m.includes(u) || u.includes(m));

    if (wordOk || meaningOk) {
      setTypedInput("");
      setTypedFeedback({
        ok: true,
        message: "You got it!",
      });
      setTypeRevealIndex(steps.length - 1);
      setLastTypedResult("correct");
      setReadyForNextCard(true);
      return;
    }

    const typedAsAnotherCard = cards.find((c) => c.word === userAnsRaw && c.id !== card.id);

    if (
      typedAsAnotherCard &&
      normalizeReading(typedAsAnotherCard.reading || "") === normalizeReading(card.reading || "")
    ) {
      setTypedInput("");
      setTypedFeedback({
        ok: true,
        message: `You're right! They are homophones! This was our word: ${card.word}`,
      });
      setTypeRevealIndex(steps.length - 1);
      setLastTypedResult("correct");
      setReadyForNextCard(true);
      return;
    }

    setTypedInput("");
    setTypedFeedback({
      ok: false,
      message: "Let's keep trying!",
    });
    setTypeRevealIndex(steps.length - 1);
    setLastTypedResult("wrong");
    setReadyForNextCard(true);
  }

  function handleMcAnswer(selected: string) {
    if (!card || !mcCorrectAnswer || mcAnswered) return;

    let isCorrect = false;

    if (studySet === "READING_MC") {
      isCorrect = normalizeReading(selected) === mcCorrectAnswer;
    } else if (studySet === "MEANING_MC") {
      isCorrect = selected.trim().toLowerCase() === mcCorrectAnswer;
    } else if (studySet === "FROM_READING_MC") {
      isCorrect = selected.trim() === mcCorrectAnswer;
    } else if (studySet === "FROM_READING_MEANING_MC") {
      isCorrect = selected.trim().toLowerCase() === mcCorrectAnswer;
    }

    setMcSelected(selected);
    setMcAnswered(true);
    setMcWasCorrect(isCorrect);
  }

  function flip() {
    if (firstTouch) setFirstTouch(false);
    if (typeModeEnabled) return;
    nextCardReveal();
  }

  async function setDefinitionForCurrent(newIndex: number) {
    if (!card) return;
    if (!card.meaningChoices?.length) return;

    const safe = Math.max(0, Math.min(newIndex, card.meaningChoices.length - 1));
    const chosen = card.meaningChoices[safe] ?? "";

    setDefSaving(true);
    setDefError(null);

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({
          meaning_choice_index: safe,
          meaning: chosen || null,
        })
        .eq("id", card.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      setCards((prev) =>
        prev.map((x) =>
          x.id === card.id
            ? { ...x, meaningChoiceIndex: safe, meaning: chosen || x.meaning }
            : x
        )
      );

      setFilteredCards((prev) =>
        prev.map((x) =>
          x.id === card.id
            ? { ...x, meaningChoiceIndex: safe, meaning: chosen || x.meaning }
            : x
        )
      );

      setTypedInput("");
      setTypedFeedback(null);
      setReadyForNextCard(false);
      setLastTypedResult(null);
    } catch (e: any) {
      setDefError(e?.message ?? "Failed to change definition");
    } finally {
      setDefSaving(false);
    }
  }

  const showWrongNextButton =
    ((studySet === "MEANING" || studySet === "FROM_READING_MEANING") &&
      typedFeedback &&
      !typedFeedback.ok) ||
    (isMultipleChoiceMode && mcAnswered && !mcWasCorrect);

  const currentTypeAnswerField =
    typeModeEnabled
      ? studySet === "READING"
        ? "reading"
        : studySet === "MEANING"
          ? "meaning"
          : studySet === "FROM_READING_MEANING"
            ? "meaning"
            : null
      : null;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (typeModeEnabled) {
        if (e.key === "Enter") {
          e.preventDefault();

          if (readyForNextCard) {
            goToNextWord(lastTypedResult ?? "revealed");
            return;
          }

          checkTypedAnswer();
          return;
        }

        if (e.key === "ArrowRight") {
          e.preventDefault();
          goToNextWord(readyForNextCard ? lastTypedResult ?? "revealed" : "revealed");
          return;
        }

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goToPrevWord();
          return;
        }

        return;
      }

      if (e.key === "ArrowRight") nextCardReveal();
      if (e.key === "ArrowLeft") prevCardReveal();
      if (e.key === " ") {
        e.preventDefault();
        nextCardReveal();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    typeModeEnabled,
    stepIndex,
    typeRevealIndex,
    filteredCards,
    sessionIndex,
    studyOnceMode,
    steps,
    readyForNextCard,
    lastTypedResult,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-500">Loading flashcards…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">You need to sign in to see your book flashcards.</p>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-700">{errorMsg}</p>
      </main>
    );
  }

  if (filteredCards.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p>No words match your filters (or none have been added to this book yet).</p>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setJlptSelected([]);
              setChapterFilter("all");
              setRepeatsOnly(false);
            }}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Clear Filters
          </button>
        </div>
      </main>
    );
  }

  if (studyOnceMode && sessionIndex >= sessionOrder.length) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl border rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Nice work!</h1>
          <p className="mt-3 text-gray-700">You reviewed each word once.</p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.push(`/books/${userBookId}/words`)}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
            >
              Go to Vocab List
            </button>

            <button
              onClick={() => {
                const newOrder = shuffleArray(filteredCards.map((_, i) => i));
                setSessionOrder(newOrder);
                setSessionIndex(0);
                setStepIndex(0);
                setTypedInput("");
                setTypedFeedback(null);
                setTypeRevealIndex(0);
                setReadyForNextCard(false);
                setLastTypedResult(null);
                setFirstTouch(true);
              }}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Study Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const showWord =
    steps.indexOf("word") === -1 ? false : stepIndex >= steps.indexOf("word");

  const showReading =
    steps.indexOf("reading") === -1 ? false : stepIndex >= steps.indexOf("reading");

  const showMeaning =
    steps.indexOf("meaning") === -1 ? false : stepIndex >= steps.indexOf("meaning");

  function Row({
    label,
    value,
    visible,
    big,
    placeholder = "—",
  }: {
    label: string;
    value: string;
    visible: boolean;
    big?: boolean;
    placeholder?: string;
  }) {
    return (
      <div className="w-full flex flex-col items-center gap-1">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div
          className={[
            big ? "text-[2rem] font-bold sm:text-[2.3rem]" : "text-[1.25rem] sm:text-[1.45rem]",
            "transition-opacity duration-200",
            visible ? "opacity-100 text-slate-900" : "opacity-70 text-slate-300",
          ].join(" ")}
        >
          {visible ? value : placeholder}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-4 bg-slate-100 sm:px-6">
      <div className="w-full max-w-3xl mb-3 flex flex-col items-center justify-center gap-3 md:flex-row md:items-center md:gap-2">
        <div className="flex flex-col items-center shrink-0">
          {bookCover ? (
            <img src={bookCover} alt="" className="w-24 h-32 rounded mb-2 object-cover" />
          ) : null}
          <h1 className="text-2xl font-semibold text-center">{bookTitle}</h1>
        </div>

        <div className="w-full max-w-md">
          <p className="text-sm text-gray-500 text-left leading-6">
            Review the words from this book in a simple, random study session. Each word appears once per session.
          </p>
        </div>
      </div>

      <div className="mb-2 w-full max-w-2xl space-y-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Session Progress
              </p>
              <p className="text-base font-semibold text-slate-800">
                Card {Math.min(sessionIndex + 1, Math.max(sessionOrder.length, 1))}/
                {studyOnceMode ? sessionOrder.length : filteredCards.length}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Cards Left
              </p>
              <p className="text-base font-semibold text-slate-800">
                {Math.max(
                  (studyOnceMode ? sessionOrder.length : filteredCards.length) - sessionIndex,
                  0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-2 w-full max-w-2xl space-y-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {JLPT_LEVELS.map((lvl) => {
                const checkedLvl = jlptSelected.includes(lvl);

                return (
                  <label
                    key={lvl}
                    className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={checkedLvl}
                      onChange={() =>
                        setJlptSelected((prev) =>
                          checkedLvl ? prev.filter((x) => x !== lvl) : [...prev, lvl]
                        )
                      }
                    />
                    {lvl}
                  </label>
                );
              })}

              <button
                type="button"
                onClick={() => setJlptSelected([...JLPT_LEVELS])}
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-300"
              >
                All
              </button>

              <button
                type="button"
                onClick={() => setJlptSelected([])}
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={chapterFilter}
                onChange={(e) => setChapterFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All Chapters</option>
                {chapterOptions.map((ch) => (
                  <option key={ch.value} value={ch.value}>
                    {ch.label}
                  </option>
                ))}
              </select>

              <label
                className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                title="Show only words that appear 2+ times in this book"
              >
                <input
                  type="checkbox"
                  checked={repeatsOnly}
                  onChange={() => setRepeatsOnly((v) => !v)}
                />
                Repeats only
              </label>
            </div>
          </div>
        </div>
      </div>

      <div
        onClick={isMultipleChoiceMode ? undefined : flip}
        className="
          relative
          w-full max-w-2xl
          min-h-[30vh] sm:min-h-[36vh]
          bg-white rounded-2xl
          border border-slate-500
          shadow-2xl
          flex items-center justify-center
          cursor-pointer text-center select-none
          p-6
        "
      >
        <div className="absolute top-3 left-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
          <div className="text-xs font-medium leading-none">
            {card?.jlpt ?? "NON-JLPT"}
          </div>
        </div>

        <div className="absolute top-3 right-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
          <div className="text-xs font-medium leading-none">
            Def #{((card?.meaningChoiceIndex ?? 0) as number) + 1}
          </div>
        </div>

        <div className="w-full flex flex-col items-center justify-center gap-3">
          {isMultipleChoiceMode &&
            (
              studySet === "READING_MC" ||
              studySet === "MEANING_MC" ||
              studySet === "FROM_READING_MC" ||
              studySet === "FROM_READING_MEANING_MC"
            ) &&
            card ? (
            <>
              {(studySet === "READING_MC" || studySet === "MEANING_MC") ? (
                <>
                  <Row label="Word" value={card.word} visible big placeholder="---" />
                  {studySet === "READING_MC" ? (
                    <Row label="Meaning" value={card.meaning || "—"} visible placeholder="---" />
                  ) : (
                    <Row label="Reading" value={card.reading || "—"} visible placeholder="---" />
                  )}
                </>
              ) : studySet === "FROM_READING_MC" ? (
                <>
                  <Row label="Reading" value={card.reading || "—"} visible big placeholder="---" />
                  <Row label="Meaning" value={card.meaning || "—"} visible placeholder="---" />
                </>
              ) : (
                <>
                  <Row label="Reading" value={card.reading || "—"} visible big placeholder="---" />
                </>
              )}

              <div className="w-full max-w-md pt-2">
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  {studySet === "READING_MC"
                    ? "Choose the Reading"
                    : studySet === "MEANING_MC"
                      ? "Choose the Meaning"
                      : studySet === "FROM_READING_MC"
                        ? "Choose the Kanji"
                        : "Choose the Meaning"}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {mcOptions.map((option) => {
                    const isSelected = mcSelected === option;
                    const isCorrect =
                      mcAnswered &&
                      (
                        studySet === "READING_MC"
                          ? normalizeReading(option) === mcCorrectAnswer
                          : studySet === "FROM_READING_MC"
                            ? option.trim() === mcCorrectAnswer
                            : option.trim().toLowerCase() === mcCorrectAnswer
                      );
                    const isWrongSelected = mcAnswered && isSelected && !isCorrect;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMcAnswer(option);
                        }}
                        disabled={mcAnswered}
                        className={[
                          "rounded-xl border px-3 py-3 text-sm font-medium transition",
                          isCorrect
                            ? "border-green-600 bg-green-50 text-green-800"
                            : isWrongSelected
                              ? "border-red-600 bg-red-50 text-red-800"
                              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                          mcAnswered ? "cursor-default" : "",
                        ].join(" ")}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {mcAnswered ? (
                  <div className="mt-3 w-full">
                    <p className={`text-sm ${mcWasCorrect ? "text-green-700" : "text-red-700"}`}>
                      {mcWasCorrect
                        ? "✅ You got it!"
                        : `❌ Not quite. Correct answer: ${studySet === "READING_MC"
                          ? card.reading || "—"
                          : studySet === "MEANING_MC"
                            ? card.meaning || "—"
                            : studySet === "FROM_READING_MC"
                              ? card.word || "—"
                              : card.meaning || "—"
                        }`}
                    </p>

                    {!mcWasCorrect ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToNextWord("wrong");
                        }}
                        className="mt-3 rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-gray-300"
                      >
                        Next
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : typeModeEnabled && card ? (
            <>
              <Row
                label="Word"
                value={card.word}
                visible={
                  studySet === "READING" ||
                  studySet === "MEANING" ||
                  (studySet === "FROM_READING_MEANING" && typedFeedback != null)
                }
                big
                placeholder="---"
              />

              <Row
                label="Reading"
                value={card.reading || "—"}
                visible={
                  studySet === "MEANING" ||
                  studySet === "FROM_READING_MEANING"
                }
                placeholder="---"
              />

              <Row
                label="Meaning"
                value={card.meaning || "—"}
                visible={studySet === "READING"}
                placeholder="---"
              />

              {currentTypeAnswerField ? (
                <div className="w-full max-w-md">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                    Type{" "}
                    {studySet === "READING"
                      ? "Reading"
                      : studySet === "MEANING"
                        ? "Meaning"
                        : studySet === "FROM_READING_MEANING"
                          ? "Meaning"
                          : "Answer"}
                  </div>

                  {studySet === "READING" ? (
                    <p className="mb-2 text-xs text-gray-500">
                      Reading quizzes can be answered in hiragana or katakana.
                    </p>
                  ) : null}

                  <div className="flex gap-2">
                    <input
                      key={`${studySet}-${sessionIndex}-${typeRevealIndex}-${inputResetKey}`}
                      type="text"
                      value={typedInput}
                      onChange={(e) => {
                        setTypedInput(e.target.value);

                        if (!typedFeedback) {
                          setLastTypedResult(null);
                        } else if (studySet === "READING" && typedFeedback && typedFeedback.ok) {
                          setTypedFeedback(null);
                          setLastTypedResult(null);
                        }

                        setReadyForNextCard(false);
                      }}

                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();

                          if (readyForNextCard) {
                            goToNextWord(lastTypedResult ?? "revealed");
                            return;
                          }

                          checkTypedAnswer();
                        }
                      }}
                      inputMode="text"
                      lang={studySet === "READING" ? "ja" : undefined}
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      autoFocus
                      className="border p-2 rounded w-full"
                      placeholder={
                        readyForNextCard
                          ? "Press Enter for next card"
                          : studySet === "READING"
                            ? "かなで入力（ひらがな・カタカナどちらでもOK）"
                            : studySet === "MEANING"
                              ? "Type a meaning"
                              : studySet === "FROM_READING_MEANING"
                                ? "Type a meaning"
                                : "Type your answer"
                      }
                    />
                  </div>

                  {typedFeedback ? (
                    <div className={`mt-2 text-sm ${typedFeedback.ok ? "text-green-700" : "text-red-700"}`}>
                      <p>
                        {typedFeedback.ok ? "✅ " : "❌ "}
                        {typedFeedback.message}
                      </p>

                      {!typedFeedback.ok && studySet === "READING" ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Type the correct reading to continue.
                        </p>
                      ) : null}

                      {!typedFeedback.ok &&
                        (studySet === "MEANING" || studySet === "FROM_READING_MEANING") ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToNextWord("wrong");
                          }}
                          className="mt-3 rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-gray-300"
                        >
                          Next
                        </button>
                      ) : null}

                    </div>
                  ) : null}
                </div>
              ) : null}
            </>

          ) : card ? (
            <>
              <Row label="Word" value={card.word} visible={showWord} big placeholder="---" />
              <Row
                label="Reading"
                value={card.reading || "—"}
                visible={showReading}
                placeholder="---"
              />
              <Row
                label="Meaning"
                value={card.meaning || "—"}
                visible={showMeaning}
                placeholder="---"
              />
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-2 w-full max-w-2xl space-y-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                Study Mode
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={studySet}
                  onChange={(e) => setStudySet(e.target.value as StudySet)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="READING">{studySetLabel("READING")}</option>
                  <option value="MEANING">{studySetLabel("MEANING")}</option>
                  <option value="FROM_READING_MEANING">{studySetLabel("FROM_READING_MEANING")}</option>

                  <option disabled>──────────</option>

                  <option value="READING_MC">{studySetLabel("READING_MC")}</option>
                  <option value="MEANING_MC">{studySetLabel("MEANING_MC")}</option>
                  <option value="FROM_READING_MC">{studySetLabel("FROM_READING_MC")}</option>
                  <option value="FROM_READING_MEANING_MC">
                    {studySetLabel("FROM_READING_MEANING_MC")}
                  </option>

                  <option disabled>──────────</option>

                  <option value="COMPLETE">{studySetLabel("COMPLETE")}</option>
                </select>
              </div>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                {studySet === "READING" && "Show word + meaning → type the reading"}
                {studySet === "MEANING" && "Show word + reading → type the meaning"}
                {studySet === "FROM_READING_MEANING" && "Show reading → type the meaning"}
                {studySet === "READING_MC" && "Show word + meaning → choose the reading"}
                {studySet === "MEANING_MC" && "Show word + reading → choose the meaning"}
                {studySet === "FROM_READING_MC" && "Show reading + meaning → choose the kanji"}
                {studySet === "FROM_READING_MEANING_MC" && "Show reading → choose the meaning"}
                {studySet === "COMPLETE" && "Tap and reveal only — no typing"}
              </p>
            </div>

            <div className="md:w-[220px] space-y-2">
              <button
                onClick={() => {
                  if (!card) return;
                  flagCardForReview(card.id);
                }}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition"
              >
                <div className="leading-tight">Flag</div>
                <div className="text-[10px] font-normal text-amber-700">
                  Problem card
                </div>
              </button>

              <button
                onClick={() => {
                  if (!card) return;
                  hideCardPermanently(card.id);
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                <div className="leading-tight">Hide</div>
                <div className="text-[10px] font-normal text-slate-500">
                  I know this word
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {isMultipleChoiceMode
              ? mcAnswered
                ? mcWasCorrect
                  ? "Moving to next card..."
                  : "Choose Next below to continue"
                : studySet === "READING_MC"
                  ? "Choose the correct reading"
                  : studySet === "MEANING_MC"
                    ? "Choose the correct meaning"
                    : studySet === "FROM_READING_MC"
                      ? "Choose the correct kanji"
                      : "Choose the correct meaning"
              : typeModeEnabled
                ? "Press Enter to check."
                : stepIndex === 0
                  ? "Tap once to reveal"
                  : "Tap again for the next word"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => router.push(`/books/${userBookId}/words`)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Vocab List
          </button>

          <button
            onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Book Hub
          </button>
        </div>
      </div>
    </main>
  );
}