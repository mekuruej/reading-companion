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

type StudySet =
  | "KANJI_READING_MEANING"
  | "KANJI_READING"
  | "KANJI_MEANING"
  | "READING_MEANING";

type StepField = "word" | "reading" | "meaning";

function baseStepsFor(set: StudySet): StepField[] {
  switch (set) {
    case "KANJI_READING_MEANING":
      return ["word", "reading", "meaning"];
    case "KANJI_READING":
      return ["word", "reading"];
    case "KANJI_MEANING":
      return ["word", "meaning"];
    case "READING_MEANING":
      return ["reading", "meaning"];
    default:
      return ["word", "reading", "meaning"];
  }
}

function studySetLabel(s: StudySet) {
  switch (s) {
    case "KANJI_READING_MEANING":
      return "Kanji → Reading → Meaning";
    case "KANJI_READING":
      return "Kanji → Reading";
    case "KANJI_MEANING":
      return "Kanji → Meaning";
    case "READING_MEANING":
      return "Reading → Meaning";
    default:
      return "Kanji → Reading → Meaning";
  }
}

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
  return (s ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[・･]/g, "")
    .replace(/ー/g, "")
    .toLowerCase();
}

function isHiraganaOnly(s: string) {
  return /^[ぁ-ゖー]+$/.test(s.trim());
}

