// Vocab Flashcards
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type StudySet = "READING" | "MEANING" | "FROM_READING" | "COMPLETE";
type StepField = "word" | "reading" | "meaning";

function studySetLabel(s: StudySet) {
  switch (s) {
    case "READING":
      return "Reading";
    case "MEANING":
      return "Meaning";
    case "FROM_READING":
      return "From Reading";
    case "COMPLETE":
      return "Complete Word";
    default:
      return "Reading";
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

function kataToHira(s: string) {
  return (s ?? "").replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
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
        return ["word", "meaning", "reading"];
      case "MEANING":
        return ["word", "reading", "meaning"];
      case "FROM_READING":
        return ["reading", "word", "meaning"];
      case "COMPLETE":
        return ["word", "reading", "meaning"];
      default:
        return ["word", "meaning", "reading"];
    }
  }, [studySet]);

  const [typeMode, setTypeMode] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [typedFeedback, setTypedFeedback] = useState<null | { ok: boolean; message: string }>(null);
  const [typeRevealIndex, setTypeRevealIndex] = useState(0);
  const [readyForNextCard, setReadyForNextCard] = useState(false);
  const [lastTypedResult, setLastTypedResult] = useState<"revealed" | "correct" | "wrong" | null>(null);

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

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const typeModeEnabled = typeMode && steps.length >= 2;

  useEffect(() => {
    if (!userBookId) return;

    try {
      const raw = localStorage.getItem(settingsKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed?.studySet) setStudySet(parsed.studySet as StudySet);
      if (typeof parsed?.typeMode === "boolean") setTypeMode(parsed.typeMode);
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
          typeMode,
          studyOnceMode,
          jlptSelected,
          chapterFilter,
          repeatsOnly,
        })
      );
    } catch { }
  }, [
    settingsKey,
    userBookId,
    studySet,
    typeMode,
    studyOnceMode,
    jlptSelected,
    chapterFilter,
    repeatsOnly,
  ]);

  useEffect(() => {
    if (steps.length < 2 && typeMode) {
      setTypeMode(false);
      setTypedInput("");
      setTypedFeedback(null);
      setTypeRevealIndex(0);
      setReadyForNextCard(false);
      setLastTypedResult(null);
    }
  }, [steps.length, typeMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;

    setVoiceSupported(supported);
  }, []);

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
              .select("surface")
              .in("user_book_id", ownedBookIds)
              .eq("hidden", false);

            if (libraryWordsErr) throw libraryWordsErr;

            for (const w of libraryWords ?? []) {
              const key = normalizeRepeatKey((w as any).surface ?? "");
              if (!key) continue;
              totalCounts.set(key, (totalCounts.get(key) ?? 0) + 1);
            }
          }
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
            kanji_meta
          `
          )
          .eq("user_book_id", userBookId)
          .eq("hidden", false)
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
            meaningChoices.length > 0
              ? meaningChoices[safeIdx]
              : w.meaning ?? null;

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
        setVoiceError(null);
      } catch (e: any) {
        setErrorMsg(
          e?.message?.includes("single JSON object")
            ? "You may not have access to this flashcard set (or it no longer exists)."
            : e?.message ?? "Failed to load flashcards"
        );
        setCards([]);
        setFilteredCards([]);
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

    setFilteredCards(result);
    setStepIndex(0);
    setTypedInput("");
    setTypedFeedback(null);
    setTypeRevealIndex(0);
    setReadyForNextCard(false);
    setLastTypedResult(null);
    setDefError(null);
    setShowDefPicker(false);
    setVoiceError(null);
  }, [cards, jlptSelected, chapterFilter, repeatsOnly]);

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
    setVoiceError(null);
    setFirstTouch(true);
  }, [filteredCards, studyOnceMode]);

  useEffect(() => {
    setShowDefPicker(false);
    setDefError(null);
    setVoiceError(null);
    setTypedInput("");
    setTypedFeedback(null);
    setTypeRevealIndex(0);
    setReadyForNextCard(false);
    setLastTypedResult(null);
  }, [sessionIndex]);

  useEffect(() => {
    setStepIndex(0);
    setTypedInput("");
    setTypedFeedback(null);
    setTypeRevealIndex(0);
    setReadyForNextCard(false);
    setLastTypedResult(null);
    setVoiceError(null);
  }, [studySet]);

  function getFieldValue(field: StepField, c: Flashcard) {
    if (field === "word") return c.word || "";
    if (field === "reading") return c.reading || "";
    return c.meaning || "";
  }

  const currentCardIndex = sessionOrder[sessionIndex] ?? 0;
  const card = filteredCards[currentCardIndex];

  async function logStudyEvent(result: "revealed" | "correct" | "wrong") {
    if (!card || !meId) return;

    await supabase.from("study_logs").insert([
      {
        user_id: meId,
        user_book_id: userBookId,
        user_book_word_id: card.id,
        study_mode: typeModeEnabled ? "type" : "flashcard",
        step_mode: studySet,
        result,
      },
    ]);
  }

  async function goToNextWord(
    result: "revealed" | "correct" | "wrong" = "revealed"
  ) {
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
    setVoiceError(null);
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
    setVoiceError(null);
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
    if (stepIndex < 1) {
      setStepIndex(1);
      return;
    }
    return goToNextWord();
  }

  function prevCardReveal() {
    if (stepIndex > 0) {
      setStepIndex(0);
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
      const ok =
        !!correctReading &&
        isKanaOnly(userAnsRaw) &&
        normalizeReading(userAnsRaw) === normalizeReading(correctReading);

      setTypedInput("");
      setTypedFeedback({
        ok,
        message: ok ? "You got it!" : "Let's keep trying!",
      });
      setTypeRevealIndex(steps.length - 1);
      setLastTypedResult(ok ? "correct" : "wrong");
      setReadyForNextCard(true);
      return;
    }

    if (studySet === "MEANING") {
      const u = normalizeMeaning(userAns);
      const possible = [card.meaning, ...(card.meaningChoices ?? [])]
        .filter(Boolean)
        .map((x) => normalizeMeaning(String(x)));

      const ok = u.length > 0 && possible.some((m) => m.includes(u) || u.includes(m));

      setTypedInput("");
      setTypedFeedback({
        ok,
        message: ok ? "You got it!" : "Let's keep trying!",
      });
      setTypeRevealIndex(steps.length - 1);
      setLastTypedResult(ok ? "correct" : "wrong");
      setReadyForNextCard(true);
      return;
    }

    if (studySet === "COMPLETE") {
      // Step 1: reading
      if (typeRevealIndex === 0) {
        const correctReading = card.reading ?? "";
        const ok =
          !!correctReading &&
          isKanaOnly(userAnsRaw) &&
          normalizeReading(userAnsRaw) === normalizeReading(correctReading);

        setTypedInput("");
        setTypedFeedback({
          ok,
          message: ok ? "Good. Now the meaning." : "Let's reveal the reading, then do the meaning.",
        });
        setTypeRevealIndex(1);
        setLastTypedResult(ok ? null : "wrong");
        setReadyForNextCard(false);
        return;
      }

      // Step 2: meaning
      const u = normalizeMeaning(userAnsRaw);
      const possible = [card.meaning, ...(card.meaningChoices ?? [])]
        .filter(Boolean)
        .map((x) => normalizeMeaning(String(x)));

      const ok = u.length > 0 && possible.some((m) => m.includes(u) || u.includes(m));
      const finalResult = lastTypedResult === "wrong" || !ok ? "wrong" : "correct";

      setTypedInput("");
      setTypedFeedback({
        ok,
        message: ok ? "You got it!" : "Let's keep trying!",
      });
      setTypeRevealIndex(2);
      setLastTypedResult(finalResult);
      setReadyForNextCard(true);
      return;
    }

    // FROM_READING: accept either the exact word OR a matching meaning
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

    // Homophone check: if they typed another vocab word with the same reading
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

  const currentTypeAnswerField =
    typeModeEnabled
      ? studySet === "READING"
        ? "reading"
        : studySet === "MEANING"
          ? "meaning"
          : studySet === "FROM_READING"
            ? "word_or_meaning"
            : studySet === "COMPLETE"
              ? typeRevealIndex === 0
                ? "reading"
                : typeRevealIndex === 1
                  ? "meaning"
                  : null
              : null
      : null;

  function startVoiceInput() {
    if (typeof window === "undefined") return;
    if (studySet !== "MEANING") return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceError("Voice input is not supported in this browser.");
      return;
    }

    setVoiceError(null);

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setVoiceError(
        event?.error ? `Voice input error: ${event.error}` : "Voice input failed."
      );
    };

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ?? "";
      setTypedInput(transcript);
      setTypedFeedback(null);
      setReadyForNextCard(false);
      setLastTypedResult(null);
    };

    recognition.start();
  }

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
    studySet === "READING"
      ? true
      : studySet === "MEANING"
        ? true
        : stepIndex >= 1;

  const showReading =
    studySet === "READING"
      ? stepIndex >= 1
      : studySet === "MEANING"
        ? true
        : true;

  const showMeaning =
    studySet === "READING"
      ? true
      : studySet === "MEANING"
        ? stepIndex >= 1
        : stepIndex >= 1;

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
    <main className="min-h-screen flex flex-col items-center px-6 py-4 bg-slate-100">
      <div className="w-full max-w-5xl mb-1 flex flex-col md:flex-row items-center md:items-start justify-center gap-8">
        <div className="flex flex-col items-center shrink-0">
          {bookCover ? (
            <img src={bookCover} alt="" className="w-24 h-32 rounded mb-2 object-cover" />
          ) : null}
          <h1 className="text-2xl font-semibold text-center">{bookTitle}</h1>
        </div>

        <div className="w-full md:w-[460px] md:mt-6 md:ml-4">
          <p className="text-base text-gray-500 text-left leading-8">
            Review the words from this book in a simple, random study session. Each word appears once per session.
          </p>
        </div>
      </div>

      <div className="w-full max-w-6xl mb-3 flex flex-col items-center gap-2">
        <div className="w-full flex flex-col items-center gap-1">
          <div className="text-sm font-medium text-gray-700">Study Mode</div>

          <div className="flex flex-wrap justify-center gap-2">
            <select
              value={studySet}
              onChange={(e) => setStudySet(e.target.value as StudySet)}
              className="px-2 py-1 border rounded text-sm bg-white"
            >
              <option value="READING">{studySetLabel("READING")}</option>
              <option value="MEANING">{studySetLabel("MEANING")}</option>
              <option value="FROM_READING">{studySetLabel("FROM_READING")}</option>
              <option value="COMPLETE">{studySetLabel("COMPLETE")}</option>
            </select>

            <label
              className={`flex items-center gap-2 text-sm px-2 py-1 border rounded bg-white ${steps.length < 2 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              title={
                steps.length < 2
                  ? "Type mode needs at least 2 study steps."
                  : "Type your answer and press Enter."
              }
            >
              <input
                type="checkbox"
                checked={typeModeEnabled}
                disabled={steps.length < 2}
                onChange={() => setTypeMode((v) => !v)}
              />
              Type mode
            </label>
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-2">
          <div className="text-sm font-medium text-gray-700">Filter By</div>

          <div className="flex flex-wrap justify-center gap-2">
            <div className="px-2 py-2 border rounded bg-white">
              <div className="text-xs text-gray-500 mb-1">JLPT (multi)</div>

              <div className="flex flex-wrap gap-3 text-sm items-center">
                {JLPT_LEVELS.map((lvl) => {
                  const checkedLvl = jlptSelected.includes(lvl);
                  return (
                    <label key={lvl} className="flex items-center gap-2">
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
                  className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  title="Select all JLPT levels"
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={() => setJlptSelected([])}
                  className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  title="Clear JLPT filter"
                >
                  Clear
                </button>
              </div>
            </div>

            <select
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className="px-2 py-1 border rounded text-sm bg-white"
            >
              <option value="all">Chapters: All</option>
              {chapterOptions.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>

            <label
              className="flex items-center gap-2 text-sm px-2 py-1 border rounded bg-white"
              title="Show only words that appear 2+ times in this book"
            >
              <input
                type="checkbox"
                checked={repeatsOnly}
                onChange={() => setRepeatsOnly((v) => !v)}
              />
              Repeats
            </label>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-col items-center">
        <p className="text-sm text-gray-500">Session Progress</p>
        <p className="text-sm font-medium text-gray-700 text-center">
          Card {Math.min(sessionIndex + 1, Math.max(sessionOrder.length, 1))}/
          {studyOnceMode ? sessionOrder.length : filteredCards.length}
        </p>
      </div>

      <div
        onClick={flip}
        className="
          relative
          w-[92vw] max-w-2xl
          min-h-[32vh] sm:min-h-[38vh]
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
          {typeModeEnabled && card ? (
            <>
              <Row
                label="Word"
                value={card.word}
                visible={
                  studySet === "READING" || studySet === "MEANING" || studySet === "COMPLETE"
                    ? true
                    : typeRevealIndex >= steps.indexOf("word")
                }
                big
                placeholder="---"
              />

              <Row
                label="Reading"
                value={card.reading || "—"}
                visible={
                  studySet === "MEANING" || studySet === "FROM_READING"
                    ? true
                    : studySet === "COMPLETE"
                      ? typeRevealIndex >= 1
                      : typeRevealIndex >= steps.indexOf("reading")
                }
                placeholder="---"
              />

              <Row
                label="Meaning"
                value={card.meaning || "—"}
                visible={
                  studySet === "READING"
                    ? true
                    : studySet === "COMPLETE"
                      ? typeRevealIndex >= 2
                      : typeRevealIndex >= steps.indexOf("meaning")
                }
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
                        : studySet === "FROM_READING"
                          ? "Word or Meaning"
                          : typeRevealIndex === 0
                            ? "Reading"
                            : "Meaning"}
                  </div>

                  {studySet === "READING" ? (
                    <p className="mb-2 text-xs text-gray-500">
                      Reading quizzes can be answered in hiragana or katakana.
                    </p>
                  ) : null}

                  <div className="flex gap-2">
                    <input
                      key={`${studySet}-${sessionIndex}`}
                      type="text"
                      value={typedInput}
                      onChange={(e) => {
                        setTypedInput(e.target.value);
                        setTypedFeedback(null);
                        setReadyForNextCard(false);
                        setLastTypedResult(null);
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
                              : studySet === "FROM_READING"
                                ? "Type the word or a meaning"
                                : typeRevealIndex === 0
                                  ? "かなで入力（ひらがな・カタカナどちらでもOK）"
                                  : "Type a meaning"
                      }
                    />

                    {voiceSupported && studySet === "MEANING" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startVoiceInput();
                        }}
                        disabled={isListening}
                        className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                        title="Voice input"
                      >
                        {isListening ? "Listening..." : "🎤"}
                      </button>
                    ) : null}
                  </div>

                  {voiceError ? (
                    <p className="mt-2 text-xs text-red-700">{voiceError}</p>
                  ) : null}

                  {typedFeedback ? (
                    <p
                      className={`mt-2 text-sm ${typedFeedback.ok ? "text-green-700" : "text-red-700"
                        }`}
                    >
                      {typedFeedback.ok ? "✅ " : "❌ "}
                      {typedFeedback.message}
                    </p>
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

      <div className="mt-3 w-full max-w-2xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {typeModeEnabled
              ? "Press Enter to check. Press Enter again to move to the next card."
              : stepIndex === 0
                ? "Tap once to reveal"
                : "Tap again for the next word"}
          </p>

          <button
            onClick={() =>
              typeModeEnabled
                ? goToNextWord(readyForNextCard ? lastTypedResult ?? "revealed" : "revealed")
                : nextCardReveal()
            }
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Next Word
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center">
          {studySet === "READING" && "Show word + meaning → think of the reading"}
          {studySet === "MEANING" && "Show word + reading → think of the meaning"}
          {studySet === "FROM_READING" && "Show reading → think of the word and meaning"}
          {studySet === "COMPLETE" && "Show word → think of the reading → then the meaning"}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!card) return;
              skipCardForToday(card.id);
            }}
            className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-gray-700 hover:bg-gray-50"
          >
            Skip (for Today)
          </button>

          <button
            onClick={() => {
              if (!card) return;
              hideCardPermanently(card.id);
            }}
            className="flex-1 rounded-xl border border-gray-300 bg-gray-100 py-3 text-gray-700 hover:bg-gray-200"
          >
            Hide (for Good)
          </button>
        </div>

                <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={() => router.push(`/books/${userBookId}/words`)}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            Vocab List
          </button>

          <button
            onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            Book Hub
          </button>
        </div>
      </div>
    </main>
  );
}