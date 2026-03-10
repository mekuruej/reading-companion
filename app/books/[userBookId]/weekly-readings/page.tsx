"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ReadingSetRow = {
  id: string;
  user_book_id: string;
  status: "active" | "prepared";
  activated_at: string | null;
};

type ReadingCardRow = {
  id: string;
  set_id: string;
  sort_order: number;
  source_word: string;
  kanji: string;
  reading: string;
  reading_type: "onyomi" | "kunyomi" | "other" | null;
  created_at: string;
};

type QuizCard = {
  key: string;
  kanji: string;
  reading: string;
  readingType: "onyomi" | "kunyomi" | "other" | null;
};

function readingTypeLabel(val: "onyomi" | "kunyomi" | "other" | null) {
  if (val === "onyomi") return "Onyomi";
  if (val === "kunyomi") return "Kunyomi";
  if (val === "other") return "Other";
  return "";
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

        const { data: activeSet, error: setErr } = await supabase
          .from("user_book_weekly_reading_sets")
          .select("id,user_book_id,status,activated_at")
          .eq("user_book_id", userBookId)
          .eq("status", "active")
          .maybeSingle<ReadingSetRow>();

        if (setErr) throw setErr;

        if (!activeSet) {
          setBaseCards([]);
          setDeck([]);
          setLoading(false);
          return;
        }

        const { data: rows, error: cardsErr } = await supabase
          .from("user_book_weekly_reading_cards")
          .select("id,set_id,sort_order,source_word,kanji,reading,reading_type,created_at")
          .eq("set_id", activeSet.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
          .returns<ReadingCardRow[]>();

        if (cardsErr) throw cardsErr;

        const core: QuizCard[] = (rows ?? [])
          .filter((r) => r.kanji?.trim() && r.reading?.trim())
          .map((r) => ({
            key: r.id,
            kanji: r.kanji.trim(),
            reading: r.reading.trim(),
            readingType: r.reading_type ?? null,
          }));

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

  const options = useMemo(() => {
    if (!card || baseCards.length === 0) return [];

    const correct = card.reading;
    const distractorPool = Array.from(
      new Set(
        baseCards
          .map((c) => c.reading)
          .filter((r) => normalizeReading(r) !== normalizeReading(correct))
      )
    );

    const shuffled = shuffleArray(distractorPool).slice(0, 2);
    return shuffleArray([correct, ...shuffled]);
  }, [card, baseCards, index]);

  function checkAnswer(choice: string) {
    if (!card || checked) return;

    const ok = normalizeReading(choice) === normalizeReading(card.reading);
    setSelected(choice);
    setChecked({ ok, correct: card.reading });
  }

  function nextCard() {
    if (index + 1 >= deck.length) {
      setIndex(deck.length);
      setSelected(null);
      setChecked(null);
      return;
    }

    setIndex((prev) => prev + 1);
    setSelected(null);
    setChecked(null);

  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!card) return;

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
  }, [card, checked, options]);

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
        <p className="text-gray-700">This week’s readings are not ready yet.</p>
        <button
          onClick={() => router.push(`/books/${userBookId}/study`)}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Back to Study
        </button>
      </main>
    );
  }

  if (index >= deck.length) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl border rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Nice work!</h1>
          <p className="mt-3 text-gray-700">You’re more ready for this week’s reading.</p>
          <p className="mt-2 text-sm text-gray-500">
            Come back tomorrow to reinforce the readings.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.push(`/books/${userBookId}/study`)}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Back to Study
            </button>

            <button
              onClick={() => {
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
                setSelected(null);
                setChecked(null);
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded"
            >
              Do It Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6">
      <div className="flex flex-col items-center mb-4">
        {bookCover ? (
          <img src={bookCover} alt="" className="w-20 h-28 rounded mb-2" />
        ) : null}

        <h1 className="text-xl font-semibold">{bookTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">This Week’s Kanji Readings</p>
        <p className="text-sm text-gray-500">
          Card {index + 1}/{deck.length}
        </p>
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center max-w-2xl">
  Kanji often have many different readings. 
  <br />
  The reading you will practice here
  comes from an upcoming word in your book.
</p>

      <div className="relative w-[90vw] max-w-xl min-h-72 bg-white rounded-2xl border border-slate-500 shadow-2xl flex items-center justify-center text-center select-none p-8">
        {card.readingType ? (
          <div className="absolute top-3 left-4 text-[11px] text-slate-500">
            {readingTypeLabel(card.readingType)}
          </div>
        ) : null}

        <div className="w-full flex flex-col items-center justify-center gap-6">
          <div className="w-full flex flex-col items-center gap-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Kanji</div>
            <div className="text-5xl font-bold">{card.kanji}</div>
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3">
            {options.map((opt, i) => {
              const isCorrect =
                !!checked && normalizeReading(opt) === normalizeReading(card.reading);
              const isChosen =
                !!selected && normalizeReading(opt) === normalizeReading(selected);

              let className = "w-full px-4 py-3 rounded border text-base ";

              if (!checked) {
                className += "bg-white hover:bg-gray-50";
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
                  onClick={() => checkAnswer(opt)}
                  className={className}
                >
                  <span className="mr-2 text-sm text-gray-500">{i + 1}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {checked ? (
            <div className="mt-2 text-sm text-center">
              {checked.ok ? (
                <p className="text-green-700">✅ Correct!</p>
              ) : (
                <>
                  <p className="text-red-700">❌ Not quite.</p>
                  <p className="mt-1 text-gray-600">Correct answer: {checked.correct}</p>
                </>
              )}

              <button
                type="button"
                onClick={nextCard}
                className="mt-3 px-4 py-2 bg-gray-200 rounded"
              >
                Continue →
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push(`/books/${userBookId}/study`)}
          className="text-sm text-slate-600 hover:underline"
        >
          ← Back to Study
        </button>
      </div>
    </main>
  );
}