// Kanji Reading Study
// 

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { recordStudyEvent } from "@/lib/studyEvents";
import KanjiStudyLoadingState from "./components/KanjiStudyLoadingState";
import KanjiStudyAccessState from "./components/KanjiStudyAccessState";
import KanjiStudyHeader from "./components/KanjiStudyHeader";
import KanjiStudyProgressPanel from "./components/KanjiStudyProgressPanel";
import KanjiStudyNotice from "./components/KanjiStudyNotice";
import KanjiStudyCompleteState from "./components/KanjiStudyCompleteState";
import KanjiStudyBottomControls from "./components/KanjiStudyBottomControls";
import KanjiStudyPreviewLockedState from "./components/KanjiStudyPreviewLockedState";
import KanjiRecallPanel from "../components/KanjiRecallPanel";
import KanjiStudyOptionList from "./components/KanjiStudyOptionList";
import KanjiStudyFeedbackPanel from "./components/KanjiStudyFeedbackPanel";
import KanjiStudyCardFrame from "./components/KanjiStudyCardFrame";
import KanjiStudyPrompt from "./components/KanjiStudyPrompt";
import KanjiStudyModeSelector from "../components/KanjiStudyModeSelector";
import KanjiAnswerStyleSelector from "../components/KanjiAnswerStyleSelector";
import KanjiStudyTypingAnswer from "./components/KanjiStudyTypingAnswer";
import KanjiStudyNoCardsState from "./components/KanjiStudyNoCardsState";

const KANJI_AUTO_ADVANCE_MS = 3000;

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
type LevelFilter = "beginner" | "n3" | "n2" | "advanced" | "unlabeled" | "all";
type KanjiAnswerStyle = "multipleChoice" | "typing";
type KanjiStudyMode =
  | "kunyomiToKanji"
  | "kanjiToKunyomi"
  | "onyomiToKanji"
  | "kanjiToOnyomi";

const KANJI_STUDY_MODE_OPTIONS: Array<{
  value: KanjiStudyMode;
  label: string;
  description: string;
}> = [
    {
      value: "kunyomiToKanji",
      label: "Kunyomi -> Kanji",
      description: "See a Japanese reading and choose the kanji.",
    },
    {
      value: "kanjiToKunyomi",
      label: "Kanji -> Kunyomi",
      description: "See a kanji and choose its kunyomi reading.",
    },
    {
      value: "onyomiToKanji",
      label: "Onyomi -> Kanji",
      description: "See an on reading and choose the kanji.",
    },
    {
      value: "kanjiToOnyomi",
      label: "Kanji -> Onyomi",
      description: "See a kanji and choose its onyomi reading.",
    },
  ];

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
  if (level === "n3") return normalized === "N3";
  if (level === "n2") return normalized === "N2";
  if (level === "advanced") return normalized === "N1";
  if (level === "unlabeled") return normalized === "NON-JLPT";

  return true;
}

function readingTypeForStudyMode(mode: KanjiStudyMode): QuizCard["readingType"] {
  return mode === "kunyomiToKanji" || mode === "kanjiToKunyomi" ? "kunyomi" : "onyomi";
}

function questionModeForStudyMode(mode: KanjiStudyMode): CardQuestionMode {
  return mode === "kunyomiToKanji" || mode === "onyomiToKanji"
    ? "kanjiChoice"
    : "readingChoice";
}

function studyModeSummary(mode: KanjiStudyMode) {
  if (mode === "kunyomiToKanji") return "Kunyomi to kanji";
  if (mode === "kanjiToKunyomi") return "Kanji to kunyomi";
  if (mode === "onyomiToKanji") return "Onyomi to kanji";
  return "Kanji to onyomi";
}

function correctAnswerForCard(card: QuizCard, mode: KanjiStudyMode) {
  return questionModeForStudyMode(mode) === "kanjiChoice"
    ? card.kanji
    : formatReadingForType(card.reading, card.readingType);
}

function promptLabelForStudyMode(mode: KanjiStudyMode) {
  if (mode === "kunyomiToKanji") return "Kunyomi";
  if (mode === "onyomiToKanji") return "Onyomi";
  return "Kanji";
}

function promptTextForStudyMode(card: QuizCard, mode: KanjiStudyMode) {
  return questionModeForStudyMode(mode) === "kanjiChoice"
    ? formatReadingForType(card.reading, card.readingType)
    : card.kanji;
}

function answerStyleForMode(mode: KanjiStudyMode, preferredStyle: KanjiAnswerStyle) {
  return questionModeForStudyMode(mode) === "readingChoice"
    ? preferredStyle
    : "multipleChoice";
}

