// Kanji Reading Study
// 

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { recordStudyEvent } from "@/lib/studyEvents";

type UserBookWordRow = {
  id: string;
  user_book_id: string;
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

type VocabularyCacheRow = {
  id: number;
  surface: string | null;
  reading: string | null;
  jlpt: string | null;
  senses_json: any[] | null;
};

type KanjiMapRow = {
  id: number;
  vocabulary_cache_id: number;
  kanji: string | null;
  kanji_position: number | null;
  reading_type: "on" | "kun" | "other" | string | null;
  base_reading: string | null;
  realized_reading: string | null;
  excluded_from_kanji_practice: boolean | null;
  flagged_for_review: boolean | null;
};

type QuizCard = {
  key: string;
  kanjiMapId: number;
  flaggedForReview: boolean;
  kanji: string;
  reading: string;
  readingType: "onyomi" | "kunyomi" | "other" | null;
  sourceWord: string;
  sourceMeaning: string | null;
  sourceReading: string | null;
  jlpt: string | null;
  userBookId: string | null;
  userBookWordId: string | null;
  bookTitle: string | null;
  bookCover: string | null;
  strokeCount: number | null;
  radical: string | null;
  radicalName: string | null;
  chapterNumber: number | null;
  chapterName: string | null;
  pageNumber: number | null;
  baseReading: string | null;
};

type RecallResult = "correct" | "wrong" | "shown" | "unverified" | null;
type RecallMode = "wordForKanji" | "kanjiForReading";
type CardQuestionMode = "readingChoice" | "kanjiChoice";
type LevelFilter = "beginner" | "intermediate" | "advanced" | "unlabeled" | "all";

function normalizeJlpt(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase().replace(/^JLPT-/, "");
  if (
    normalized === "N5" ||
    normalized === "N4" ||
    normalized === "N3" ||
    normalized === "N2" ||
    normalized === "N1"
  ) {
    return normalized;
  }
  return "NON-JLPT";
}

function matchesLevelFilter(jlpt: string | null | undefined, level: LevelFilter) {
  const normalized = normalizeJlpt(jlpt);

  if (level === "all") return true;
  if (level === "beginner") return normalized === "N5" || normalized === "N4";
  if (level === "intermediate") return normalized === "N3" || normalized === "N2";
  if (level === "advanced") return normalized === "N1";
  if (level === "unlabeled") return normalized === "NON-JLPT";

  return true;
}

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

function kanjiChars(text: string) {
  return text.match(/[\p{Script=Han}]/gu) ?? [];
}

function hasExactlyOneKanji(text: string) {
  return kanjiChars(text).length === 1;
}

function stableNumberFromString(text: string) {
  let total = 0;
  for (let i = 0; i < text.length; i += 1) {
    total = (total * 31 + text.charCodeAt(i)) % 9973;
  }
  return total;
}

function meaningPreviewFromSenses(senses: any[] | null | undefined) {
  if (!Array.isArray(senses)) return null;

  for (const sense of senses) {
    const definitions = Array.isArray(sense?.english_definitions)
      ? sense.english_definitions
        .map((definition: any) => String(definition).trim())
        .filter(Boolean)
      : [];

    if (definitions.length === 0) continue;

    const preview = definitions.slice(0, 3).join("; ");
    return preview.length > 120 ? `${preview.slice(0, 117).trim()}...` : preview;
  }

  return null;
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

function splitKunyomiPromptReading(sourceReading: string | null, realizedReading: string) {
  const reading = kataToHira(sourceReading ?? "").trim();
  const target = kataToHira(realizedReading ?? "").trim();
  if (!reading) return { strong: "", ghost: "" };

  if (target && normalizeReading(reading).startsWith(normalizeReading(target))) {
    const targetLength = Array.from(target).length;
    const chars = Array.from(reading);
    return {
      strong: chars.slice(0, targetLength).join(""),
      ghost: chars.slice(targetLength).join(""),
    };
  }

  const chars = Array.from(reading);
  return {
    strong: chars.slice(0, 1).join(""),
    ghost: chars.slice(1).join(""),
  };
}

function selectOneCardPerKanji(cards: QuizCard[]) {
  const byKanji = new Map<string, QuizCard>();

  for (const card of shuffleArray(cards)) {
    const existing = byKanji.get(card.kanji);
    if (!existing || (card.flaggedForReview && !existing.flaggedForReview)) {
      byKanji.set(card.kanji, card);
    }
  }

  return Array.from(byKanji.values());
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function makeContextKey(surface: string | null | undefined, reading: string | null | undefined) {
  return `${normalizeWord(surface ?? "")}|||${normalizeReading(reading ?? "")}`;
}

export default function KanjiReadingStudyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [baseCards, setBaseCards] = useState<QuizCard[]>([]);
  const [deck, setDeck] = useState<QuizCard[]>([]);
  const [index, setIndex] = useState(0);

  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState<null | { ok: boolean; correct: string }>(null);

  const [guessInput, setGuessInput] = useState("");
  const [recallRevealed, setRecallRevealed] = useState(false);
  const [recallResult, setRecallResult] = useState<RecallResult>(null);
  const [recallMatchedWord, setRecallMatchedWord] = useState<string | null>(null);
  const [recallMatchedCard, setRecallMatchedCard] = useState<QuizCard | null>(null);
  const [skipTypingThisSession, setSkipTypingThisSession] = useState(false);
  const [endedEarly, setEndedEarly] = useState(false);
  const [usedRecallWords, setUsedRecallWords] = useState<string[]>([]);
  const [cardsSinceLastRecall, setCardsSinceLastRecall] = useState(0);

  const [notice, setNotice] = useState<string | null>(null);

  const [levelFilter, setLevelFilter] = useState<LevelFilter>("beginner");

  const canAccessKanjiPractice = true;

  const filteredBaseCards = useMemo(() => {
    return baseCards.filter((card) => matchesLevelFilter(card.jlpt, levelFilter));
  }, [baseCards, levelFilter]);

  useEffect(() => {
    buildDeckFromCards(filteredBaseCards);
    setSkipTypingThisSession(false);
    setEndedEarly(false);
    setUsedRecallWords([]);
    setCardsSinceLastRecall(0);
  }, [filteredBaseCards]);

  useEffect(() => {
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

        const { data: kanjiMapRows, error: kanjiMapErr } = await supabase
          .from("vocabulary_kanji_map")
          .select(
            "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading, excluded_from_kanji_practice, flagged_for_review"
          )
          .not("kanji", "is", null)
          .not("base_reading", "is", null)
          .not("realized_reading", "is", null)
          .limit(5000)
          .returns<KanjiMapRow[]>();

        if (kanjiMapErr) throw kanjiMapErr;

        const activeKanjiMapRows = (kanjiMapRows ?? []).filter((row) => {
          const hasReading = !!(row.realized_reading?.trim() || row.base_reading?.trim());
          return hasReading && (!row.excluded_from_kanji_practice || !!row.flagged_for_review);
        });

        const vocabularyCacheIds = Array.from(
          new Set(
            activeKanjiMapRows
              .map((row) => row.vocabulary_cache_id)
              .filter((id): id is number => id != null)
          )
        );

        const vocabularyById = new Map<number, VocabularyCacheRow>();

        for (const cacheIdChunk of chunkArray(vocabularyCacheIds, 400)) {
          const { data: cacheRows, error: cacheErr } = await supabase
            .from("vocabulary_cache")
            .select("id, surface, reading, jlpt, senses_json")
            .in("id", cacheIdChunk)
            .returns<VocabularyCacheRow[]>();

          if (cacheErr) throw cacheErr;

          for (const row of cacheRows ?? []) {
            vocabularyById.set(row.id, row);
          }
        }

        const { data: userBooks, error: userBooksErr } = await supabase
          .from("user_books")
          .select(
            `
            id,
            books:book_id (
              title,
              cover_url
            )
          `
          )
          .eq("user_id", user.id);

        if (userBooksErr) throw userBooksErr;

        const bookInfoByUserBookId = new Map<string, { title: string; cover: string | null }>();
        const userBookIds: string[] = [];

        for (const row of userBooks ?? []) {
          const id = (row as any).id;
          if (!id) continue;

          userBookIds.push(id);
          bookInfoByUserBookId.set(id, {
            title: (row as any)?.books?.title ?? "Untitled Book",
            cover: (row as any)?.books?.cover_url ?? null,
          });
        }

        const contextByKey = new Map<string, UserBookWordRow>();

        for (const userBookIdChunk of chunkArray(userBookIds, 200)) {
          const { data: rows, error: contextErr } = await supabase
            .from("user_book_words")
            .select(
              "id, user_book_id, surface, reading, meaning, created_at, hidden, vocabulary_cache_id, chapter_number, chapter_name, page_number"
            )
            .in("user_book_id", userBookIdChunk)
            .not("reading", "is", null)
            .eq("hidden", false)
            .order("created_at", { ascending: false })
            .returns<UserBookWordRow[]>();

          if (contextErr) throw contextErr;

          for (const row of rows ?? []) {
            const key = makeContextKey(row.surface, row.reading);
            if (!contextByKey.has(key)) contextByKey.set(key, row);
          }
        }

        const core: QuizCard[] = activeKanjiMapRows.flatMap((km) => {
          const vocab = vocabularyById.get(km.vocabulary_cache_id);
          const surface = vocab?.surface?.trim() ?? "";
          const sourceReading = vocab?.reading?.trim() ?? "";
          const reading = km.realized_reading?.trim() || km.base_reading?.trim() || "";

          if (!surface || !sourceReading || !km.kanji || !reading) return [];

          const context = contextByKey.get(makeContextKey(surface, sourceReading));
          const sourceMeaning =
            context?.meaning?.trim() || meaningPreviewFromSenses(vocab?.senses_json) || null;
          const readingType: QuizCard["readingType"] =
            km.reading_type === "on"
              ? "onyomi"
              : km.reading_type === "kun"
                ? "kunyomi"
                : km.reading_type === "other"
                  ? "other"
                  : null;

          return [{
            key: `global-${km.id}`,
            kanjiMapId: km.id,
            flaggedForReview: !!km.flagged_for_review,
            kanji: km.kanji,
            reading,
            baseReading: km.base_reading?.trim() || null,
            readingType,
            sourceWord: surface,
            sourceMeaning,
            sourceReading,
            jlpt: vocab?.jlpt ?? null,
            userBookId: context?.user_book_id ?? null,
            userBookWordId: context?.id ?? null,
            bookTitle: context
              ? bookInfoByUserBookId.get(context.user_book_id)?.title ?? "Untitled Book"
              : null,
            bookCover: context
              ? bookInfoByUserBookId.get(context.user_book_id)?.cover ?? null
              : null,
            strokeCount: null,
            radical: null,
            radicalName: null,
            chapterNumber: context?.chapter_number ?? null,
            chapterName: context?.chapter_name ?? null,
            pageNumber: context?.page_number ?? null,
          }];
        });

        setBaseCards(core);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load readings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const card = deck[index];

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

  const recallMode: RecallMode = useMemo(() => {
    if (!card || !hasExactlyOneKanji(card.sourceWord) || !card.sourceReading) {
      return "wordForKanji";
    }

    return stableNumberFromString(card.key) % 2 === 0 ? "kanjiForReading" : "wordForKanji";
  }, [card]);

  const cardQuestionMode: CardQuestionMode = useMemo(() => {
    if (
      card?.readingType === "kunyomi" &&
      hasExactlyOneKanji(card.sourceWord) &&
      !!card.sourceReading
    ) {
      return "kanjiChoice";
    }

    return "readingChoice";
  }, [card]);

  const options = useMemo(() => {
    if (!card || filteredBaseCards.length === 0) return [];

    if (cardQuestionMode === "kanjiChoice") {
      const correct = card.kanji;
      const distractors: string[] = [];

      const kanjiPool = Array.from(
        new Set(
          filteredBaseCards
            .filter(
              (c) =>
                c.key !== card.key &&
                hasExactlyOneKanji(c.sourceWord) &&
                c.kanji !== correct
            )
            .map((c) => c.kanji)
            .filter(Boolean)
        )
      );

      for (const kanji of shuffleArray(kanjiPool)) {
        if (!distractors.includes(kanji)) distractors.push(kanji);
        if (distractors.length >= 3) break;
      }

      return shuffleArray([correct, ...distractors]).filter(Boolean);
    }

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
  }, [card, cardQuestionMode, filteredBaseCards]);

  useEffect(() => {
    if (!checked) return;
    if (inRecallFlow) return;

    const timer = window.setTimeout(() => {
      nextCard();
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [checked, inRecallFlow]);

  useEffect(() => {
    if (!recallRevealed) return;

    const timer = window.setTimeout(() => {
      nextCard();
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [recallRevealed, recallResult, recallMatchedWord]);

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

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  async function flagKanjiCardForReview(cardToFlag: QuizCard) {
    const flaggedAt = new Date().toISOString();

    const { error } = await supabase
      .from("vocabulary_kanji_map")
      .update({
        flagged_for_review: true,
        excluded_from_kanji_practice: false,
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
      user_book_id: cardToFlag.userBookId,
      type: "kanji_flag",
      message: `Kanji reading flagged: ${cardToFlag.kanji} in ${cardToFlag.sourceWord}`,
    });

    if (alertError) {
      console.error("Error creating kanji flag alert:", alertError);
    }

    setNotice("✅ Flagged for review");
    setDeck((prev) => {
      return prev.filter((_, i) => i !== index);
    });

    if (index >= deck.length - 1) {
      setIndex((prev) => Math.max(prev - 1, 0));
    }

    resetCardState();
  }

  function resetCardState() {
    setSelected(null);
    setChecked(null);
    setGuessInput("");
    setRecallRevealed(false);
    setRecallResult(null);
    setRecallMatchedWord(null);
    setRecallMatchedCard(null);
  }

  function buildDeckFromCards(cards: QuizCard[]) {
    if (cards.length === 0) {
      setDeck([]);
      setIndex(0);
      resetCardState();
      return;
    }

    const onyomiCards = cards.filter((card) => card.readingType === "onyomi");
    const kunyomiCards = cards.filter(
      (card) => card.readingType === "kunyomi" && hasExactlyOneKanji(card.sourceWord)
    );

    const dailyOnyomiCards = shuffleArray(selectOneCardPerKanji(onyomiCards));
    const dailyKunyomiCards = shuffleArray(selectOneCardPerKanji(kunyomiCards));
    const dailyKanjiCards: QuizCard[] = [];
    let kunyomiIndex = 0;

    for (let i = 0; i < dailyOnyomiCards.length; i += 1) {
      dailyKanjiCards.push(dailyOnyomiCards[i]);

      if ((i + 1) % 10 === 0 && dailyKunyomiCards[kunyomiIndex]) {
        dailyKanjiCards.push(dailyKunyomiCards[kunyomiIndex]);
        kunyomiIndex += 1;
      }
    }

    if (dailyKanjiCards.length === 0) {
      dailyKanjiCards.push(...dailyKunyomiCards);
    }

    const onePassDeck = dailyKanjiCards.map((c, i) => ({
      ...c,
      key: `${c.key}-deck-once-${i}`,
    }));

    setDeck(onePassDeck);
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

  function recordKanjiReadingStudyEvent({
    result,
    isCorrect,
    cardType,
  }: {
    result: "reviewed" | "correct" | "incorrect" | "skipped";
    isCorrect: boolean | null;
    cardType: string;
  }) {
    if (!card) return;

    void recordStudyEvent({
      userBookId: card.userBookId,
      userBookWordId: card.userBookWordId,
      studyMode: "kanji_reading_flashcards",
      cardType,
      result,
      isCorrect,
      surface:
        (card as any).sourceWord ??
        (card as any).word ??
        (card as any).surface ??
        null,
      reading: card.reading ?? null,
      meaning: null,
    });
  }

  function checkAnswer(choice: string) {
    if (!card || checked) return;

    const displayedCorrect =
      cardQuestionMode === "kanjiChoice"
        ? card.kanji
        : formatReadingForType(card.reading, card.readingType);
    const ok =
      cardQuestionMode === "kanjiChoice"
        ? choice.trim() === displayedCorrect
        : normalizeReading(choice) === normalizeReading(displayedCorrect);

    setSelected(choice);
    setChecked({ ok, correct: displayedCorrect });
    setGuessInput("");
    setRecallRevealed(false);
    setRecallResult(null);

    recordKanjiReadingStudyEvent({
      result: ok ? "correct" : "incorrect",
      isCorrect: ok,
      cardType: "kanji_reading_choice",
    });
  }

  function revealRecallCard(
    mode: Exclude<RecallResult, null>,
    matchedWord: string | null = null,
    matchedCard: QuizCard | null = null
  ) {
    if (card?.sourceWord) {
      const normalized = normalizeWord(card.sourceWord);
      setUsedRecallWords((prev) =>
        prev.includes(normalized) ? prev : [...prev, normalized]
      );
    }

    setRecallResult(mode);
    setRecallMatchedWord(matchedWord);
    setRecallMatchedCard(matchedCard);
    setRecallRevealed(true);
    setCardsSinceLastRecall(0);

    recordKanjiReadingStudyEvent({
      result:
        mode === "correct"
          ? "correct"
          : mode === "wrong"
            ? "incorrect"
            : "reviewed",
      isCorrect:
        mode === "correct"
          ? true
          : mode === "wrong"
            ? false
            : null,
      cardType: "kanji_reading_recall",
    });
  }

  function submitGuess() {
    if (!card || !inRecallFlow || recallRevealed) return;

    const typed = normalizeWord(guessInput);
    const rawGuess = guessInput.trim();

    if (!typed) {
      revealRecallCard("shown");
      return;
    }

    if (recallMode === "kanjiForReading") {
      if (typed === card.kanji) {
        revealRecallCard("correct", rawGuess);
      } else {
        revealRecallCard("wrong");
      }

      return;
    }

    const matchedKnownWord = baseCards.find(
      (candidate) => {
        if (!candidate.sourceWord.includes(card.kanji)) return false;

        return (
          normalizeWord(candidate.sourceWord) === typed ||
          normalizeReading(candidate.sourceReading ?? "") === normalizeReading(rawGuess)
        );
      }
    );

    if (matchedKnownWord) {
      revealRecallCard("correct", matchedKnownWord.sourceWord, matchedKnownWord);
    } else if (rawGuess.includes(card.kanji)) {
      revealRecallCard("unverified", rawGuess);
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

  function previousCard() {
    setIndex((prev) => Math.max(prev - 1, 0));
    resetCardState();
    setEndedEarly(false);
  }

  function finishForToday() {
    router.push("/library");
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
          onClick={() => router.push("/library-study")}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Back to Study Hub
        </button>
      </main>
    );
  }

  if (baseCards.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="mb-8 text-2xl font-semibold text-gray-700">
          No saved vocabulary with kanji readings is available yet.
        </p>
        <button
          onClick={() => router.push("/library-study")}
          className="rounded bg-gray-200 px-4 py-2"
        >
          Back to Study Hub
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
                Kanji Reading Practice
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
              onClick={() => router.push("/library-study")}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Back to Study Hub
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
      <div className="mb-2 w-full max-w-3xl rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
            漢
          </div>
          <h1 className="text-center text-2xl font-semibold text-emerald-950">
            Kanji Reading Study
          </h1>
        </div>

        <details className="group mt-4 rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm leading-6 text-gray-600 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="font-semibold text-emerald-950">
              About this study
            </span>
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 group-open:hidden">
              Open
            </span>
            <span className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 group-open:inline-flex">
              Close
            </span>
          </summary>

          <div className="mt-3 border-t border-emerald-100 pt-3">
            <p>
              Onyomi is the main study path here: choose the reading that a kanji carries inside
              compound words. Kunyomi uses a different kind of question: choose which kanji usually
              writes a kana word.
            </p>
            <p className="mt-2">
              The deck is onyomi-focused by default. Mekuru occasionally adds a kunyomi check,
              about once every ten onyomi cards, so you can notice common stand-alone word patterns
              without losing the compound-reading rhythm.
            </p>
            <p className="mt-2">
              If kanji is not your forte, this onyomi focus is intentional: it can help you read
              many new compound words in the future.
            </p>
          </div>
        </details>
      </div>

      <p className="text-sm text-gray-500">
        Card {index + 1}/{deck.length}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
        <span className="font-medium text-stone-700">Level:</span>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
          className="rounded border bg-white px-3 py-2 text-sm text-stone-800"
        >
          <option value="beginner">Beginner: N5/N4</option>
          <option value="intermediate">Intermediate: N3/N2</option>
          <option value="advanced">Advanced: N1</option>
          <option value="unlabeled">Unlabeled</option>
          <option value="all">All levels</option>
        </select>

        <div className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-emerald-900">
          Onyomi focus · occasional kunyomi check
        </div>
      </div>

      {notice ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      <div
        className={`relative mt-6 flex min-h-72 w-[90vw] max-w-xl select-none items-center justify-center rounded-2xl border bg-white p-8 text-center shadow-2xl ${card.flaggedForReview ? "border-red-400 bg-red-50/30" : "border-slate-500"
          }`}
        onClick={() => {
          if (!checked && !inRecallFlow) return;
          if (inRecallFlow) return;
          if (checked) nextCard();
        }}
      >
        {card.flaggedForReview ? (
          <div className="absolute left-4 top-3 z-10 rounded-full bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700">
            Review Carefully
          </div>
        ) : null}

        {cardQuestionMode === "readingChoice" && card.readingType ? (
          <div
            className={`absolute z-10 rounded-full px-3 py-1.5 text-sm font-medium ${card.flaggedForReview
              ? "left-4 top-14 bg-slate-100 text-slate-600"
              : "left-4 top-3 bg-slate-100 text-slate-600"
              }`}
          >
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
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {cardQuestionMode === "kanjiChoice" ? "Reading" : "Kanji"}
            </div>
            <div className="text-5xl font-bold">
              {cardQuestionMode === "kanjiChoice" ? card.sourceReading : card.kanji}
              {cardQuestionMode === "readingChoice" &&
                (card.readingType === "other" ||
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
                const displayedCorrect =
                  cardQuestionMode === "kanjiChoice"
                    ? card.kanji
                    : formatReadingForType(card.reading, card.readingType);

                const isCorrect =
                  !!checked &&
                  (cardQuestionMode === "kanjiChoice"
                    ? opt.trim() === displayedCorrect
                    : normalizeReading(opt) === normalizeReading(displayedCorrect));
                const isChosen =
                  !!selected &&
                  (cardQuestionMode === "kanjiChoice"
                    ? opt.trim() === selected.trim()
                    : normalizeReading(opt) === normalizeReading(selected));

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
                  {cardQuestionMode === "readingChoice" &&
                    card.readingType === "kunyomi" &&
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
                  {cardQuestionMode === "readingChoice" &&
                    card.readingType === "kunyomi" &&
                    isKunWithOkurigana(card.sourceWord) &&
                    card.baseReading &&
                    normalizeReading(card.baseReading) !== normalizeReading(card.reading) ? (
                    <p className="mt-1 text-gray-600">Base reading: {card.baseReading}</p>
                  ) : null}
                </>
              )}

              {!inRecallFlow ? (
                <>
                  <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
                    <div className="text-lg font-semibold">{card.sourceWord}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {card.bookTitle ? `Seen in: ${card.bookTitle}` : "Shared kanji bank"}
                    </div>
                    {card.sourceReading ? (
                      <div className="mt-1 text-sm text-slate-500">{card.sourceReading}</div>
                    ) : null}
                    {card.sourceMeaning ? (
                      <div className="mt-1 text-sm text-slate-700">{card.sourceMeaning}</div>
                    ) : null}
                  </div>

                  <p className="mt-2 text-xs text-slate-400">Next word comes automatically.</p>
                </>
              ) : null}

              {inRecallFlow ? (
                <div
                  className="mt-4 rounded-xl border bg-slate-50 p-4 text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!recallRevealed ? (
                    <>
                      <p className="text-center text-sm font-medium text-slate-800">
                        {recallMode === "kanjiForReading"
                          ? "What kanji character does this word use?"
                          : "Can you come up with the word Mekuru is thinking of?"}
                      </p>

                      <p className="mt-1 text-center text-xs text-slate-500">
                        {recallMode === "kanjiForReading"
                          ? card.sourceReading
                          : "Think of the level filter during your guess!"}
                      </p>

                      <input
                        type="text"
                        value={guessInput}
                        onChange={(e) => setGuessInput(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            submitGuess();
                          }
                        }}
                        placeholder={
                          recallMode === "kanjiForReading"
                            ? "Type the kanji"
                            : "Type a word with this kanji"
                        }
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
                      {recallMode === "wordForKanji" && recallResult === "correct" ? (
                        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-amber-950 shadow-sm">
                          <span className="pointer-events-none absolute left-5 top-4 h-2 w-2 animate-[kanjiRecallBurst_900ms_ease-out_forwards] rounded-full bg-amber-400" />
                          <span className="pointer-events-none absolute right-8 top-5 h-1.5 w-1.5 animate-[kanjiRecallBurst_1000ms_ease-out_120ms_forwards] rounded-full bg-rose-300" />
                          <span className="pointer-events-none absolute bottom-5 left-1/2 h-1.5 w-1.5 animate-[kanjiRecallBurst_950ms_ease-out_220ms_forwards] rounded-full bg-sky-300" />
                          <div className="text-2xl font-black">Amazing!</div>
                          <div className="mt-1 text-sm font-semibold">
                            You found the word Mekuru was thinking of.
                          </div>
                          <style jsx>{`
                            @keyframes kanjiRecallBurst {
                              0% {
                                opacity: 0;
                                transform: scale(0.2);
                                box-shadow:
                                  0 0 0 0 currentColor,
                                  0 0 0 0 currentColor,
                                  0 0 0 0 currentColor;
                              }
                              35% {
                                opacity: 1;
                              }
                              100% {
                                opacity: 0;
                                transform: scale(1.25);
                                box-shadow:
                                  20px -12px 0 -1px currentColor,
                                  -18px -8px 0 -1px currentColor,
                                  3px 20px 0 -1px currentColor;
                              }
                            }
                          `}</style>
                        </div>
                      ) : (
                        <p className="text-center text-sm font-medium text-slate-800">
                          {recallMode === "wordForKanji" && recallResult === "unverified"
                            ? `Sorry! It was ${card.sourceWord}.`
                            : recallMode === "wordForKanji" && recallResult === "wrong"
                              ? `Sorry! It was ${card.sourceWord}.`
                              : recallResult === "correct"
                                ? "✅ That works!"
                                : recallResult === "wrong"
                                  ? `Sorry! It was ${card.sourceWord}.`
                                  : `It was ${card.sourceWord}.`}
                        </p>
                      )}

                      {recallMatchedWord && recallMode !== "wordForKanji" ? (
                        <p
                          className={`mt-1 text-center text-sm ${
                            recallResult === "unverified" ? "text-amber-700" : "text-green-700"
                          }`}
                        >
                          Your answer: {recallMatchedWord}
                        </p>
                      ) : null}

                      {recallMode !== "wordForKanji" ? (
                        <div className="mt-3 rounded-xl border bg-white p-3 text-center">
                          <div className="text-xs uppercase tracking-wide text-slate-400">
                            Example from the bank
                          </div>
                          <div className="text-lg font-semibold">
                            {(recallMatchedCard ?? card).sourceWord}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {(recallMatchedCard ?? card).bookTitle
                              ? `Seen in: ${(recallMatchedCard ?? card).bookTitle}`
                              : "Shared kanji bank"}
                          </div>
                          {(recallMatchedCard ?? card).sourceReading ? (
                            <div className="mt-1 text-sm text-slate-500">
                              {(recallMatchedCard ?? card).sourceReading}
                            </div>
                          ) : null}
                          {(recallMatchedCard ?? card).sourceMeaning ? (
                            <div className="mt-1 text-sm text-slate-700">
                              {(recallMatchedCard ?? card).sourceMeaning}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <p className="mt-3 text-center text-xs text-slate-400">
                        Next word comes automatically.
                      </p>

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
          onClick={previousCard}
          disabled={index <= 0}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={finishForToday}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Finished for the Day
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