function kataToHira(s: string) {
  return s.replace(/[ァ-ヶ]/g, (ch) =>
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
    } catch {}
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
  const today = new Date().toISOString().slice(0, 10);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);

  const [studySet, setStudySet] = useState<StudySet>("KANJI_READING_MEANING");
  const [reverseMode, setReverseMode] = useState(false);
  const [studyOnceMode, setStudyOnceMode] = useState(false);

  const [sessionOrder, setSessionOrder] = useState<number[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);

  const settingsKey = useMemo(() => `flashcards_settings_${userBookId}`, [userBookId]);

  const steps = useMemo(() => {
    const base = baseStepsFor(studySet);
    return reverseMode ? [...base].reverse() : base;
  }, [studySet, reverseMode]);

  const isTwoStep = steps.length === 2;

  const [typeMode, setTypeMode] = useState(false);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<null | { ok: boolean; correct: string }>(null);

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

  const typeModeEnabled = typeMode && isTwoStep;

  useEffect(() => {
    if (!userBookId) return;
    try {
      const raw = localStorage.getItem(settingsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.studySet) setStudySet(parsed.studySet as StudySet);
      if (typeof parsed?.reverseMode === "boolean") setReverseMode(parsed.reverseMode);
      if (typeof parsed?.typeMode === "boolean") setTypeMode(parsed.typeMode);
      if (typeof parsed?.studyOnceMode === "boolean") setStudyOnceMode(parsed.studyOnceMode);
      if (Array.isArray(parsed?.jlptSelected)) setJlptSelected(parsed.jlptSelected);
      if (parsed?.chapterFilter) setChapterFilter(parsed.chapterFilter);
      if (typeof parsed?.repeatsOnly === "boolean") setRepeatsOnly(parsed.repeatsOnly);
    } catch {}
  }, [settingsKey, userBookId]);

  useEffect(() => {
    if (!userBookId) return;
    try {
      localStorage.setItem(
        settingsKey,
        JSON.stringify({
          studySet,
          reverseMode,
          typeMode,
          studyOnceMode,
          jlptSelected,
          chapterFilter,
          repeatsOnly,
        })
      );
    } catch {}
  }, [
    settingsKey,
    userBookId,
    studySet,
    reverseMode,
    typeMode,
    studyOnceMode,
    jlptSelected,
    chapterFilter,
    repeatsOnly,
  ]);

  useEffect(() => {
    if (!isTwoStep && typeMode) {
      setTypeMode(false);
      setAnswer("");
      setChecked(null);
    }
  }, [isTwoStep, typeMode]);

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

        const { data: words, error: wErr } = await supabase
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
    created_at,
    meaning_choices,
    meaning_choice_index,
    hidden,
    skipped_on
  `
  )
  .eq("user_book_id", userBookId)
  .eq("hidden", false)
  .or(`skipped_on.is.null,skipped_on.neq.${today}`)
  .order("chapter_number", { ascending: true, nullsFirst: false })
  .order("page_number", { ascending: true, nullsFirst: false })
  .order("page_order", { ascending: true, nullsFirst: false })
  .order("created_at", { ascending: true })
  .order("id", { ascending: true })
  .returns<WordRow[]>();

        if (wErr) throw wErr;

        const repeatCounts = new Map<string, number>();
        for (const w of words ?? []) {
          const key = normalizeRepeatKey(w.surface);
          if (!key) continue;
          repeatCounts.set(key, (repeatCounts.get(key) ?? 0) + 1);
        }

        const normalized: Flashcard[] = (words ?? []).map((w) => {
          const ch = chapterInfoFromRow(w);

          const meaningChoices = asStringArray(w.meaning_choices);
          const idx = Number.isFinite(w.meaning_choice_index as any)
            ? (w.meaning_choice_index as number)
            : 0;
          const safeIdx = meaningChoices.length
            ? Math.max(0, Math.min(idx, meaningChoices.length - 1))
            : 0;

          const chosenMeaning = meaningChoices.length
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
          };
        });

        setCards(normalized);
        setFilteredCards(normalized);

        const map = new Map<string, string>();
        for (const c of normalized) {
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
        setAnswer("");
        setChecked(null);
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
    setAnswer("");
    setChecked(null);
    setDefError(null);
    setShowDefPicker(false);
    setVoiceError(null);
  }, [cards, jlptSelected, chapterFilter, repeatsOnly]);

  useEffect(() => {
    const order = filteredCards.map((_, i) => i);
    setSessionOrder(studyOnceMode ? shuffleArray(order) : order);
    setSessionIndex(0);
    setStepIndex(0);
    setAnswer("");
    setChecked(null);
    setDefError(null);
    setShowDefPicker(false);
    setVoiceError(null);
    setFirstTouch(true);
  }, [filteredCards, studyOnceMode]);

  useEffect(() => {
    setShowDefPicker(false);
    setDefError(null);
    setVoiceError(null);
  }, [sessionIndex]);

  useEffect(() => {
    setStepIndex(0);
    setAnswer("");
    setChecked(null);
    setVoiceError(null);
  }, [studySet, reverseMode]);

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
    setAnswer("");
    setChecked(null);
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
    setAnswer("");
    setChecked(null);
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
    const max = steps.length;
    if (max <= 1) return goToNextWord();
    if (stepIndex < max - 1) return setStepIndex((s) => s + 1);
    return goToNextWord();
  }

  function prevCardReveal() {
    const max = steps.length;
    if (max <= 1) return goToPrevWord();
    if (stepIndex > 0) return setStepIndex((s) => s - 1);
    return goToPrevWord();
  }

  function checkTypedAnswer() {
    if (!isTwoStep || !card) return;
    const answerField = steps[1];

    const correctRaw = getFieldValue(answerField, card);
    if (!correctRaw) {
      setChecked({ ok: true, correct: "—" });
      return;
    }

    let userAns = kataToHira(answer.trim());

    if (answerField === "reading" && !isHiraganaOnly(userAns)) {
      setChecked({
        ok: false,
        correct: "Please answer in hiragana only.",
      });
      return;
    }

    let ok = false;

    if (answerField === "reading") {
      ok = normalizeReading(userAns) === normalizeReading(correctRaw);
    } else if (answerField === "meaning") {
      const u = normalizeMeaning(userAns);
      const corr = normalizeMeaning(correctRaw);
      ok = u.length > 0 && corr.includes(u);
    } else {
      ok = userAns === correctRaw.trim();
    }

    setChecked({ ok, correct: correctRaw });
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
          x.id === card.id ? { ...x, meaningChoiceIndex: safe, meaning: chosen || x.meaning } : x
        )
      );

      setFilteredCards((prev) =>
        prev.map((x) =>
          x.id === card.id ? { ...x, meaningChoiceIndex: safe, meaning: chosen || x.meaning } : x
        )
      );

      setAnswer("");
      setChecked(null);
    } catch (e: any) {
      setDefError(e?.message ?? "Failed to change definition");
    } finally {
      setDefSaving(false);
    }
  }

  const promptField = card ? steps[0] : "word";
  const answerField = card && steps.length >= 2 ? steps[1] : null;

  function startVoiceInput() {
    if (typeof window === "undefined") return;
    if (answerField !== "meaning") return;

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
      setVoiceError(event?.error ? `Voice input error: ${event.error}` : "Voice input failed.");
    };

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ?? "";
      setAnswer(transcript);
      setChecked(null);
    };

    recognition.start();
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (typeModeEnabled) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!checked) {
            checkTypedAnswer();
          } else {
            goToNextWord(checked.ok ? "correct" : "wrong");
          }
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          goToNextWord(checked ? (checked.ok ? "correct" : "wrong") : "revealed");
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goToPrevWord();
        }
        return;
      }

      if (e.key === "ArrowRight") nextCardReveal();
      if (e.key === "ArrowLeft") prevCardReveal();
      if (e.key === " ") {
        e.preventDefault();
        nextCardReveal();
      }
      if (e.key.toLowerCase() === "r") {
        setReverseMode((v) => !v);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [typeModeEnabled, checked, steps, stepIndex, studySet, reverseMode, filteredCards, sessionIndex, studyOnceMode]);

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
        <button onClick={() => router.push(`/books`)} className="px-4 py-2 bg-gray-200 rounded">
          Back to Books
        </button>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-700">{errorMsg}</p>
        <button onClick={() => router.push(`/books`)} className="px-4 py-2 bg-gray-200 rounded">
          Back to Books
        </button>
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
          <p className="mt-3 text-gray-700">You studied each card once.</p>

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
                setAnswer("");
                setChecked(null);
                setFirstTouch(true);
              }}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Study Again
            </button>
          </div>

          <div className="mt-4">
            <button
              onClick={() => router.push(`/books`)}
              className="text-sm text-slate-600 hover:underline"
            >
              Back to Books
            </button>
          </div>
        </div>
      </main>
    );
  }

  const revealed = new Set<StepField>(steps.slice(0, stepIndex + 1));
  const showWord = revealed.has("word");
  const showReading = revealed.has("reading");
  const showMeaning = revealed.has("meaning");

  function Row({
    label,
    value,
    visible,
    big,
  }: {
    label: string;
    value: string;
    visible: boolean;
    big?: boolean;
  }) {
    return (
      <div className="w-full flex flex-col items-center gap-1">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div
          className={[
            big ? "text-[2.6rem] font-bold" : "text-[1.65rem]",
            "transition-opacity duration-200",
            visible ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          {value}
        </div>
      </div>
    );
  }

  const promptValue = card ? getFieldValue(promptField, card) : "";
  const needsKanaInput = typeModeEnabled && answerField === "reading";
  const showMicButton = voiceSupported && typeModeEnabled && answerField === "meaning";

  return (
  <main
  className="min-h-screen flex flex-col items-center px-6 py-4"
  style={{
    backgroundImage: `
      repeating-linear-gradient(
        to bottom,
        #f9f6ef 0px,
        #f9f6ef 180px,
        #d1b58f 181px,
        #d1b58f 183px
      ),
      linear-gradient(to right, #f8f3e8 0%, #f3ede2 100%)
    `,
    backgroundSize: "100% 183px",
  }}
>
    <div className="w-full max-w-5xl mb-1 flex flex-col md:flex-row items-center md:items-start justify-center gap-8">
  <div className="flex flex-col items-center shrink-0">
    {bookCover ? (
      <img src={bookCover} alt="" className="w-24 h-32 rounded mb-2 object-cover" />
    ) : null}
    <h1 className="text-2xl font-semibold text-center">{bookTitle}</h1>
  </div>

  <div className="w-full md:w-[460px] md:mt-6 md:ml-4">
  <p className="text-base text-gray-500 text-left leading-8">
    This page is intended to help you strengthen the vocabulary you are still working on. Study the flashcards however you like. Vocabulary is always shown in random order.
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
              <option value="KANJI_READING_MEANING">{studySetLabel("KANJI_READING_MEANING")}</option>
              <option value="KANJI_READING">{studySetLabel("KANJI_READING")}</option>
              <option value="KANJI_MEANING">{studySetLabel("KANJI_MEANING")}</option>
              <option value="READING_MEANING">{studySetLabel("READING_MEANING")}</option>
            </select>

            <label className="flex items-center gap-2 text-sm px-2 py-1 border rounded bg-white">
              <input type="checkbox" checked={reverseMode} onChange={() => setReverseMode((v) => !v)} />
              Reverse (R)
            </label>

            <label
              className={`flex items-center gap-2 text-sm px-2 py-1 border rounded bg-white ${
                !isTwoStep ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={!isTwoStep ? "Type mode is only for 2-step modes right now." : "Type the answer for step 2."}
            >
              <input
                type="checkbox"
                checked={typeModeEnabled}
                disabled={!isTwoStep}
                onChange={() => setTypeMode((v) => !v)}
              />
              Type mode
            </label>

            <label className="flex items-center gap-2 text-sm px-2 py-1 border rounded bg-white">
              <input
                type="checkbox"
                checked={studyOnceMode}
                onChange={() => setStudyOnceMode((v) => !v)}
              />
              Study each card once
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
              <input type="checkbox" checked={repeatsOnly} onChange={() => setRepeatsOnly((v) => !v)} />
              Repeats
            </label>
          </div>
        </div>
      </div>

      {firstTouch && (
  <p className="mb-2 text-sm text-gray-500">
    {typeModeEnabled
      ? "Type the answer and press Enter (Enter again to continue)."
      : "Click card, press Space, or use Review / Next."}
  </p>
)}

<div className="mb-3 flex flex-col items-center">
  <p className="text-[11px] uppercase tracking-wide text-gray-400">
    Session Progress
  </p>
  <p className="text-sm text-gray-500 text-center">
    Card {Math.min(sessionIndex + 1, Math.max(sessionOrder.length, 1))}/
    {studyOnceMode ? sessionOrder.length : filteredCards.length}
  </p>
</div>

<div
  onClick={flip}
  className="
    relative
    w-[92vw] max-w-2xl
min-h-[20rem]
          min-h-60 bg-white rounded-2xl
          border border-slate-500
          shadow-2xl
          flex items-center justify-center
          cursor-pointer text-center select-none
          p-8
        "
      >
        <div className="absolute top-3 right-4 text-[11px] text-slate-500">
          Book Count {card?.repeatCount ?? 1} • Total Count ***
        </div>

        <div className="absolute bottom-3 right-4 text-[11px] text-slate-500">
          Def #{((card?.meaningChoiceIndex ?? 0) as number) + 1}
        </div>

        <div className="w-full flex flex-col items-center justify-center gap-6">
          {typeModeEnabled && card ? (
            <>
              <Row
                label={promptField === "word" ? "Kanji" : promptField === "reading" ? "Reading" : "Meaning"}
                value={promptValue || "—"}
                visible={true}
                big
              />

              <div className="w-full max-w-md">
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                  Type {answerField === "word" ? "Kanji" : answerField === "reading" ? "Reading" : "Meaning"}
                </div>

                {needsKanaInput ? (
                  <p className="mb-2 text-xs text-gray-500">
                    Reading quizzes should be answered in hiragana only. If needed, switch your keyboard to かな and disable 漢字変換.
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setChecked(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!checked) {
                          checkTypedAnswer();
                        } else {
                          goToNextWord(checked.ok ? "correct" : "wrong");
                        }
                      }
                    }}
                    inputMode="text"
                    lang={needsKanaInput ? "ja" : undefined}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="border p-2 rounded w-full"
                    placeholder={
                      answerField === "meaning"
                        ? "Type a keyword (partial OK)"
                        : needsKanaInput
                        ? "かなで入力"
                        : "Type your answer"
                    }
                  />

                  {showMicButton && (
                    <button
                      type="button"
                      onClick={startVoiceInput}
                      disabled={isListening}
                      className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                      title="Voice input"
                    >
                      {isListening ? "Listening..." : "🎤"}
                    </button>
                  )}
                </div>

                {voiceError ? (
                  <p className="mt-2 text-xs text-red-700">{voiceError}</p>
                ) : null}

                {checked ? (
                  <div className="mt-3 text-sm">
                    {checked.ok ? (
                      <p className="text-green-700">✅ Correct!</p>
                    ) : (
                      <p className="text-red-700">❌ Not quite.</p>
                    )}

                    <div className="mt-2 border rounded p-3 bg-gray-50 text-left">
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Full answer</div>

                      <div className="flex flex-col gap-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">Kanji</div>
                          <div className="text-base font-medium">{card.word || "—"}</div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">Reading</div>
                          <div className="text-base font-medium">{card.reading || "—"}</div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">Meaning</div>
                          <div className="text-base font-medium">{card.meaning || "—"}</div>
                        </div>

                        <div className="text-xs text-slate-500">
                          Book Count: {card.repeatCount ?? 1} • Total Count: ***
                        </div>

                        <div className="text-xs text-slate-500">Def #{(card.meaningChoiceIndex ?? 0) + 1}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-3 px-3 py-1 bg-gray-200 rounded"
                      onClick={() => goToNextWord(checked.ok ? "correct" : "wrong")}
                    >
                      Continue
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 bg-gray-200 rounded"
                    onClick={checkTypedAnswer}
                  >
                    Check
                  </button>
                )}
              </div>
            </>
          ) : card ? (
            <>
              <Row label="Word" value={card.word} visible={showWord} big />
              <Row label="Reading" value={card.reading || "—"} visible={showReading} />
              <Row label="Meaning" value={card.meaning || "—"} visible={showMeaning} />
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6 justify-center">
  <button
    onClick={() => (typeModeEnabled ? goToPrevWord() : prevCardReveal())}
    className="px-4 py-2 bg-gray-200 rounded"
  >
    Review
  </button>

  <button
    onClick={() =>
      typeModeEnabled
        ? goToNextWord(checked ? (checked.ok ? "correct" : "wrong") : "revealed")
        : nextCardReveal()
    }
    className="px-4 py-2 bg-gray-200 rounded"
  >
    Next
  </button>

  <button
    onClick={() => {
      if (!card) return;
      skipCardForToday(card.id);
    }}
    className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 transition"
  >
    Skip for today
  </button>

  <button
    onClick={() => {
      if (!card) return;
      hideCardPermanently(card.id);
    }}
    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
  >
    Hide card
  </button>
</div>

      <div className="mt-5 flex justify-center gap-3">
        <button
          onClick={() => router.push(`/books/${userBookId}/words`)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-800 transition"
        >
          Vocab List
        </button>

        <button
          onClick={() => router.push(`/books`)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-800 transition"
        >
          Back to Books
        </button>

        <button
          onClick={() => router.push(`/books/${userBookId}/weekly-readings`)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-800 transition"
        >
          Practice Readings
        </button>
      </div>
    </main>
  );
}