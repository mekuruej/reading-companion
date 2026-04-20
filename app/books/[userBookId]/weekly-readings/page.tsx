"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type UserBookWordRow = {
  id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  created_at: string;
  hidden: boolean | null;
  vocabulary_cache_id: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  page_number: number | null;
};

type QuizCard = {
  key: string;
  kanjiMapId: number;
  kanji: string;
  reading: string;
  readingType: "onyomi" | "kunyomi" | "other" | null;
  sourceWord: string;
  sourceMeaning: string | null;
  sourceReading: string | null;
  strokeCount: number | null;
  radical: string | null;
  radicalName: string | null;
  chapterNumber: number | null;
  chapterName: string | null;
  pageNumber: number | null;
  baseReading: string | null;
};

type RecallResult = "correct" | "wrong" | "shown" | null;

function readingTypeLabel(val: "onyomi" | "kunyomi" | "other" | null | string) {
  const v = (val ?? "").toLowerCase().trim();
  if (v === "onyomi") return "Onyomi";
  if (v === "kunyomi") return "Kunyomi";
  if (v === "other") return "Other";
  return v ? v : "";
}

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeReading(s: string) {
  return (s ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[・･]/g, "")
    .toLowerCase();
}

function normalizeWord(s: string) {
  return (s ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[・･]/g, "")
    .toLowerCase();
}