function relatedReadingExamplesForCard(card: QuizCard, cards: QuizCard[]) {
  const normalizedReading = normalizeReading(card.reading);
  const seenWords = new Set<string>([normalizeWord(card.sourceWord)]);
  const examples: Array<{ word: string; reading: string | null }> = [];

  for (const candidate of cards) {
    if (examples.length >= 2) break;
    if (candidate.key === card.key) continue;
    if (candidate.kanji !== card.kanji) continue;
    if (candidate.readingType !== card.readingType) continue;
    if (normalizeReading(candidate.reading) !== normalizedReading) continue;

    const wordKey = normalizeWord(candidate.sourceWord);
    if (!wordKey || seenWords.has(wordKey)) continue;

    seenWords.add(wordKey);
    examples.push({
      word: candidate.sourceWord,
      reading: candidate.sourceReading ?? candidate.reading,
    });
  }

  return examples;
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

function normalizeReadingAnswer(s: string) {
  return normalizeReading(kataToHira(s));
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

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function selectOneCardPerSourceWordForDay(cards: QuizCard[], dateKey: string) {
  const byWord = new Map<string, QuizCard[]>();

  for (const card of cards) {
    const wordKey = normalizeWord(card.sourceWord);
    if (!wordKey) continue;

    const group = byWord.get(wordKey) ?? [];
    group.push(card);
    byWord.set(wordKey, group);
  }

  return Array.from(byWord.entries()).map(([wordKey, group]) => {
    const flaggedCards = group.filter((card) => card.flaggedForReview);
    const candidates = flaggedCards.length > 0 ? flaggedCards : group;
    const index = stableNumberFromString(`${wordKey}|${dateKey}`) % candidates.length;
    return candidates[index];
  });
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
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  const [answerStyle, setAnswerStyle] = useState<KanjiAnswerStyle>("multipleChoice");
  const [typingAnswer, setTypingAnswer] = useState("");

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
  const [studyMode, setStudyMode] = useState<KanjiStudyMode>("kanjiToOnyomi");

  const canAccessKanjiPractice = true;

  const filteredBaseCards = useMemo(() => {
    const readingType = readingTypeForStudyMode(studyMode);

    return baseCards.filter(
      (card) =>
        card.readingType === readingType &&
        !!card.reading &&
        !!card.kanji &&
        matchesLevelFilter(card.jlpt, levelFilter)
    );
  }, [baseCards, levelFilter, studyMode]);

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

  const cardQuestionMode: CardQuestionMode = useMemo(
    () => questionModeForStudyMode(studyMode),
    [studyMode]
  );
  const effectiveAnswerStyle = useMemo(
    () => answerStyleForMode(studyMode, answerStyle),
    [studyMode, answerStyle]
  );

  const canStartRecall = false;

  const inRecallFlow =
    !!card &&
    cardQuestionMode === "readingChoice" &&
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
      if (distractors.length >= 3) break;
    }

    if (distractors.length < 3) {
      for (const r of shuffleArray(broaderPool)) {
        if (!distractors.includes(r)) distractors.push(r);
        if (distractors.length >= 3) break;
      }
    }

    return shuffleArray([correct, ...distractors])
      .filter(Boolean)
      .map((r) => formatReadingForType(r, displayType));
  }, [card, cardQuestionMode, filteredBaseCards]);

  useEffect(() => {
    if (!checked) return;
    if (inRecallFlow) return;
    if (autoAdvancePaused) return;

    const timer = window.setTimeout(() => {
      nextCard();
    }, KANJI_AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [checked, inRecallFlow, autoAdvancePaused]);

  useEffect(() => {
    if (!recallRevealed) return;
    if (autoAdvancePaused) return;

    const timer = window.setTimeout(() => {
      nextCard();
    }, KANJI_AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [recallRevealed, recallResult, recallMatchedWord, autoAdvancePaused]);

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
        if (effectiveAnswerStyle === "typing" && e.key === "Enter") {
          e.preventDefault();
          submitTypingAnswer();
          return;
        }

        if (effectiveAnswerStyle !== "multipleChoice") return;

        if (e.key === "1" && options[0]) checkAnswer(options[0]);
        if (e.key === "2" && options[1]) checkAnswer(options[1]);
        if (e.key === "3" && options[2]) checkAnswer(options[2]);
        if (e.key === "4" && options[3]) checkAnswer(options[3]);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [card, checked, options, inRecallFlow, effectiveAnswerStyle, typingAnswer]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  async function flagKanjiCardForReview(cardToFlag: QuizCard) {
    const { data: authForReport, error: authError } = await supabase.auth.getUser();
    const user = authForReport?.user;

    if (authError || !user) {
      setNotice("Please sign in to flag this card.");
      return;
    }

    const reportReason = `Kanji reading flagged: ${cardToFlag.kanji} in ${cardToFlag.sourceWord}`;

    const { error } = await supabase.from("kanji_map_reports").insert({
      vocabulary_kanji_map_id: cardToFlag.kanjiMapId,
      reported_by_user_id: user.id,
      reason: reportReason,
      status: "open",
    });

    if (error) {
      if (error.code === "23505") {
        setNotice("Already flagged for review");
        setDeck((prev) => prev.filter((_, i) => i !== index));
        return;
      }

      console.error("Error reporting kanji card:", error);
      setNotice("Could not flag this card.");
      return;
    }

    setNotice("✅ Flagged for review");
    setDeck((prev) => prev.filter((_, i) => i !== index));
  }

  function resetCardState() {
    setSelected(null);
    setChecked(null);
    setTypingAnswer("");
    setGuessInput("");
    setRecallRevealed(false);
    setRecallResult(null);
    setRecallMatchedWord(null);
    setRecallMatchedCard(null);
    setAutoAdvancePaused(false);
  }

  function buildDeckFromCards(cards: QuizCard[]) {
    if (cards.length === 0) {
      setDeck([]);
      setIndex(0);
      resetCardState();
      return;
    }

    const dateKey = localDateKey();
    const oneCardPerWord = selectOneCardPerSourceWordForDay(cards, dateKey);

    const dailyKanjiCards = shuffleArray(selectOneCardPerKanji(oneCardPerWord));

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

    const displayedCorrect = correctAnswerForCard(card, studyMode);
    const ok =
      cardQuestionMode === "kanjiChoice"
        ? choice.trim() === displayedCorrect
        : normalizeReadingAnswer(choice) === normalizeReadingAnswer(displayedCorrect);

    setSelected(choice);
    setChecked({ ok, correct: displayedCorrect });
    setGuessInput("");
    setRecallRevealed(false);
    setRecallResult(null);

    recordKanjiReadingStudyEvent({
      result: ok ? "correct" : "incorrect",
      isCorrect: ok,
      cardType: `kanji_reading_choice_${studyMode}`,
    });

  }

  function submitTypingAnswer() {
    if (!card || checked || effectiveAnswerStyle !== "typing") return;

    const answer = typingAnswer.trim();
    if (!answer) return;

    const displayedCorrect = correctAnswerForCard(card, studyMode);
    const ok = normalizeReadingAnswer(answer) === normalizeReadingAnswer(displayedCorrect);

    setSelected(answer);
    setChecked({ ok, correct: displayedCorrect });
    setGuessInput("");
    setRecallRevealed(false);
    setRecallResult(null);

    recordKanjiReadingStudyEvent({
      result: ok ? "correct" : "incorrect",
      isCorrect: ok,
      cardType: `kanji_reading_typing_${studyMode}`,
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
    return <KanjiStudyLoadingState />;
  }

  if (needsSignIn) {
    return (
      <KanjiStudyAccessState
        title="Sign in required"
        message="You need to sign in to use Kanji Study."
        primaryHref="/login"
        primaryLabel="Go to Login"
      />
    );
  }

  if (errorMsg) {
    return (
      <KanjiStudyAccessState
        title="Kanji Study could not load"
        message={errorMsg}
        primaryHref="/books"
        primaryLabel="Back to Library"
      />
    );
  }

  if (baseCards.length === 0) {
    return (
      <KanjiStudyAccessState
        title="No kanji cards are ready yet"
        message="Kanji Study does not have cards available right now."
        primaryHref="/books"
        primaryLabel="Back to Library"
      />
    );
  }

  if (!canAccessKanjiPractice) {
    return <KanjiStudyPreviewLockedState />;
  }

  const noCardsForCurrentMode = filteredBaseCards.length === 0 || deck.length === 0;

  if (!noCardsForCurrentMode && index >= deck.length) {
    return (
      <KanjiStudyCompleteState
        endedEarly={endedEarly}
        onBackToStudyHub={() => router.push("/library-study")}
        onRestart={restartDeck}
      />
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-100 px-6 py-4">
      <div className="mb-2 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <KanjiStudyHeader />
      </div>

      <KanjiStudyModeSelector
        value={studyMode}
        options={KANJI_STUDY_MODE_OPTIONS}
        onChange={(value) => setStudyMode(value as KanjiStudyMode)}
      />

      <KanjiStudyProgressPanel
        current={index + 1}
        total={deck.length}
        levelFilter={levelFilter}
        onLevelFilterChange={(value) => setLevelFilter(value as LevelFilter)}
        summaryText={studyModeSummary(studyMode)}
      />

      {cardQuestionMode === "readingChoice" && !noCardsForCurrentMode ? (
        <KanjiAnswerStyleSelector
          value={effectiveAnswerStyle}
          onChange={setAnswerStyle}
        />
      ) : null}

      <KanjiStudyNotice notice={notice} />

      {noCardsForCurrentMode ? (
        <KanjiStudyNoCardsState />
      ) : (
        <>

          <KanjiStudyCardFrame
            flaggedForReview={card.flaggedForReview}
            kanji={card.kanji}
            showReadingTypeBadge={Boolean(card.readingType)}
            readingTypeText={card.readingType ? readingTypeLabel(card.readingType) : ""}
            strokeCount={card.strokeCount}
            radical={card.radical}
            radicalName={card.radicalName}
            onCardClick={() => {
              if (!checked && !inRecallFlow) return;
              if (inRecallFlow) return;
              if (checked) nextCard();
            }}
          >
            <div className="flex w-full flex-col items-center justify-center gap-6">
              <KanjiStudyPrompt
                label={promptLabelForStudyMode(studyMode)}
                mainText={promptTextForStudyMode(card, studyMode)}
                contextWord={cardQuestionMode === "readingChoice" ? card.sourceWord : undefined}
                targetKanji={cardQuestionMode === "readingChoice" ? card.kanji : undefined}
              />

              {effectiveAnswerStyle === "typing" ? (
                <KanjiStudyTypingAnswer
                  value={typingAnswer}
                  disabled={!!checked}
                  placeholder={
                    card.readingType === "onyomi"
                      ? "Type the onyomi reading"
                      : "Type the kunyomi reading"
                  }
                  onChange={setTypingAnswer}
                  onSubmit={submitTypingAnswer}
                />
              ) : (
                <KanjiStudyOptionList
                  disabled={!!checked}
                  onChoose={checkAnswer}
                  options={options.map((opt) => {
                    const displayedCorrect = correctAnswerForCard(card, studyMode);

                    const isCorrect =
                      !!checked &&
                      (cardQuestionMode === "kanjiChoice"
                        ? opt.trim() === displayedCorrect
                        : normalizeReadingAnswer(opt) === normalizeReadingAnswer(displayedCorrect));

                    const isChosen =
                      !!selected &&
                      (cardQuestionMode === "kanjiChoice"
                        ? opt.trim() === selected.trim()
                        : normalizeReadingAnswer(opt) === normalizeReadingAnswer(selected));

                    return {
                      value: opt,
                      largeText: cardQuestionMode === "kanjiChoice",
                      state: !checked
                        ? "idle"
                        : isCorrect
                          ? "correct"
                          : isChosen
                            ? "wrong"
                            : "neutral",
                    };
                  })}
                />
              )}

              {checked ? (
                <KanjiStudyFeedbackPanel
                  checked={checked}
                  card={card}
                  showBaseReading={
                    cardQuestionMode === "readingChoice" &&
                    card.readingType === "kunyomi" &&
                    isKunWithOkurigana(card.sourceWord) &&
                    Boolean(card.baseReading) &&
                    normalizeReading(card.baseReading) !== normalizeReading(card.reading)
                  }
                  baseReading={card.baseReading}
                  showExample={!inRecallFlow}
                  relatedExamples={relatedReadingExamplesForCard(card, baseCards)}
                  autoAdvancePaused={autoAdvancePaused}
                  onToggleAutoAdvancePaused={() => setAutoAdvancePaused((prev) => !prev)}
                  recallSlot={
                    inRecallFlow ? (
                      <KanjiRecallPanel
                        card={card}
                        recallMode={recallMode}
                        recallRevealed={recallRevealed}
                        recallResult={recallResult}
                        recallMatchedWord={recallMatchedWord}
                        recallMatchedCard={recallMatchedCard}
                        guessInput={guessInput}
                        onGuessChange={setGuessInput}
                        onSubmitGuess={submitGuess}
                        onRevealRecallCard={() => revealRecallCard("shown")}
                        onNext={nextCard}
                      />
                    ) : null
                  }
                />
              ) : null}
            </div>
          </KanjiStudyCardFrame>

          <KanjiStudyBottomControls
            canGoPrevious={index > 0}
            onPrevious={previousCard}
            onFinish={finishForToday}
            onFlag={() => {
              if (card) void flagKanjiCardForReview(card);
            }}
          />
        </>
      )}
    </main>
  );
}
