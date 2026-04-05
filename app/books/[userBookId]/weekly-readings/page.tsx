// Readings Flashcards
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
};

type QuizCard = {
  key: string;
  kanji: string;
  reading: string;
  readingType: "onyomi" | "kunyomi" | "other" | null;
  sourceWord: string;
  sourceMeaning: string | null;
  sourceReading: string | null;
  strokeCount: number | null;
  radical: string | null;
  radicalName: string | null;
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
          .select("id, surface, reading, meaning, created_at, hidden, vocabulary_cache_id")
          .eq("user_book_id", userBookId)
          .not("reading", "is", null)
          .eq("hidden", false)
          .order("created_at", { ascending: true })
          .returns<UserBookWordRow[]>();

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
            "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading, created_at"
          )
          .in("vocabulary_cache_id", vocabularyCacheIds)
          .order("created_at", { ascending: false })
          .limit(100);

        if (kanjiMapErr) throw kanjiMapErr;

        const kanjiMapByCacheId = new Map<number, any[]>();

        for (const row of kanjiMapRows ?? []) {
          const bucket = kanjiMapByCacheId.get(row.vocabulary_cache_id) ?? [];
          bucket.push(row);
          kanjiMapByCacheId.set(row.vocabulary_cache_id, bucket);
        }

        if (cardsErr) throw cardsErr;

        const sourceWords = Array.from(
          new Set((rows ?? []).map((r) => r.surface?.trim()).filter(Boolean))
        ) as string[];

        const sourceWordMap = new Map<string, { meaning: string | null; reading: string | null }>();

        const core: QuizCard[] = (rows ?? []).flatMap((r) => {
          const surface = r.surface?.trim() ?? "";
          const fallbackReading = r.reading?.trim() ?? "";

          if (surface.length === 0 || fallbackReading.length === 0) {
            return [];
          }

          const cacheId = r.vocabulary_cache_id;
          const kanjiRows =
            cacheId != null ? (kanjiMapByCacheId.get(cacheId) ?? []) : [];

          if (kanjiRows.length > 0) {
            return kanjiRows.map((km: any, i: number) => ({
              key: `${r.id}-${km.kanji}-${i}`,
              kanji: km.kanji,
              reading: km.realized_reading?.trim() || km.base_reading?.trim() || "",
              readingType:
                km.reading_type === "on"
                  ? "onyomi"
                  : km.reading_type === "kun"
                    ? "kunyomi"
                    : km.reading_type === "other"
                      ? "other"
                      : null,
              sourceWord: surface,
              sourceMeaning: r.meaning ?? null,
              sourceReading: r.reading ?? null,
              strokeCount: null,
              radical: null,
              radicalName: null,
            }));
          }

          return [];
        });

        setBaseCards(core);

        if (core.length > 0) {
          const firstRound = shuffleArray(core).map((c, i) => ({
            ...c,
            key: `${c.key}-first-${i}`,
          }));

          const repeatsNeeded = Math.max(40 - firstRound.length, 0);
          const repeatPool: QuizCard[] = [];

          for (let i = 0; i < repeatsNeeded; i++) {
            const picked = core[Math.floor(Math.random() * core.length)];
            repeatPool.push({
              ...picked,
              key: `${picked.key}-repeat-${i}`,
            });
          }

          const finalDeck = [...firstRound, ...shuffleArray(repeatPool)];
          setDeck(finalDeck);
        } else {
          setDeck([]);
        }

        await supabase
          .from("user_books")
          .update({ weekly_readings_last_seen_at: new Date().toISOString() })
          .eq("id", userBookId);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load weekly readings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userBookId]);

  const card = deck[index];

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
    if (!card || baseCards.length === 0) return [];

    const correct = card.reading;
    const displayType = card.readingType;

    const distractorPool = Array.from(
      new Set(
        baseCards
          .map((c) => c.reading)
          .filter((r) => normalizeReading(r) !== normalizeReading(correct))
      )
    );

    const shuffled = shuffleArray(distractorPool).slice(0, 2);

    return shuffleArray([correct, ...shuffled]).map((r) =>
      formatReadingForType(r, displayType)
    );
  }, [card, baseCards, index]);

  function resetCardState() {
    setSelected(null);
    setChecked(null);
    setGuessInput("");
    setRecallRevealed(false);
    setRecallResult(null);
  }

  function restartDeck() {
    const firstRound = shuffleArray(baseCards).map((c, i) => ({
      ...c,
      key: `${c.key}-restart-first-${i}`,
    }));

    const repeatsNeeded = Math.max(40 - firstRound.length, 0);
    const repeatPool: QuizCard[] = [];

    for (let i = 0; i < repeatsNeeded; i++) {
      const picked = baseCards[Math.floor(Math.random() * baseCards.length)];
      repeatPool.push({
        ...picked,
        key: `${picked.key}-restart-repeat-${i}`,
      });
    }

    setDeck([...firstRound, ...shuffleArray(repeatPool)]);
    setIndex(0);
    resetCardState();
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
    setChecked({ ok, correct: formatReadingForType(card.reading, card.readingType) });
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

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!card) return;

      if (inRecallFlow) {
        return;
      }

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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-lg text-gray-500">Loading this week’s readings…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">You need to sign in to view this week’s readings.</p>
        <button
          onClick={() => router.push("/books")}
          className="px-4 py-2 bg-gray-200 rounded"
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
          className="px-4 py-2 bg-gray-200 rounded"
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
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Back to Book Hub
        </button>
      </main>
    );
  }

  if (index >= deck.length) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl border rounded-2xl bg-white p-8 text-center shadow-sm">
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
              <p className="mt-3 text-gray-700">You’re more ready for this week’s reading.</p>
              <p className="mt-2 text-sm text-gray-500">
                Come back tomorrow to reinforce the readings.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push(`/books`)}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Back to Library
            </button>
            <button
              onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
              className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm whitespace-nowrap"
            >
              Book Hub
            </button>
            <button
              onClick={() => router.push(`/books/${userBookId}/study`)}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Back to Study
            </button>

            <button
              onClick={restartDeck}
              className="px-4 py-2 bg-gray-700 text-white rounded"
            >
              {endedEarly ? "Do More Today" : "Do It Again"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-4 bg-slate-100">
      <div className="w-full max-w-5xl mb-1 flex flex-col md:flex-row items-center justify-center gap-8">
        <div className="flex flex-col items-center shrink-0 md:mt-4">
          {bookCover ? (
            <img src={bookCover} alt="" className="w-24 h-32 rounded mb-2 object-cover" />
          ) : null}
          <h1 className="text-2xl font-semibold text-center">{bookTitle}</h1>
        </div>

        <div className="w-full md:w-[430px] flex items-center">
          <p className="text-[15px] text-gray-500 text-left leading-7">
            These readings come from words you’ve saved while reading. They’ll help you recognize patterns, reinforce what you’ve seen, and prepare you for the next words you meet.
          </p>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">Practice Kanji Readings</p>
      <p className="text-sm text-gray-500">
        Card {index + 1}/{deck.length}
      </p>
      <div
        className="mt-6 relative w-[90vw] max-w-xl min-h-72 bg-white rounded-2xl border border-slate-500 shadow-2xl flex items-center justify-center text-center select-none p-8"
        onClick={() => {
          if (!checked && !inRecallFlow) return;
          if (inRecallFlow) return;
          if (checked) nextCard();
        }}
      >
        {card.readingType ? (
          <div className="absolute top-3 left-4 z-10 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
            {readingTypeLabel(card.readingType)}
          </div>
        ) : null}

        {card.strokeCount != null || card.radical || card.radicalName ? (
          <div className="absolute top-3 right-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
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

        <div className="w-full flex flex-col items-center justify-center gap-6">
          <div className="w-full flex flex-col items-center gap-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Kanji</div>
            <div className="text-5xl font-bold">{card.kanji}</div>
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3">
            {options.map((opt, i) => {
              const displayedCorrect = formatReadingForType(card.reading, card.readingType);

              const isCorrect =
                !!checked && normalizeReading(opt) === normalizeReading(displayedCorrect);
              const isChosen =
                !!selected && normalizeReading(opt) === normalizeReading(selected);

              let className = "w-full px-4 py-3 rounded border text-base ";

              if (!checked) {
                className += "bg-white hover:bg-gray-50";
              } else if (isCorrect && isChosen) {
                className += "bg-green-100 border-green-400";
              } else if (isCorrect) {
                className += "bg-green-100 border-green-400";
              } else if (isChosen) {
                className += "bg-red-100 border-red-400";
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
            })}
          </div>

          {checked ? (
            <div className="mt-2 w-full max-w-sm text-sm text-center">
              {checked.ok ? (
                <p className="text-green-700">✅ Correct!</p>
              ) : (
                <>
                  <p className="text-red-700">❌ Not quite.</p>
                  <p className="mt-1 text-gray-600">Correct answer: {checked.correct}</p>
                </>
              )}

              {inRecallFlow ? (
                <div
                  className="mt-4 border rounded-xl bg-slate-50 p-4 text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!recallRevealed ? (
                    <>
                      <p className="text-sm font-medium text-slate-800 text-center">
                        Can you guess the word from this week?
                      </p>
                      {kanjiPositionHint ? (
                        <p className="mt-1 text-xs text-slate-500 text-center">
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

                      <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            submitGuess();
                          }}
                          className="px-4 py-2 bg-gray-700 text-white rounded"
                        >
                          Check
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            revealRecallCard("shown");
                          }}
                          className="px-4 py-2 bg-gray-200 rounded"
                        >
                          Show me
                        </button>
                      </div>

                      {cardsSinceLastRecall >= 4 &&
                        !skipTypingThisSession &&
                        usedRecallWords.length === 0 ? (
                        <div className="mt-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSkipTypingThisSession(true);
                              setRecallResult("shown");
                              setRecallRevealed(true);
                              setCardsSinceLastRecall(0);
                              if (card?.sourceWord) {
                                const normalized = normalizeWord(card.sourceWord);
                                setUsedRecallWords((prev) =>
                                  prev.includes(normalized) ? prev : [...prev, normalized]
                                );
                              }
                            }}
                            className="text-xs text-slate-500 hover:underline"
                          >
                            Skip typing questions this session
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {recallResult === "correct" ? (
                        <p className="text-green-700 text-center font-medium">
                          ピンポーン！ You got it!
                        </p>
                      ) : recallResult === "wrong" ? (
                        <p className="text-amber-700 text-center font-medium">
                          Good guess, but not that one!
                        </p>
                      ) : null}

                      <div className="mt-3 rounded-xl border bg-white p-4 text-center">
                        {recallResult === "correct" ? (
                          <div className="mb-3 text-sm text-slate-700">
                            <div>
                              <span className="font-medium">⭕️ Your guess:</span> {guessInput.trim()}
                            </div>
                          </div>
                        ) : recallResult === "wrong" ? (
                          <div className="mb-3 text-sm text-slate-700 space-y-1">
                            <div>
                              <span className="font-medium">△ Your guess:</span> {guessInput.trim()}
                            </div>
                            <div>
                              <span className="font-medium">⭕️ Correct word:</span> {card.sourceWord}
                            </div>
                          </div>
                        ) : null}

                        {recallResult !== "wrong" ? (
                          <div className="text-lg font-semibold">{card.sourceWord}</div>
                        ) : null}

                        {card.sourceReading ? (
                          <div className="mt-1 text-sm text-slate-500">{card.sourceReading}</div>
                        ) : null}

                        {card.sourceMeaning ? (
                          <div className="mt-2 text-sm text-slate-700">{card.sourceMeaning}</div>
                        ) : null}
                      </div>

                      <div className="mt-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            nextCard();
                          }}
                          className="px-4 py-2 bg-gray-200 rounded"
                        >
                          Continue
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextCard();
                  }}
                  className="mt-3 px-4 py-2 bg-gray-200 rounded"
                >
                  Continue
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-4 text-center max-w-2xl">
        Kanji have many possible readings. These readings are just for these specific words. Focus on the connection and watch for it when you meet it again.
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          onClick={finishForToday}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          That’s enough for today
        </button>

        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => router.push(`/books/${userBookId}/words`)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-800 transition"
          >
            Vocab List
          </button>

          <button
            onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
            className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm whitespace-nowrap"
          >
            Book Hub
          </button>

          <button
            onClick={() => router.push(`/books/${userBookId}/study`)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-800 transition"
          >
            Study Vocab
          </button>
        </div>
      </div>
    </main>
  );
}