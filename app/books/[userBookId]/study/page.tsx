"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

function reverseLabel(label: string) {
  return label
    .split("→")
    .map((x) => x.trim())
    .reverse()
    .join(" → ");
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
  created_at: string;

  meaning_choices: any | null; // jsonb
  meaning_choice_index: number | null;
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
    .toLowerCase();
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

// ✅ keep this outside the component so it’s always in scope
const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1", "NON-JLPT"] as const;

export default function BookFlashcardsPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;

  const router = useRouter();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);

  const [studySet, setStudySet] = useState<StudySet>("KANJI_READING_MEANING");
  const [reverseMode, setReverseMode] = useState(false);

  const settingsKey = useMemo(() => `flashcards_settings_${userBookId}`, [userBookId]);

  const steps = useMemo(() => {
    const base = baseStepsFor(studySet);
    return reverseMode ? [...base].reverse() : base;
  }, [studySet, reverseMode]);

  const isTwoStep = steps.length === 2;

  // Type mode (only for 2-step)
  const [typeMode, setTypeMode] = useState(false);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<null | { ok: boolean; correct: string }>(null);

  const [stepIndex, setStepIndex] = useState(0);

  const [randomMode, setRandomMode] = useState(false);
  const [firstTouch, setFirstTouch] = useState(true);

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ JLPT multi
  const [jlptSelected, setJlptSelected] = useState<string[]>([]); // [] means no filter
  const [chapterFilter, setChapterFilter] = useState("all");
  const [repeatsOnly, setRepeatsOnly] = useState(false);

  const [chapterOptions, setChapterOptions] = useState<{ value: string; label: string }[]>([]);

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");

  // Definition UI state
  const [defSaving, setDefSaving] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);
  const [showDefPicker, setShowDefPicker] = useState(false);

  const typeModeEnabled = typeMode && isTwoStep;

  // Load saved settings
  useEffect(() => {
    if (!userBookId) return;
    try {
      const raw = localStorage.getItem(settingsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.studySet) setStudySet(parsed.studySet as StudySet);
      if (typeof parsed?.reverseMode === "boolean") setReverseMode(parsed.reverseMode);
      if (typeof parsed?.randomMode === "boolean") setRandomMode(parsed.randomMode);
      if (typeof parsed?.typeMode === "boolean") setTypeMode(parsed.typeMode);
      if (Array.isArray(parsed?.jlptSelected)) setJlptSelected(parsed.jlptSelected);
      if (parsed?.chapterFilter) setChapterFilter(parsed.chapterFilter);
      if (typeof parsed?.repeatsOnly === "boolean") setRepeatsOnly(parsed.repeatsOnly);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  // Save settings
  useEffect(() => {
    if (!userBookId) return;
    try {
      localStorage.setItem(
        settingsKey,
        JSON.stringify({
          studySet,
          reverseMode,
          randomMode,
          typeMode,
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
    randomMode,
    typeMode,
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

  // Load words + book info
  useEffect(() => {
    if (!userBookId) return;

    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      setNeedsSignIn(false);

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (!user) {
          setNeedsSignIn(true);
          setCards([]);
          setFilteredCards([]);
          setBookTitle("");
          setBookCover("");
          setChapterOptions([]);
          return;
        }

        // ✅ Teacher can view student decks (RLS should govern)
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
            meaning_choice_index
          `
          )
          .eq("user_book_id", userBookId)
          .order("created_at", { ascending: true })
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

          const meaningChoices = asStringArray((w as any).meaning_choices);
          const idx = Number.isFinite(w.meaning_choice_index as any)
            ? (w.meaning_choice_index as number)
            : 0;
          const safeIdx = meaningChoices.length
            ? Math.max(0, Math.min(idx, meaningChoices.length - 1))
            : 0;

          const chosenMeaning = meaningChoices.length
            ? meaningChoices[safeIdx]
            : (w.meaning ?? null);

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

        setIndex(0);
        setStepIndex(0);
        setAnswer("");
        setChecked(null);
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
        setChapterOptions([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userBookId]);

  // Apply filters
  useEffect(() => {
    let result = [...cards];

    // ✅ if none selected => no JLPT filtering
    // ✅ if ALL selected => no JLPT filtering
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
    setIndex(0);
    setStepIndex(0);
    setAnswer("");
    setChecked(null);
    setDefError(null);
    setShowDefPicker(false);
  }, [cards, jlptSelected, chapterFilter, repeatsOnly]);

  // Hide definition picker when changing cards
  useEffect(() => {
    setShowDefPicker(false);
    setDefError(null);
  }, [index]);

  useEffect(() => {
    setStepIndex(0);
    setAnswer("");
    setChecked(null);
  }, [studySet, reverseMode]);

  function getFieldValue(field: StepField, c: Flashcard) {
    if (field === "word") return c.word || "";
    if (field === "reading") return c.reading || "";
    return c.meaning || "";
  }

  function goToNextWord() {
    if (filteredCards.length === 0) return;

    if (randomMode) setIndex(Math.floor(Math.random() * filteredCards.length));
    else setIndex((prev) => (prev + 1 < filteredCards.length ? prev + 1 : 0));

    setStepIndex(0);
    setAnswer("");
    setChecked(null);
    setDefError(null);
    setShowDefPicker(false);
  }

  function goToPrevWord() {
    if (filteredCards.length === 0) return;

    if (randomMode) setIndex(Math.floor(Math.random() * filteredCards.length));
    else setIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCards.length - 1));

    setStepIndex(Math.max(steps.length - 1, 0));
    setAnswer("");
    setChecked(null);
    setDefError(null);
    setShowDefPicker(false);
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
    if (!isTwoStep) return;
    const c = filteredCards[index];
    const answerField = steps[1];

    const correctRaw = getFieldValue(answerField, c);
    if (!correctRaw) {
      setChecked({ ok: true, correct: "—" });
      return;
    }

    const userAns = answer;
    let ok = false;

    if (answerField === "reading") {
      ok = normalizeReading(userAns) === normalizeReading(correctRaw);
    } else if (answerField === "meaning") {
      const u = normalizeMeaning(userAns);
      const corr = normalizeMeaning(correctRaw);
      ok = u.length > 0 && corr.includes(u);
    } else {
      ok = userAns.trim() === correctRaw.trim();
    }

    setChecked({ ok, correct: correctRaw });
  }

  function flip() {
    if (firstTouch) setFirstTouch(false);
    if (typeModeEnabled) return;
    nextCardReveal();
  }

  async function setDefinitionForCurrent(newIndex: number) {
    const c = filteredCards[index];
    if (!c) return;
    if (!c.meaningChoices?.length) return;

    const safe = Math.max(0, Math.min(newIndex, c.meaningChoices.length - 1));
    const chosen = c.meaningChoices[safe] ?? "";

    setDefSaving(true);
    setDefError(null);

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({
          meaning_choice_index: safe,
          meaning: chosen || null,
        })
        .eq("id", c.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      setCards((prev) =>
        prev.map((x) =>
          x.id === c.id ? { ...x, meaningChoiceIndex: safe, meaning: chosen || x.meaning } : x
        )
      );

      setFilteredCards((prev) =>
        prev.map((x) =>
          x.id === c.id ? { ...x, meaningChoiceIndex: safe, meaning: chosen || x.meaning } : x
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

  // Keyboard
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (typeModeEnabled) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!checked) checkTypedAnswer();
          else goToNextWord();
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          goToNextWord();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    typeModeEnabled,
    checked,
    answer,
    steps,
    stepIndex,
    randomMode,
    studySet,
    reverseMode,
    filteredCards,
    index,
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
        <button onClick={() => router.push(`/books`)} className="px-4 py-2 bg-gray-200 rounded">
          Back to Books
        </button>
      </main>
    );
  }

  const card = filteredCards[index];

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
            big ? "text-4xl font-bold" : "text-2xl",
            "transition-opacity duration-200",
            visible ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          {value}
        </div>
      </div>
    );
  }

  const baseLabel = studySetLabel(studySet);
  const effectiveLabel = reverseMode ? reverseLabel(baseLabel) : baseLabel;

  const promptField = steps[0];
  const answerField = steps.length >= 2 ? steps[1] : null;

  const promptValue = getFieldValue(promptField, card);

  const needsKanaInput = typeModeEnabled && answerField === "reading";

  const defTotal = card.meaningChoices?.length ?? 0;
  const defIdx = card.meaningChoiceIndex ?? 0;
  const showDefInfo = defTotal > 1;

  return (
    <main className="min-h-screen flex flex-col items-center p-6">
      {/* Header */}
      <div className="flex flex-col items-center mb-4">
        {bookCover ? <img src={bookCover} alt="" className="w-20 h-28 rounded mb-2" /> : null}
        <h1 className="text-xl font-semibold">{bookTitle} Flashcards</h1>

        <p className="text-sm text-gray-500">
          Step {stepIndex + 1}/{steps.length} • Card {index + 1}/{filteredCards.length}
          {repeatsOnly ? <span className="ml-2 text-xs text-gray-500">• Repeats only</span> : null}
        </p>

        <p className="mt-1 text-xs text-gray-500">Mode: {effectiveLabel}</p>

        {card.chapterDisplay && card.chapterDisplay !== "(none)" ? (
          <p className="mt-1 text-xs text-gray-500">Chapter: {card.chapterDisplay}</p>
        ) : null}

        {card.page_number != null ? <p className="mt-1 text-xs text-gray-500">Page: {card.page_number}</p> : null}

        {card.repeatCount >= 2 ? (
          <p className="mt-1 text-xs text-gray-500">Repeats in this book: {card.repeatCount}</p>
        ) : null}

        {showDefInfo ? (
          <div className="mt-2 flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Definition: {defIdx + 1}/{defTotal}
              </span>

              {!showDefPicker ? (
                <button
                  type="button"
                  onClick={() => setShowDefPicker(true)}
                  className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Change
                </button>
              ) : (
                <>
                  <select
                    value={defIdx}
                    disabled={defSaving}
                    onChange={(e) => setDefinitionForCurrent(Number(e.target.value))}
                    className="border p-1 rounded text-xs bg-white"
                  >
                    {card.meaningChoices.map((_, i) => (
                      <option key={i} value={i}>
                        {i + 1}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={defSaving}
                    onClick={() => {
                      setShowDefPicker(false);
                      setDefError(null);
                    }}
                    className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  >
                    Done
                  </button>

                  {defSaving ? <span className="text-xs text-gray-500">Saving…</span> : null}
                </>
              )}
            </div>

            {defError ? <p className="text-xs text-red-700">{defError}</p> : null}
          </div>
        ) : null}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <select
          value={studySet}
          onChange={(e) => setStudySet(e.target.value as StudySet)}
          className="mt-2 px-2 py-1 border rounded text-sm bg-white"
        >
          <option value="KANJI_READING_MEANING">{studySetLabel("KANJI_READING_MEANING")}</option>
          <option value="KANJI_READING">{studySetLabel("KANJI_READING")}</option>
          <option value="KANJI_MEANING">{studySetLabel("KANJI_MEANING")}</option>
          <option value="READING_MEANING">{studySetLabel("READING_MEANING")}</option>
        </select>

        <label className="flex items-center gap-2 mt-2 text-sm px-2 py-1 border rounded bg-white">
          <input type="checkbox" checked={reverseMode} onChange={() => setReverseMode((v) => !v)} />
          Reverse (R)
        </label>

        <label
          className={`flex items-center gap-2 mt-2 text-sm px-2 py-1 border rounded bg-white ${
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

        {/* JLPT multi */}
        <div className="mt-2 px-2 py-2 border rounded bg-white">
          <div className="text-xs text-gray-500 mb-1">JLPT (multi)</div>

          <div className="flex flex-wrap gap-3 text-sm items-center">
            {JLPT_LEVELS.map((lvl) => {
              const checked = jlptSelected.includes(lvl);
              return (
                <label key={lvl} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setJlptSelected((prev) => (checked ? prev.filter((x) => x !== lvl) : [...prev, lvl]))
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
          className="mt-2 px-2 py-1 border rounded text-sm bg-white"
        >
          <option value="all">Chapters: All</option>
          {chapterOptions.map((ch) => (
            <option key={ch.value} value={ch.value}>
              {ch.label}
            </option>
          ))}
        </select>

        <label
          className="flex items-center gap-2 mt-2 text-sm px-2 py-1 border rounded bg-white"
          title="Show only words that appear 2+ times in this book"
        >
          <input type="checkbox" checked={repeatsOnly} onChange={() => setRepeatsOnly((v) => !v)} />
          Repeats
        </label>

        <label className="flex items-center gap-1 mt-2 text-sm">
          <input type="checkbox" checked={randomMode} onChange={() => setRandomMode(!randomMode)} />
          Random
        </label>
      </div>

      {firstTouch && (
        <p className="mb-3 text-sm text-gray-500">
          {typeModeEnabled
            ? "Type the answer and press Enter (Enter again to continue)."
            : "Click card, press Space, or use ← → to reveal/advance"}
        </p>
      )}

      {/* Card */}
      <div
        onClick={flip}
        className="
          w-[90vw] max-w-xl
          min-h-72 bg-white rounded-2xl
          border border-slate-500
          shadow-2xl
          flex items-center justify-center
          cursor-pointer text-center select-none
          p-8
        "
      >
        <div className="w-full flex flex-col items-center justify-center gap-6">
          {typeModeEnabled ? (
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
                    Tip: for reading questions, switch your keyboard to かな and disable 漢字変換 if it keeps converting.
                  </p>
                ) : null}

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
                      if (!checked) checkTypedAnswer();
                      else goToNextWord();
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

                {checked ? (
                  <div className="mt-3 text-sm">
                    {checked.ok ? <p className="text-green-700">✅ Correct!</p> : <p className="text-red-700">❌ Not quite.</p>}

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

                        {card.repeatCount >= 2 ? (
                          <div className="text-xs text-slate-500">Repeats in this book: {card.repeatCount}</div>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-3 px-3 py-1 bg-gray-200 rounded"
                      onClick={() => goToNextWord()}
                    >
                      Continue →
                    </button>
                  </div>
                ) : (
                  <button type="button" className="mt-2 px-3 py-1 bg-gray-200 rounded" onClick={checkTypedAnswer}>
                    Check (Enter)
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <Row label="Word" value={card.word} visible={showWord} big />
              <Row label="Reading" value={card.reading || "—"} visible={showReading} />
              <Row label="Meaning" value={card.meaning || "—"} visible={showMeaning} />
            </>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-10 mt-6">
        <button onClick={typeModeEnabled ? goToPrevWord : prevCardReveal} className="px-4 py-2 bg-gray-200 rounded">
          ← Review
        </button>
        <button onClick={typeModeEnabled ? goToNextWord : nextCardReveal} className="px-4 py-2 bg-gray-200 rounded">
          Answer →
        </button>
      </div>

      {/* Back */}
      <div className="mt-6">
        <button onClick={() => router.push(`/books`)} className="text-sm text-slate-600 hover:underline">
          ← Back to Books
        </button>
      </div>
    </main>
  );
}