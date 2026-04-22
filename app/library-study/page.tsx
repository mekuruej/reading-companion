"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type UserBookJoinRow = {
  id: string;
  books:
  | {
    title: string | null;
    cover_url: string | null;
  }
  | {
    title: string | null;
    cover_url: string | null;
  }[]
  | null;
};

type UserBookWordRow = {
  id: string;
  user_book_id: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  hidden: boolean | null;
  created_at: string;
};

type StudyCard = {
  id: string;
  userBookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  surface: string;
  reading: string;
  meaning: string;
  jlpt: string | null;
};

type StudyMode =
  | "reading_typing"
  | "meaning_typing"
  | "reading_to_meaning_typing"
  | "reading_mc"
  | "meaning_mc"
  | "reading_to_kanji_mc"
  | "reading_to_meaning_mc"
  | "complete_study";

const STORAGE_KEY = "library-study-seen-by-date";

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeText(value: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeKana(value: string) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function getBookMeta(row: UserBookJoinRow) {
  const book = Array.isArray(row.books) ? row.books[0] : row.books;
  return {
    title: book?.title ?? "Untitled",
    cover_url: book?.cover_url ?? null,
  };
}

function uniqueByNormalized(
  values: string[],
  normalize: (value: string) => string,
  exclude: string
) {
  const seen = new Set<string>();
  const out: string[] = [];
  const excludeNorm = normalize(exclude);

  for (const value of values) {
    const norm = normalize(value);
    if (!norm || norm === excludeNorm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(value);
  }

  return out;
}

function matchesAnyMeaning(input: string, fullMeaning: string) {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) return false;

  const semicolonParts = fullMeaning
    .split(";")
    .map((part) => normalizeText(part))
    .filter(Boolean);

  for (const part of semicolonParts) {
    if (part === normalizedInput) return true;

    const commaParts = part
      .split(",")
      .map((piece) => normalizeText(piece))
      .filter(Boolean);

    for (const piece of commaParts) {
      if (piece === normalizedInput) return true;

      const words = piece
        .replace(/[()]/g, " ")
        .split(/\s+/)
        .map((word) => normalizeText(word))
        .filter(Boolean);

      if (words.includes(normalizedInput)) {
        return true;
      }
    }
  }

  return false;
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadSeenForToday() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as Record<string, string[]>;
    const today = getTodayKey();
    const todaysValues = parsed[today] ?? [];
    return new Set(todaysValues);
  } catch {
    return new Set<string>();
  }
}

function saveSeenForToday(values: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    const today = getTodayKey();

    const cleaned: Record<string, string[]> = {};
    cleaned[today] = Array.from(values);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, ...cleaned }));
  } catch {
    // ignore localStorage failures
  }
}