function hiraToKata(s: string) {
  return (s ?? "").replace(/[ぁ-ゖ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function kataToHira(s: string) {
  return (s ?? "").replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function formatReadingForType(
  reading: string,
  readingType: "onyomi" | "kunyomi" | "other" | null
) {
  if (!reading) return "";
  if (readingType === "onyomi") return hiraToKata(kataToHira(reading));
  if (readingType === "kunyomi") return kataToHira(reading);
  return reading;
}

function getKanjiPositionHint(sourceWord: string, kanji: string) {
  if (!sourceWord || !kanji) return "";

  const chars = Array.from(sourceWord);
  const index = chars.findIndex((ch) => ch === kanji);

  if (index === -1) return "";
  return `${index + 1} of ${chars.length}`;
}

function isKunWithOkurigana(surface: string) {
  const hasKanji = /[\p{Script=Han}]/u.test(surface);
  const hasHiragana = /[\p{Script=Hiragana}]/u.test(surface);
  return hasKanji && hasHiragana;
}

function getTrailingReadingHint(sourceWord: string, kanji: string) {
  if (!sourceWord || !kanji) return "";

  const chars = Array.from(sourceWord);
  const index = chars.findIndex((ch) => ch === kanji);

  if (index === -1) return "";
  return chars.filter((_, i) => i !== index).join("");
}

export default function WeeklyReadingsPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState<string | null>(null);

  const [baseCards, setBaseCards] = useState<QuizCard[]>([]);
  const [deck, setDeck] = useState<QuizCard[]>([]);
  const [index, setIndex] = useState(0);

  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState<null | { ok: boolean; correct: string }>(null);

  const [guessInput, setGuessInput] = useState("");
  const [recallRevealed, setRecallRevealed] = useState(false);
  const [recallResult, setRecallResult] = useState<RecallResult>(null);
  const [skipTypingThisSession, setSkipTypingThisSession] = useState(false);
  const [endedEarly, setEndedEarly] = useState(false);
  const [usedRecallWords, setUsedRecallWords] = useState<string[]>([]);
  const [cardsSinceLastRecall, setCardsSinceLastRecall] = useState(0);

  const [notice, setNotice] = useState<string | null>(null);

  const [studyOnyomi, setStudyOnyomi] = useState(false);
  const [studyKunyomi, setStudyKunyomi] = useState(false);
  const [chapterFilter, setChapterFilter] = useState<string>("all");

  const canAccessKanjiPractice = true;

  const availableChapters = useMemo(() => {
    return Array.from(
      new Set(
        baseCards
          .map((c) => c.chapterNumber)
          .filter((n): n is number => n != null)
      )
    ).sort((a, b) => a - b);
  }, [baseCards]);

  const wordReadingKinds = useMemo(() => {
    const byWord = new Map<string, Set<"onyomi" | "kunyomi">>();

    for (const card of baseCards) {
      const word = (card.sourceWord ?? "").trim();
      if (!word) continue;
      if (card.readingType !== "onyomi" && card.readingType !== "kunyomi") continue;

      const bucket = byWord.get(word) ?? new Set<"onyomi" | "kunyomi">();
      bucket.add(card.readingType);
      byWord.set(word, bucket);
    }

    return byWord;
  }, [baseCards]);

  const filteredBaseCards = useMemo(() => {
    return baseCards.filter((card) => {
      if (chapterFilter !== "all" && String(card.chapterNumber ?? "") !== chapterFilter) {
        return false;
      }

      if (!studyOnyomi && !studyKunyomi) {
        return true;
      }

      const word = (card.sourceWord ?? "").trim();
      const kinds = word ? wordReadingKinds.get(word) : null;
      const isMixed =
        !!kinds && kinds.has("onyomi") && kinds.has("kunyomi");

      if (isMixed) {
        return false;
      }

      if (studyOnyomi && studyKunyomi) {
        return card.readingType === "onyomi" || card.readingType === "kunyomi";
      }

      if (studyOnyomi) {
        return card.readingType === "onyomi";
      }

      if (studyKunyomi) {
        return card.readingType === "kunyomi";
      }

      return true;
    });
  }, [baseCards, chapterFilter, studyOnyomi, studyKunyomi, wordReadingKinds]);

  useEffect(() => {
    buildDeckFromCards(filteredBaseCards);
    setSkipTypingThisSession(false);
    setEndedEarly(false);
    setUsedRecallWords([]);
    setCardsSinceLastRecall(0);
  }, [filteredBaseCards]);

  useEffect(() => {
    if (!userBookId) return;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      setNeedsSignIn(false);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          setNeedsSignIn(true);
          setLoading(false);
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
        setBookCover((ub as any)?.books?.cover_url ?? null);

        const { data: rows, error: cardsErr } = await supabase
          .from("user_book_words")
          .select(
            "id, surface, reading, meaning, created_at, hidden, vocabulary_cache_id, chapter_number, chapter_name, page_number"
          )
          .eq("user_book_id", userBookId)
          .not("reading", "is", null)
          .eq("hidden", false)
          .order("created_at", { ascending: true })
          .returns<UserBookWordRow[]>();

        if (cardsErr) throw cardsErr;

        const vocabularyCacheIds = Array.from(
          new Set(
            (rows ?? [])
              .map((r) => r.vocabulary_cache_id)
              .filter((id): id is number => id != null)
          )
        );

        const { data: kanjiMapRows, error: kanjiMapErr } = await supabase
          .from("vocabulary_kanji_map")
          .select(
            "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading, excluded_from_kanji_practice"
          )
          .in("vocabulary_cache_id", vocabularyCacheIds)
          .eq("excluded_from_kanji_practice", false);

        if (kanjiMapErr) throw kanjiMapErr;

        const kanjiMapByCacheId = new Map<number, any[]>();

        for (const row of kanjiMapRows ?? []) {
          const bucket = kanjiMapByCacheId.get(row.vocabulary_cache_id) ?? [];
          bucket.push(row);
          kanjiMapByCacheId.set(row.vocabulary_cache_id, bucket);
        }

        const core: QuizCard[] = (rows ?? []).flatMap((r) => {
          const surface = r.surface?.trim() ?? "";
          const fallbackReading = r.reading?.trim() ?? "";

          if (!surface || !fallbackReading) return [];

          const cacheId = r.vocabulary_cache_id;
          const kanjiRows = cacheId != null ? kanjiMapByCacheId.get(cacheId) ?? [] : [];

          if (kanjiRows.length === 0) return [];

          return kanjiRows.map((km: any, i: number) => {
            const readingType: QuizCard["readingType"] =
              km.reading_type === "on"
                ? "onyomi"
                : km.reading_type === "kun"
                  ? "kunyomi"
                  : km.reading_type === "other"
                    ? "other"
                    : null;

            return {
              key: `${r.id}-${km.kanji}-${i}`,
              kanjiMapId: km.id,
              kanji: km.kanji,
              reading: km.realized_reading?.trim() || km.base_reading?.trim() || "",
              baseReading: km.base_reading?.trim() || null,
              readingType,
              sourceWord: surface,
              sourceMeaning: r.meaning ?? null,
              sourceReading: r.reading ?? null,
              strokeCount: null,
              radical: null,
              radicalName: null,
              chapterNumber: r.chapter_number ?? null,
              chapterName: r.chapter_name ?? null,
              pageNumber: r.page_number ?? null,
            };
          });
        });

        setBaseCards(core);

        await supabase
          .from("user_books")
          .update({ weekly_readings_last_seen_at: new Date().toISOString() })
          .eq("id", userBookId);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load readings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userBookId]);

  const card = deck[index];

  const isSmallSet =
    chapterFilter !== "all" &&
    filteredBaseCards.length > 0 &&
    filteredBaseCards.length < 8;

  const kanjiPositionHint =
    card ? getKanjiPositionHint(card.sourceWord, card.kanji) : "";

  const canStartRecall =
    !!card &&
    !!checked &&
    checked.ok &&
    !skipTypingThisSession &&
    cardsSinceLastRecall >= 4 &&
    !!card.sourceWord &&
    !usedRecallWords.includes(normalizeWord(card.sourceWord));

  const inRecallFlow =
    !!card &&
    !!checked &&
    checked.ok &&
    !skipTypingThisSession &&
    !!card.sourceWord &&
    (recallRevealed || canStartRecall);

  const options = useMemo(() => {
    if (!card || filteredBaseCards.length === 0) return [];

    const correct = card.reading;
    const displayType = card.readingType;
    const normalizedCorrect = normalizeReading(correct);

    const sameTypePool = Array.from(
      new Set(
        filteredBaseCards
          .filter(
            (c) =>
              c.key !== card.key &&
              !!c.reading &&
              c.readingType === card.readingType &&
              normalizeReading(c.reading) !== normalizedCorrect
          )
          .map((c) => c.reading.trim())
          .filter(Boolean)
      )
    );

    const broaderPool = Array.from(
      new Set(
        filteredBaseCards
          .filter(
            (c) =>
              c.key !== card.key &&
              !!c.reading &&
              normalizeReading(c.reading) !== normalizedCorrect
          )
          .map((c) => c.reading.trim())
          .filter(Boolean)
      )
    );

    const distractors: string[] = [];

    for (const r of shuffleArray(sameTypePool)) {
      if (!distractors.includes(r)) distractors.push(r);
      if (distractors.length >= 2) break;
    }

    if (distractors.length < 2) {
      for (const r of shuffleArray(broaderPool)) {
        if (!distractors.includes(r)) distractors.push(r);
        if (distractors.length >= 2) break;
      }
    }

    return shuffleArray([correct, ...distractors])
      .filter(Boolean)
      .map((r) => formatReadingForType(r, displayType));
  }, [card, filteredBaseCards]);

  useEffect(() => {
    if (!checked?.ok) return;
    if (inRecallFlow) return;

    const timer = window.setTimeout(() => {
      nextCard();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [checked, inRecallFlow]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!card) return;
      if (inRecallFlow) return;

      if (checked && e.key === "Enter") {
        e.preventDefault();
        nextCard();
        return;
      }

      if (!checked) {
        if (e.key === "1" && options[0]) checkAnswer(options[0]);
        if (e.key === "2" && options[1]) checkAnswer(options[1]);
        if (e.key === "3" && options[2]) checkAnswer(options[2]);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [card, checked, options, inRecallFlow]);

  async function flagKanjiCardForReview(cardToFlag: QuizCard) {
    const flaggedAt = new Date().toISOString();

    const { error } = await supabase
      .from("vocabulary_kanji_map")
      .update({
        flagged_for_review: true,
        excluded_from_kanji_practice: true,
        flagged_by_user_id: null,
        flagged_at: flaggedAt,
      })
      .eq("id", cardToFlag.kanjiMapId);

    if (error) {
      console.error("Error flagging kanji card:", error);
      return;
    }

    const { data: authForAlert } = await supabase.auth.getUser();
    const superTeacherId = authForAlert?.user?.id;
    if (!superTeacherId) return;

    const { error: alertError } = await supabase.from("user_alerts").insert({
      user_id: superTeacherId,
      user_book_id: userBookId,
      type: "kanji_flag",
      message: `Kanji reading flagged: ${cardToFlag.kanji} in ${cardToFlag.sourceWord}`,
    });

    if (alertError) {
      console.error("Error creating kanji flag alert:", alertError);
    }

    setNotice("✅ Flagged for review");
    setDeck((prev) => prev.filter((c) => c.kanjiMapId !== cardToFlag.kanjiMapId));
    setBaseCards((prev) => prev.filter((c) => c.kanjiMapId !== cardToFlag.kanjiMapId));
  }

  function resetCardState() {
    setSelected(null);
    setChecked(null);
    setGuessInput("");
    setRecallRevealed(false);
    setRecallResult(null);
  }

  function buildDeckFromCards(cards: QuizCard[]) {
    if (cards.length === 0) {
      setDeck([]);
      setIndex(0);
      resetCardState();
      return;
    }

    const firstRound = shuffleArray(cards).map((c, i) => ({
      ...c,
      key: `${c.key}-deck-first-${i}`,
    }));

    const repeatsNeeded = Math.max(40 - firstRound.length, 0);
    const repeatPool: QuizCard[] = [];

    for (let i = 0; i < repeatsNeeded; i++) {
      const picked = cards[Math.floor(Math.random() * cards.length)];
      repeatPool.push({
        ...picked,
        key: `${picked.key}-deck-repeat-${i}`,
      });
    }

    setDeck([...firstRound, ...shuffleArray(repeatPool)]);
    setIndex(0);
    resetCardState();
  }

  function restartDeck() {
    buildDeckFromCards(filteredBaseCards);
    setSkipTypingThisSession(false);
    setEndedEarly(false);
    setUsedRecallWords([]);
    setCardsSinceLastRecall(0);
  }

  function checkAnswer(choice: string) {
    if (!card || checked) return;

    const displayedCorrect = formatReadingForType(card.reading, card.readingType);
    const ok = normalizeReading(choice) === normalizeReading(displayedCorrect);
    setSelected(choice);
    setChecked({ ok, correct: displayedCorrect });
    setGuessInput("");
    setRecallRevealed(false);
    setRecallResult(null);
  }

  function revealRecallCard(mode: Exclude<RecallResult, null>) {
    if (card?.sourceWord) {
      const normalized = normalizeWord(card.sourceWord);
      setUsedRecallWords((prev) =>
        prev.includes(normalized) ? prev : [...prev, normalized]
      );
    }

    setRecallResult(mode);
    setRecallRevealed(true);
    setCardsSinceLastRecall(0);
  }

  function submitGuess() {
    if (!card || !inRecallFlow || recallRevealed) return;

    const typed = normalizeWord(guessInput);
    const answer = normalizeWord(card.sourceWord);

    if (!typed) {
      revealRecallCard("shown");
      return;
    }

    if (typed === answer) {
      revealRecallCard("correct");
    } else {
      revealRecallCard("wrong");
    }
  }

  function nextCard() {
    if (index + 1 >= deck.length) {
      setIndex(deck.length);
      resetCardState();
      setEndedEarly(false);
      return;
    }

    const shouldCountNormalCorrect = !!checked?.ok && !recallRevealed;

    setIndex((prev) => prev + 1);
    resetCardState();

    if (shouldCountNormalCorrect) {
      setCardsSinceLastRecall((prev) => prev + 1);
    }
  }

  function finishForToday() {
    setEndedEarly(true);
    setIndex(deck.length);
    resetCardState();
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-lg text-gray-500">Loading your readings…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">You need to sign in to view your readings.</p>
        <button
          onClick={() => router.push("/books")}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Back to Books
        </button>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-700">{errorMsg}</p>
        <button
          onClick={() => router.push(`/books/${userBookId}/study`)}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Back to Study
        </button>
      </main>
    );
  }

  if (baseCards.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="mb-8 text-2xl font-semibold text-gray-700">
          No saved vocab with readings is available yet for this book.
        </p>
        <button
          onClick={() => router.push(`/books/${userBookId}`)}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Back to Book Hub
        </button>
      </main>
    );
  }

  if (!canAccessKanjiPractice) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-stone-900">
                Kanji Readings Practice
              </h1>
              <span className="rounded-full border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                Preview
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-stone-600">
              Practice kanji readings based on the vocabulary saved from your book.
              This study area helps learners notice how readings show up inside real
              words, not just in isolation.
            </p>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Example Exercise
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <div className="text-2xl font-semibold text-stone-900">気配</div>
              <div className="mt-2 text-sm text-stone-500">
                What is the reading of this word?
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-700"
                >
                  きはい
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-700"
                >
                  けはい
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-700"
                >
                  きばい
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-700"
                >
                  けばい
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-xl">🔒</div>
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  Available to students
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Kanji Readings Practice is part of Mekuru student study support and
                  includes teacher-guided enrichment based on your book’s vocabulary.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (index >= deck.length) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">
            {endedEarly ? "Nice work today!" : "Nice work!"}
          </h1>

          {endedEarly ? (
            <>
              <p className="mt-3 text-gray-700">You gave these readings some practice.</p>
              <p className="mt-2 text-sm text-gray-500">Come back when you’re ready.</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-gray-700">You’re more ready for more readings.</p>
              <p className="mt-2 text-sm text-gray-500">
                Come back tomorrow to reinforce the readings.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push(`/books`)}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Back to Library
            </button>
            <button
              onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
              className="whitespace-nowrap rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-800"
            >
              Book Hub
            </button>
            <button
              onClick={() => router.push(`/books/${userBookId}/study`)}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Back to Study
            </button>
            <button
              onClick={restartDeck}
              className="rounded bg-gray-700 px-4 py-2 text-white"
            >
              {endedEarly ? "Do More Today" : "Do It Again"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-100 px-6 py-4">
      <div className="mb-1 flex w-full max-w-5xl flex-col items-center justify-center gap-8 md:flex-row">
        <div className="flex shrink-0 flex-col items-center md:mt-4">
          {bookCover ? (
            <img src={bookCover} alt="" className="mb-2 h-32 w-24 rounded object-cover" />
          ) : null}
          <h1 className="text-center text-2xl font-semibold">{bookTitle}</h1>
        </div>

        <div className="flex w-full items-center md:w-[430px]">
          <p className="text-left text-[15px] leading-7 text-gray-500">
            These readings come from words you’ve saved while reading. They’ll help you
            recognize patterns, reinforce what you’ve seen, and prepare you for the next
            words you meet.
          </p>
        </div>
      </div>

      <p className="mt-1 text-sm text-gray-500">Practice Kanji Readings</p>
      <p className="text-sm text-gray-500">
        Card {index + 1}/{deck.length}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <label className="text-sm text-gray-600">Chapter:</label>
        <select
          value={chapterFilter}
          onChange={(e) => setChapterFilter(e.target.value)}
          className="rounded border bg-white px-3 py-2 text-sm"
        >
          <option value="all">All chapters</option>
          {availableChapters.map((ch) => (
            <option key={ch} value={String(ch)}>
              Chapter {ch}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-stone-700">Study:</span>

        <label className="inline-flex items-center gap-2 text-stone-700">
          <input
            type="checkbox"
            checked={studyOnyomi}
            onChange={(e) => setStudyOnyomi(e.target.checked)}
          />
          <span>Onyomi</span>
        </label>

        <label className="inline-flex items-center gap-2 text-stone-700">
          <input
            type="checkbox"
            checked={studyKunyomi}
            onChange={(e) => setStudyKunyomi(e.target.checked)}
          />
          <span>Kunyomi</span>
        </label>
      </div>

      {isSmallSet && (
        <p className="mt-2 text-center text-sm text-amber-600">
          Only {filteredBaseCards.length} card
          {filteredBaseCards.length === 1 ? "" : "s"} in this chapter — reviewing all
          available.
        </p>
      )}

      {notice ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      <div
        className="relative mt-6 flex min-h-72 w-[90vw] max-w-xl select-none items-center justify-center rounded-2xl border border-slate-500 bg-white p-8 text-center shadow-2xl"
        onClick={() => {
          if (!checked && !inRecallFlow) return;
          if (inRecallFlow) return;
          if (checked) nextCard();
        }}
      >
        {card.readingType ? (
          <div className="absolute left-4 top-3 z-10 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
            {readingTypeLabel(card.readingType)}
          </div>
        ) : null}

        {card.strokeCount != null || card.radical || card.radicalName ? (
          <div className="absolute right-4 top-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
            <div className="flex flex-col items-end leading-none">
              <div className="text-sm font-medium">
                {card.kanji} {card.strokeCount ?? ""}
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                {card.radical ? `radical: ${card.radical}` : ""}
                {card.radicalName ? ` (${card.radicalName})` : ""}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex w-full flex-col items-center justify-center gap-6">
          <div className="flex w-full flex-col items-center gap-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Kanji</div>
            <div className="text-5xl font-bold">
              {card.kanji}
              {(card.readingType === "other" ||
                (card.readingType === "kunyomi" && isKunWithOkurigana(card.sourceWord))) &&
              card.sourceWord ? (
                <span className="ml-1 font-medium text-slate-300">
                  {getTrailingReadingHint(card.sourceWord, card.kanji)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3">
            {options.length < 2 ? (
              <div className="text-sm text-amber-700">
                Not enough answer choices for this card. Skip to the next one.
              </div>
            ) : (
              options.map((opt, i) => {
                const displayedCorrect = formatReadingForType(card.reading, card.readingType);

                const isCorrect =
                  !!checked && normalizeReading(opt) === normalizeReading(displayedCorrect);
                const isChosen =
                  !!selected && normalizeReading(opt) === normalizeReading(selected);

                let className = "w-full rounded border px-4 py-3 text-base ";

                if (!checked) {
                  className += "bg-white hover:bg-gray-50";
                } else if (isCorrect && isChosen) {
                  className += "border-green-400 bg-green-100";
                } else if (isCorrect) {
                  className += "border-green-400 bg-green-100";
                } else if (isChosen) {
                  className += "border-red-400 bg-red-100";
                } else {
                  className += "bg-white";
                }

                return (
                  <button
                    key={`${opt}-${i}`}
                    type="button"
                    disabled={!!checked}
                    onClick={(e) => {
                      e.stopPropagation();
                      checkAnswer(opt);
                    }}
                    className={className}
                  >
                    <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                    {opt}
                  </button>
                );
              })
            )}
          </div>

          {checked ? (
            <div className="mt-2 w-full max-w-sm text-center text-sm">
              {checked.ok ? (
                <>
                  <p className="text-green-700">✅ Correct!</p>
                  {card.readingType === "kunyomi" &&
                  isKunWithOkurigana(card.sourceWord) &&
                  card.baseReading &&
                  normalizeReading(card.baseReading) !== normalizeReading(card.reading) ? (
                    <p className="mt-1 text-gray-600">Base reading: {card.baseReading}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-red-700">❌ Not quite.</p>
                  <p className="mt-1 text-gray-600">Correct answer: {checked.correct}</p>
                  {card.readingType === "kunyomi" &&
                  isKunWithOkurigana(card.sourceWord) &&
                  card.baseReading &&
                  normalizeReading(card.baseReading) !== normalizeReading(card.reading) ? (
                    <p className="mt-1 text-gray-600">Base reading: {card.baseReading}</p>
                  ) : null}
                </>
              )}

              {!inRecallFlow ? (
                <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
                  <div className="text-lg font-semibold">{card.sourceWord}</div>
                  {card.sourceReading ? (
                    <div className="mt-1 text-sm text-slate-500">{card.sourceReading}</div>
                  ) : null}
                  {card.sourceMeaning ? (
                    <div className="mt-1 text-sm text-slate-700">{card.sourceMeaning}</div>
                  ) : null}
                </div>
              ) : null}

              {inRecallFlow ? (
                <div
                  className="mt-4 rounded-xl border bg-slate-50 p-4 text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!recallRevealed ? (
                    <>
                      <p className="text-center text-sm font-medium text-slate-800">
                        Can you guess the word with this kanji?
                      </p>

                      {kanjiPositionHint ? (
                        <p className="mt-1 text-center text-xs text-slate-500">
                          Hint: This kanji is character {kanjiPositionHint} in the word.
                        </p>
                      ) : null}

                      <input
                        type="text"
                        value={guessInput}
                        onChange={(e) => setGuessInput(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        placeholder="Type your guess"
                        className="mt-3 w-full rounded border px-3 py-2 text-base"
                      />

                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            submitGuess();
                          }}
                          className="rounded bg-gray-700 px-4 py-2 text-white"
                        >
                          Check
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            revealRecallCard("shown");
                          }}
                          className="rounded bg-gray-200 px-4 py-2"
                        >
                          Show me
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-center text-sm font-medium text-slate-800">
                        {recallResult === "correct"
                          ? "✅ Nice!"
                          : recallResult === "wrong"
                            ? "❌ Not quite."
                            : "Shown"}
                      </p>

                      <div className="mt-3 rounded-xl border bg-white p-3 text-center">
                        <div className="text-lg font-semibold">{card.sourceWord}</div>
                        {card.sourceReading ? (
                          <div className="mt-1 text-sm text-slate-500">{card.sourceReading}</div>
                        ) : null}
                        {card.sourceMeaning ? (
                          <div className="mt-1 text-sm text-slate-700">{card.sourceMeaning}</div>
                        ) : null}
                      </div>

                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            nextCard();
                          }}
                          className="rounded bg-gray-700 px-4 py-2 text-white"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Book Hub
        </button>

        <button
          type="button"
          onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}/study`)}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Back to Study
        </button>

        <button
          type="button"
          onClick={finishForToday}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Finish for Today
        </button>

        <button
          type="button"
          onClick={() => flagKanjiCardForReview(card)}
          className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800"
        >
          Flag for Review
        </button>
      </div>
    </main>
  );
}