export default function LibraryStudyPage() {
  const router = useRouter();
  const typingInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [allCards, setAllCards] = useState<StudyCard[]>([]);
  const [deck, setDeck] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);

  const [selectedJlpt, setSelectedJlpt] = useState("all");
  const [studyMode, setStudyMode] = useState<StudyMode>("reading_typing");

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState<null | { ok: boolean; correct: string }>(null);
  const [typingInput, setTypingInput] = useState("");

  const [twoStepStage, setTwoStepStage] = useState<1 | 2>(1);
  const [firstStepChecked, setFirstStepChecked] = useState<null | { ok: boolean; correct: string }>(
    null
  );
  const [secondStepInput, setSecondStepInput] = useState("");
  const [secondStepChecked, setSecondStepChecked] = useState<
    null | { ok: boolean; correct: string }
  >(null);

  const [endedEarly, setEndedEarly] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [seenTodayIds, setSeenTodayIds] = useState<Set<string>>(new Set());

  const currentCard = deck[index];

  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      const jlptMatch =
        selectedJlpt === "all" || (card.jlpt ?? "").toUpperCase() === selectedJlpt;
      const notSeenToday = !seenTodayIds.has(card.id);
      return jlptMatch && notSeenToday;
    });
  }, [allCards, selectedJlpt, seenTodayIds]);

  const meaningOptions = useMemo(() => {
    if (!currentCard) return [];

    const distractors = uniqueByNormalized(
      filteredCards
        .filter((card) => card.id !== currentCard.id)
        .map((card) => card.meaning),
      normalizeText,
      currentCard.meaning
    ).slice(0, 3);

    return shuffleArray([currentCard.meaning, ...distractors]);
  }, [currentCard, filteredCards]);

  const readingOptions = useMemo(() => {
    if (!currentCard) return [];

    const distractors = uniqueByNormalized(
      filteredCards
        .filter((card) => card.id !== currentCard.id)
        .map((card) => card.reading),
      normalizeKana,
      currentCard.reading
    ).slice(0, 3);

    return shuffleArray([currentCard.reading, ...distractors]);
  }, [currentCard, filteredCards]);

  const surfaceOptions = useMemo(() => {
    if (!currentCard) return [];

    const distractors = uniqueByNormalized(
      filteredCards
        .filter((card) => card.id !== currentCard.id)
        .map((card) => card.surface),
      normalizeText,
      currentCard.surface
    ).slice(0, 3);

    return shuffleArray([currentCard.surface, ...distractors]);
  }, [currentCard, filteredCards]);

  useEffect(() => {
    setSeenTodayIds(loadSeenForToday());
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNeedsSignIn(false);
      setErrorMsg(null);

      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
          setNeedsSignIn(true);
          setLoading(false);
          return;
        }

        const { data: userBooks, error: userBooksErr } = await supabase
          .from("user_books")
          .select(`
            id,
            books:book_id (
              title,
              cover_url
            )
          `)
          .eq("user_id", user.id)
          .returns<UserBookJoinRow[]>();

        if (userBooksErr) throw userBooksErr;

        const userBookIds = (userBooks ?? []).map((row) => row.id).filter(Boolean);

        if (userBookIds.length === 0) {
          setAllCards([]);
          setDeck([]);
          setLoading(false);
          return;
        }

        const metaById = new Map<string, { title: string; cover_url: string | null }>();
        for (const row of userBooks ?? []) {
          metaById.set(row.id, getBookMeta(row));
        }

        const { data: words, error: wordsErr } = await supabase
          .from("user_book_words")
          .select("id, user_book_id, surface, reading, meaning, jlpt, hidden, created_at")
          .in("user_book_id", userBookIds)
          .eq("hidden", false)
          .order("created_at", { ascending: false })
          .returns<UserBookWordRow[]>();

        if (wordsErr) throw wordsErr;

        const cards: StudyCard[] = (words ?? [])
          .filter((row) => {
            const surface = row.surface?.trim() ?? "";
            const reading = row.reading?.trim() ?? "";
            const meaning = row.meaning?.trim() ?? "";
            return !!surface && !!reading && !!meaning;
          })
          .map((row) => {
            const meta = metaById.get(row.user_book_id);
            return {
              id: row.id,
              userBookId: row.user_book_id,
              bookTitle: meta?.title ?? "Untitled",
              bookCoverUrl: meta?.cover_url ?? null,
              surface: row.surface!.trim(),
              reading: row.reading!.trim(),
              meaning: row.meaning!.trim(),
              jlpt: row.jlpt ?? null,
            };
          });

        setAllCards(cards);
      } catch (err: any) {
        console.error("Error loading Library Study:", err);
        setErrorMsg(err?.message ?? "Failed to load Library Study.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    setDeck(shuffleArray(filteredCards));
    setIndex(0);
    resetCardState();
    setEndedEarly(false);
  }, [filteredCards, studyMode]);

  useEffect(() => {
    if (!checked?.ok) return;

    const timer = window.setTimeout(() => {
      movePastCurrentCard();
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [checked]);

  useEffect(() => {
    if (!secondStepChecked?.ok) return;

    const timer = window.setTimeout(() => {
      movePastCurrentCard();
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [secondStepChecked]);

  useEffect(() => {
    const needsTypingFocus =
      studyMode === "reading_typing" ||
      studyMode === "meaning_typing" ||
      studyMode === "reading_to_meaning_typing" ||
      studyMode === "complete_study";

    if (!needsTypingFocus) return;
    if (!currentCard) return;

    const timer = window.setTimeout(() => {
      typingInputRef.current?.focus();
      typingInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentCard, index, studyMode, twoStepStage]);

  function resetCardState() {
    setSelectedAnswer(null);
    setChecked(null);
    setTypingInput("");
    setTwoStepStage(1);
    setFirstStepChecked(null);
    setSecondStepInput("");
    setSecondStepChecked(null);
  }

  function markCardSeen(cardId: string) {
    setSeenTodayIds((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      saveSeenForToday(next);
      return next;
    });
  }

  function restartDeck() {
    setDeck(shuffleArray(filteredCards));
    setIndex(0);
    resetCardState();
    setEndedEarly(false);
    setNotice(null);
  }

  function nextCardWithoutMarkingSeen() {
    if (index + 1 >= deck.length) {
      setIndex(deck.length);
      resetCardState();
      return;
    }

    setIndex((prev) => prev + 1);
    resetCardState();
    setNotice(null);
  }

  function movePastCurrentCard() {
    if (currentCard) {
      markCardSeen(currentCard.id);
    }
    nextCardWithoutMarkingSeen();
  }

  function finishForToday() {
    setEndedEarly(true);
    setIndex(deck.length);
    resetCardState();
  }

  function checkMultipleChoice(choice: string) {
    if (!currentCard || checked) return;

    let correct = currentCard.meaning;
    let ok = false;

    if (studyMode === "reading_mc") {
      correct = currentCard.reading;
      ok = normalizeKana(choice) === normalizeKana(correct);
    }
    else if (studyMode === "meaning_mc" || studyMode === "reading_to_meaning_mc") {
      correct = currentCard.meaning;
      ok = normalizeText(choice) === normalizeText(correct);
    }
    else if (studyMode === "reading_to_kanji_mc") {
      correct = currentCard.surface;
      ok = normalizeText(choice) === normalizeText(correct);
    }

    setSelectedAnswer(choice);
    setChecked({ ok, correct });
  }

  function checkTypingSingle() {
    if (!currentCard || checked) return;

    let correct = currentCard.reading;
    let ok = false;

    if (studyMode === "reading_typing") {
      correct = currentCard.reading;
      ok = normalizeKana(typingInput) === normalizeKana(correct);
    } else if (studyMode === "meaning_typing" || studyMode === "reading_to_meaning_typing") {
      correct = currentCard.meaning;
      ok = matchesAnyMeaning(typingInput, correct);
    }

    setChecked({ ok, correct });
  }

  function checkCompleteStudyStep1() {
    if (!currentCard || firstStepChecked) return;

    const ok = normalizeKana(typingInput) === normalizeKana(currentCard.reading);
    setFirstStepChecked({ ok, correct: currentCard.reading });

    if (ok) {
      setTwoStepStage(2);
      setSecondStepInput("");
    }
  }

  function checkCompleteStudyStep2() {
    if (!currentCard || !firstStepChecked?.ok || secondStepChecked) return;

    const ok = matchesAnyMeaning(secondStepInput, currentCard.meaning);
    setSecondStepChecked({ ok, correct: currentCard.meaning });
  }

  async function flagCurrentCard() {
    if (!currentCard) return;

    const ok = window.confirm("Hide this card from study?");
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_words")
      .update({ hidden: true })
      .eq("id", currentCard.id);

    if (error) {
      console.error("Error hiding study card:", error);
      alert(`Could not flag card.\n${error.message}`);
      return;
    }

    setAllCards((prev) => prev.filter((card) => card.id !== currentCard.id));
    setNotice("Card hidden from study.");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <p className="text-lg text-gray-500">Loading Library Study…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 p-6">
        <p className="text-gray-700">You need to sign in to use Library Study.</p>
        <button onClick={() => router.push("/login")} className="rounded bg-gray-200 px-4 py-2">
          Go to Login
        </button>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 p-6">
        <p className="text-red-700">{errorMsg}</p>
        <button onClick={() => router.push("/books")} className="rounded bg-gray-200 px-4 py-2">
          Back to Library
        </button>
      </main>
    );
  }

  if (allCards.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 p-6">
        <p className="text-2xl font-semibold text-gray-700">
          No saved vocab is ready for Library Study yet.
        </p>
        <button onClick={() => router.push("/books")} className="rounded bg-gray-200 px-4 py-2">
          Back to Library
        </button>
      </main>
    );
  }

  if (filteredCards.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Library Study</h1>
          <p className="mt-3 text-gray-600">
            {selectedJlpt === "all"
              ? "You’ve already studied all available Library Study cards today."
              : "No cards match your current JLPT filter, or you already studied them today."}
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setSelectedJlpt("all")}
              className="rounded bg-gray-700 px-4 py-2 text-white"
            >
              Clear JLPT Filter
            </button>
            <button
              onClick={() => router.push("/books")}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Back to Library
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (index >= deck.length) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">
            {endedEarly ? "Nice work today!" : "Nice work!"}
          </h1>

          {endedEarly ? (
            <>
              <p className="mt-3 text-gray-700">You gave your library some practice.</p>
              <p className="mt-2 text-sm text-gray-500">Come back when you’re ready.</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-gray-700">You finished this Library Study session.</p>
              <p className="mt-2 text-sm text-gray-500">
                Come back tomorrow to run into more old book memories.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => router.push("/books")} className="rounded bg-gray-200 px-4 py-2">
              Back to Library
            </button>
            <button onClick={restartDeck} className="rounded bg-gray-700 px-4 py-2 text-white">
              Refresh Remaining Cards
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-4">
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        <div className="mb-2 text-center">
          <h1 className="text-2xl font-semibold">Library Study</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review saved words from across your books
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">JLPT:</label>
            <select
              value={selectedJlpt}
              onChange={(e) => setSelectedJlpt(e.target.value)}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              <option value="all">All Levels</option>
              <option value="N5">N5</option>
              <option value="N4">N4</option>
              <option value="N3">N3</option>
              <option value="N2">N2</option>
              <option value="N1">N1</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Mode:</label>
            <select
              value={studyMode}
              onChange={(e) => setStudyMode(e.target.value as StudyMode)}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              <option value="reading_typing">Reading Typing</option>
              <option value="meaning_typing">Meaning Typing</option>
              <option value="reading_to_meaning_typing">Reading to Meaning Typing</option>
              <option value="reading_mc">Reading MC</option>
              <option value="meaning_mc">Meaning MC</option>
              <option value="reading_to_kanji_mc">Reading to Kanji MC</option>
              <option value="reading_to_meaning_mc">Reading to Meaning MC</option>
              <option value="complete_study">Complete Study</option>
            </select>
          </div>
        </div>

        {notice ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {notice}
          </div>
        ) : null}

        <p className="mb-3 text-sm text-gray-500">
          Card {index + 1}/{deck.length}
        </p>

        <div className="relative flex min-h-80 w-[90vw] max-w-xl items-center justify-center rounded-2xl border border-slate-500 bg-white p-8 text-center shadow-2xl">
          {currentCard?.jlpt ? (
            <div className="absolute left-4 top-3 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
              {currentCard.jlpt}
            </div>
          ) : null}

          <div className="flex w-full flex-col items-center gap-6">
            {(studyMode === "reading_typing" ||
              studyMode === "reading_mc" ||
              studyMode === "complete_study") && (
                <>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    What is the reading?
                  </div>
                  <div className="text-5xl font-bold">{currentCard?.surface}</div>
                </>
              )}

            {(studyMode === "meaning_typing" || studyMode === "meaning_mc") && (
              <>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  What is the meaning?
                </div>
                <div className="text-5xl font-bold">{currentCard?.surface}</div>
                <div className="text-lg text-slate-500">{currentCard?.reading}</div>
              </>
            )}

            {(studyMode === "reading_to_kanji_mc" ||
              studyMode === "reading_to_meaning_mc" ||
              studyMode === "reading_to_meaning_typing") && (
                <>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {studyMode === "reading_to_kanji_mc"
                      ? "Which word matches this reading?"
                      : "What is the meaning of this reading?"}
                  </div>
                  <div className="text-4xl font-bold">{currentCard?.reading}</div>
                </>
              )}

            {studyMode === "reading_mc" && (
              <div className="flex w-full max-w-sm flex-col gap-3">
                {readingOptions.map((opt, i) => {
                  const isCorrect =
                    !!checked && normalizeKana(opt) === normalizeKana(currentCard!.reading);
                  const isChosen =
                    !!selectedAnswer && normalizeKana(opt) === normalizeKana(selectedAnswer);

                  let className = "w-full rounded border px-4 py-3 text-base ";
                  if (!checked) className += "bg-white hover:bg-gray-50";
                  else if (isCorrect) className += "border-green-400 bg-green-100";
                  else if (isChosen) className += "border-red-400 bg-red-100";
                  else className += "bg-white";

                  return (
                    <button
                      key={`${opt}-${i}`}
                      type="button"
                      disabled={!!checked}
                      onClick={() => checkMultipleChoice(opt)}
                      className={className}
                    >
                      <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {studyMode === "meaning_mc" && (
              <div className="flex w-full max-w-sm flex-col gap-3">
                {meaningOptions.map((opt, i) => {
                  const isCorrect =
                    !!checked && normalizeText(opt) === normalizeText(currentCard!.meaning);
                  const isChosen =
                    !!selectedAnswer && normalizeText(opt) === normalizeText(selectedAnswer);

                  let className = "w-full rounded border px-4 py-3 text-base ";
                  if (!checked) className += "bg-white hover:bg-gray-50";
                  else if (isCorrect) className += "border-green-400 bg-green-100";
                  else if (isChosen) className += "border-red-400 bg-red-100";
                  else className += "bg-white";

                  return (
                    <button
                      key={`${opt}-${i}`}
                      type="button"
                      disabled={!!checked}
                      onClick={() => checkMultipleChoice(opt)}
                      className={className}
                    >
                      <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {studyMode === "reading_to_kanji_mc" && (
              <div className="flex w-full max-w-sm flex-col gap-3">
                {surfaceOptions.map((opt, i) => {
                  const isCorrect =
                    !!checked && normalizeText(opt) === normalizeText(currentCard!.surface);
                  const isChosen =
                    !!selectedAnswer && normalizeText(opt) === normalizeText(selectedAnswer);

                  let className = "w-full rounded border px-4 py-3 text-base ";
                  if (!checked) className += "bg-white hover:bg-gray-50";
                  else if (isCorrect) className += "border-green-400 bg-green-100";
                  else if (isChosen) className += "border-red-400 bg-red-100";
                  else className += "bg-white";

                  return (
                    <button
                      key={`${opt}-${i}`}
                      type="button"
                      disabled={!!checked}
                      onClick={() => checkMultipleChoice(opt)}
                      className={className}
                    >
                      <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {studyMode === "reading_to_meaning_mc" && (
              <div className="flex w-full max-w-sm flex-col gap-3">
                {meaningOptions.map((opt, i) => {
                  const isCorrect =
                    !!checked && normalizeText(opt) === normalizeText(currentCard!.meaning);
                  const isChosen =
                    !!selectedAnswer && normalizeText(opt) === normalizeText(selectedAnswer);

                  let className = "w-full rounded border px-4 py-3 text-base ";
                  if (!checked) className += "bg-white hover:bg-gray-50";
                  else if (isCorrect) className += "border-green-400 bg-green-100";
                  else if (isChosen) className += "border-red-400 bg-red-100";
                  else className += "bg-white";

                  return (
                    <button
                      key={`${opt}-${i}`}
                      type="button"
                      disabled={!!checked}
                      onClick={() => checkMultipleChoice(opt)}
                      className={className}
                    >
                      <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {(studyMode === "reading_typing" ||
              studyMode === "meaning_typing" ||
              studyMode === "reading_to_meaning_typing") && (
                <div className="w-full max-w-sm">
                  <input
                    ref={typingInputRef}
                    value={typingInput}
                    onChange={(e) => setTypingInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;

                      e.preventDefault();
                      e.stopPropagation();

                      if (!checked) {
                        checkTypingSingle();
                      } else if (!checked.ok) {
                        movePastCurrentCard();
                      }
                    }}
                    placeholder={
                      studyMode === "reading_typing"
                        ? "Type the reading"
                        : "Type the meaning"
                    }
                    className="w-full rounded border px-4 py-3 text-base"
                    disabled={!!checked}
                  />

                  {!checked ? (
                    <div className="mt-3 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={checkTypingSingle}
                        className="rounded bg-gray-700 px-4 py-2 text-white"
                      >
                        Check
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

            {studyMode === "complete_study" && (
              <div className="w-full max-w-sm">
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-sm text-gray-500">Step 1: Reading</div>
                    <input
                      ref={twoStepStage === 1 ? typingInputRef : null}
                      value={typingInput}
                      onChange={(e) => setTypingInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;

                        e.preventDefault();
                        e.stopPropagation();

                        if (!firstStepChecked) {
                          checkCompleteStudyStep1();
                        } else if (!firstStepChecked.ok) {
                          movePastCurrentCard();
                        }
                      }}
                      placeholder="Type the reading"
                      className="w-full rounded border px-4 py-3 text-base"
                      disabled={!!firstStepChecked}
                    />
                    <div className="mt-2">
                      {!firstStepChecked ? (
                        <button
                          type="button"
                          onClick={checkCompleteStudyStep1}
                          className="rounded bg-gray-700 px-4 py-2 text-white"
                        >
                          Check Reading
                        </button>
                      ) : firstStepChecked.ok ? (
                        <p className="text-green-700">✅ Reading correct!</p>
                      ) : (
                        <>
                          <p className="text-red-700">❌ Reading: {firstStepChecked.correct}</p>
                          <div className="mt-3 flex justify-center">
                            <button
                              type="button"
                              onClick={movePastCurrentCard}
                              className="rounded bg-gray-700 px-4 py-2 text-white"
                            >
                              Next
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-sm text-gray-500">Step 2: Meaning</div>
                    <input
                      ref={twoStepStage === 2 ? typingInputRef : null}
                      value={secondStepInput}
                      onChange={(e) => setSecondStepInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;

                        e.preventDefault();
                        e.stopPropagation();

                        if (firstStepChecked?.ok && !secondStepChecked) {
                          checkCompleteStudyStep2();
                        } else if (secondStepChecked && !secondStepChecked.ok) {
                          movePastCurrentCard();
                        }
                      }}
                      placeholder="Type the meaning"
                      className="w-full rounded border px-4 py-3 text-base"
                      disabled={!firstStepChecked?.ok || !!secondStepChecked}
                    />
                    <div className="mt-2">
                      {!secondStepChecked ? (
                        <button
                          type="button"
                          onClick={checkCompleteStudyStep2}
                          disabled={!firstStepChecked?.ok}
                          className="rounded bg-gray-700 px-4 py-2 text-white disabled:opacity-50"
                        >
                          Check Meaning
                        </button>
                      ) : secondStepChecked.ok ? (
                        <p className="text-green-700">✅ Meaning correct!</p>
                      ) : (
                        <>
                          <p className="text-red-700">❌ Meaning: {secondStepChecked.correct}</p>
                          <div className="mt-3 flex justify-center">
                            <button
                              type="button"
                              onClick={movePastCurrentCard}
                              className="rounded bg-gray-700 px-4 py-2 text-white"
                            >
                              Next
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {studyMode !== "complete_study" && checked ? (
              <div className="mt-2 w-full max-w-sm text-center text-sm">
                {checked.ok ? (
                  <p className="text-green-700">✅ Correct!</p>
                ) : (
                  <>
                    <p className="text-red-700">❌ Not quite.</p>
                    <p className="mt-1 text-gray-600">Correct answer: {checked.correct}</p>
                  </>
                )}

                <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
                  <div className="text-lg font-semibold">{currentCard?.surface}</div>
                  <div className="mt-1 text-sm text-slate-500">{currentCard?.reading}</div>
                  <div className="mt-1 text-sm text-slate-700">{currentCard?.meaning}</div>
                  <div className="mt-2 text-xs text-slate-500">From: {currentCard?.bookTitle}</div>
                </div>

                {!checked.ok ? (
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={movePastCurrentCard}
                      className="rounded bg-gray-700 px-4 py-2 text-white"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {studyMode === "complete_study" && secondStepChecked ? (
              <div className="mt-2 w-full max-w-sm text-center text-sm">
                <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
                  <div className="text-lg font-semibold">{currentCard?.surface}</div>
                  <div className="mt-1 text-sm text-slate-500">{currentCard?.reading}</div>
                  <div className="mt-1 text-sm text-slate-700">{currentCard?.meaning}</div>
                  <div className="mt-2 text-xs text-slate-500">From: {currentCard?.bookTitle}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/books")}
            className="rounded bg-gray-200 px-4 py-2"
          >
            Back to Library
          </button>

          <button
            type="button"
            onClick={() => router.push(`/books/${currentCard?.userBookId}`)}
            className="rounded bg-gray-200 px-4 py-2"
          >
            Open Book
          </button>

          <button
            type="button"
            onClick={flagCurrentCard}
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800"
          >
            Flag this card
          </button>

          <button
            type="button"
            onClick={finishForToday}
            className="rounded bg-gray-700 px-4 py-2 text-white"
          >
            Finish for Today
          </button>
        </div>
      </div>
    </main>
  );
}