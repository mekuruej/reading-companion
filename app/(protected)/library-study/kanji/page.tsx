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
import KanjiRecallPanel from "./components/KanjiRecallPanel";
import KanjiStudyOptionList from "./components/KanjiStudyOptionList";
import KanjiStudyFeedbackPanel from "./components/KanjiStudyFeedbackPanel";
import KanjiStudyCardFrame from "./components/KanjiStudyCardFrame";
import KanjiStudyPrompt from "./components/KanjiStudyPrompt";
import KanjiStudyModeSelector from "./components/KanjiStudyModeSelector";
import KanjiStudyTypingAnswer from "./components/KanjiStudyTypingAnswer";
import KanjiStudyNoCardsState from "./components/KanjiStudyNoCardsState";
import KanjiStudyFilterPanel, {
  KANJI_LEVEL_FILTER_VALUES,
  type KanjiLevelFilter,
} from "./components/KanjiStudyFilterPanel";
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

type KanjiRadicalMetaRow = {
  kanji: string;
  radical: string | null;
  radical_name: string | null;
  radical_english_name: string | null;
  jlpt_level: string | null;
  is_jouyou: boolean | null;
  school_grade: number | null;
  stroke_count: number | null;
};

type QuizCard = {
  key: string;
  kanjiMapId: number;
  kanjiPosition: number | null;
  flaggedForReview: boolean;
  kanji: string;
  reading: string;
  readingType: "onyomi" | "kunyomi" | "other" | null;
  sourceWord: string;
  sourceMeaning: string | null;
  sourceReading: string | null;
  jlpt: string | null;
  kanjiJlpt: string | null;
  wordJlpt: string | null;
  userBookId: string | null;
  userBookWordId: string | null;
  bookTitle: string | null;
  bookCover: string | null;
  strokeCount: number | null;
  radical: string | null;
  radicalName: string | null;
  radicalEnglishName: string | null;
  isJouyou: boolean | null;
  schoolGrade: number | null;
  chapterNumber: number | null;
  chapterName: string | null;
  pageNumber: number | null;
  baseReading: string | null;
};

type RecallResult = "correct" | "wrong" | "shown" | "unverified" | null;
type RecallMode = "wordForKanji" | "kanjiForReading";
type CardQuestionMode = "readingChoice" | "kanjiChoice" | "strokeCountChoice";
type LevelFilter = KanjiLevelFilter;
type KanjiAnswerStyle = "multipleChoice" | "typing";
type KanjiStudyMode =
  | "kunyomiToKanji"
  | "kanjiToKunyomi"
  | "onyomiToKanji"
  | "kanjiToOnyomi"
  | "kanjiStrokeCount";

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
    {
      value: "kanjiStrokeCount",
      label: "Kanji stroke count",
      description: "See a kanji and choose how many strokes it has.",
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

function normalizeKanjiLevel(jlpt: string | null | undefined): LevelFilter {
  const normalized = (jlpt ?? "")
    .trim()
    .toUpperCase()
    .replace(/^JLPT[-_\s]?/, "");

  if (
    normalized === "N5" ||
    normalized === "N4" ||
    normalized === "N3" ||
    normalized === "N2" ||
    normalized === "N1"
  ) {
    return normalized;
  }

  if (
    normalized === "5" ||
    normalized === "4" ||
    normalized === "3" ||
    normalized === "2" ||
    normalized === "1"
  ) {
    return `N${normalized}` as LevelFilter;
  }

  return "unlabeled";
}

function matchesLevelFilters(
  jlpt: string | null | undefined,
  selectedLevels: LevelFilter[]
) {
  if (
    selectedLevels.length === 0 ||
    selectedLevels.length === KANJI_LEVEL_FILTER_VALUES.length
  ) {
    return true;
  }

  return selectedLevels.includes(normalizeKanjiLevel(jlpt));
}

function jlptRank(value: string | null | undefined) {
  const normalized = normalizeKanjiLevel(value);
  if (normalized === "N5") return 5;
  if (normalized === "N4") return 4;
  if (normalized === "N3") return 3;
  if (normalized === "N2") return 2;
  if (normalized === "N1") return 1;
  return null;
}

function wordLevelAllowedForKanji(kanjiJlpt: string | null | undefined, wordJlpt: string | null | undefined) {
  const kanjiLevel = normalizeKanjiLevel(kanjiJlpt);
  const wordLevel = normalizeKanjiLevel(wordJlpt);

  if (kanjiLevel === "unlabeled") {
    return wordLevel === "unlabeled";
  }

  if (wordLevel === "unlabeled") return false;

  const kanjiRank = jlptRank(kanjiLevel);
  const wordRank = jlptRank(wordLevel);
  if (kanjiRank == null || wordRank == null) return false;

  const allowedWordRank = Math.max(1, kanjiRank - 1);
  return wordRank >= allowedWordRank;
}

function kanjiLevelSummaryLabel(selectedLevels: LevelFilter[]) {
  if (
    selectedLevels.length === 0 ||
    selectedLevels.length === KANJI_LEVEL_FILTER_VALUES.length
  ) {
    return "All levels";
  }

  if (selectedLevels.length === 1) {
    const level = selectedLevels[0];

    if (level === "N5") return "Beginner: N5";
    if (level === "N4") return "Upper Beginner: N4";
    if (level === "N3") return "Lower Intermediate: N3";
    if (level === "N2") return "Upper Intermediate: N2";
    if (level === "N1") return "Advanced: N1";
    return "Unlabeled";
  }

  return KANJI_LEVEL_FILTER_VALUES.filter((level) =>
    selectedLevels.includes(level)
  )
    .map((level) => (level === "unlabeled" ? "Unlabeled" : level))
    .join(" + ");
}

function readingTypeForStudyMode(mode: KanjiStudyMode): QuizCard["readingType"] | null {
  if (mode === "kanjiStrokeCount") return null;
  return mode === "kunyomiToKanji" || mode === "kanjiToKunyomi" ? "kunyomi" : "onyomi";
}

function questionModeForStudyMode(mode: KanjiStudyMode): CardQuestionMode {
  if (mode === "kanjiStrokeCount") return "strokeCountChoice";
  return mode === "kunyomiToKanji" || mode === "onyomiToKanji"
    ? "kanjiChoice"
    : "readingChoice";
}

function studyModeSummary(mode: KanjiStudyMode) {
  if (mode === "kunyomiToKanji") return "Kunyomi to kanji";
  if (mode === "kanjiToKunyomi") return "Kanji to kunyomi";
  if (mode === "onyomiToKanji") return "Onyomi to kanji";
  if (mode === "kanjiStrokeCount") return "Kanji stroke count";
  return "Kanji to onyomi";
}

function nextKanjiStudyMode(mode: KanjiStudyMode): KanjiStudyMode {
  if (mode === "kanjiStrokeCount") return "kanjiToOnyomi";
  if (mode === "kanjiToOnyomi") return "onyomiToKanji";
  if (mode === "onyomiToKanji") return "kanjiToKunyomi";
  if (mode === "kanjiToKunyomi") return "kunyomiToKanji";
  return "kanjiStrokeCount";
}

function studyModeDescription(mode: KanjiStudyMode) {
  return (
    KANJI_STUDY_MODE_OPTIONS.find((option) => option.value === mode)
      ?.description ?? studyModeSummary(mode)
  );
}

function correctAnswerForCard(card: QuizCard, mode: KanjiStudyMode) {
  const questionMode = questionModeForStudyMode(mode);
  if (questionMode === "kanjiChoice") return card.kanji;
  if (questionMode === "strokeCountChoice") return String(card.strokeCount ?? "");
  return formatReadingForType(card.reading, card.readingType);
}

function promptLabelForStudyMode(mode: KanjiStudyMode) {
  if (mode === "kunyomiToKanji") return "Kunyomi";
  if (mode === "onyomiToKanji") return "Onyomi";
  if (mode === "kanjiStrokeCount") return "Stroke Count";
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

function strokeCountOptionsForCard(card: QuizCard) {
  const correct = card.strokeCount;
  if (correct == null) return [];

  const bucketStart = Math.floor((correct - 1) / 4) * 4 + 1;
  return Array.from({ length: 4 }, (_, index) => String(bucketStart + index));
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

const ROMAJI_TO_HIRAGANA_MAP: Record<string, string> = {
  kya: "きゃ",
  kyu: "きゅ",
  kyo: "きょ",
  gya: "ぎゃ",
  gyu: "ぎゅ",
  gyo: "ぎょ",
  sha: "しゃ",
  shu: "しゅ",
  sho: "しょ",
  ja: "じゃ",
  ju: "じゅ",
  jo: "じょ",
  jya: "じゃ",
  jyu: "じゅ",
  jyo: "じょ",
  cha: "ちゃ",
  chu: "ちゅ",
  cho: "ちょ",
  nya: "にゃ",
  nyu: "にゅ",
  nyo: "にょ",
  hya: "ひゃ",
  hyu: "ひゅ",
  hyo: "ひょ",
  bya: "びゃ",
  byu: "びゅ",
  byo: "びょ",
  pya: "ぴゃ",
  pyu: "ぴゅ",
  pyo: "ぴょ",
  mya: "みゃ",
  myu: "みゅ",
  myo: "みょ",
  rya: "りゃ",
  ryu: "りゅ",
  ryo: "りょ",

  shi: "し",
  chi: "ち",
  tsu: "つ",
  fu: "ふ",
  ji: "じ",

  ka: "か",
  ki: "き",
  ku: "く",
  ke: "け",
  ko: "こ",
  ga: "が",
  gi: "ぎ",
  gu: "ぐ",
  ge: "げ",
  go: "ご",

  sa: "さ",
  si: "し",
  su: "す",
  se: "せ",
  so: "そ",
  za: "ざ",
  zi: "じ",
  zu: "ず",
  ze: "ぜ",
  zo: "ぞ",

  ta: "た",
  ti: "ち",
  tu: "つ",
  te: "て",
  to: "と",
  da: "だ",
  di: "ぢ",
  du: "づ",
  de: "で",
  do: "ど",

  na: "な",
  ni: "に",
  nu: "ぬ",
  ne: "ね",
  no: "の",

  ha: "は",
  hi: "ひ",
  hu: "ふ",
  he: "へ",
  ho: "ほ",
  ba: "ば",
  bi: "び",
  bu: "ぶ",
  be: "べ",
  bo: "ぼ",
  pa: "ぱ",
  pi: "ぴ",
  pu: "ぷ",
  pe: "ぺ",
  po: "ぽ",

  ma: "ま",
  mi: "み",
  mu: "む",
  me: "め",
  mo: "も",

  ya: "や",
  yu: "ゆ",
  yo: "よ",

  ra: "ら",
  ri: "り",
  ru: "る",
  re: "れ",
  ro: "ろ",

  wa: "わ",
  wo: "を",

  a: "あ",
  i: "い",
  u: "う",
  e: "え",
  o: "お",
  n: "ん",
};

function romajiToHiragana(value: string) {
  let input = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/ō/g, "ou")
    .replace(/ū/g, "uu")
    .replace(/ā/g, "aa")
    .replace(/ī/g, "ii")
    .replace(/ē/g, "ei");

  let output = "";

  while (input.length > 0) {
    const doubleConsonant = input.match(/^([bcdfghjklmpqrstvwxyz])\1/);

    if (doubleConsonant && doubleConsonant[1] !== "n") {
      output += "っ";
      input = input.slice(1);
      continue;
    }

    if (input.startsWith("nn")) {
      output += "ん";
      input = input.slice(2);
      continue;
    }

    if (input.startsWith("n") && !/^[aeiouy]/.test(input.slice(1, 2))) {
      output += "ん";
      input = input.slice(1);
      continue;
    }

    const chunk =
      input.slice(0, 3) in ROMAJI_TO_HIRAGANA_MAP
        ? input.slice(0, 3)
        : input.slice(0, 2) in ROMAJI_TO_HIRAGANA_MAP
          ? input.slice(0, 2)
          : input.slice(0, 1);

    const kana = ROMAJI_TO_HIRAGANA_MAP[chunk];

    if (!kana) {
      output += chunk;
      input = input.slice(chunk.length);
      continue;
    }

    output += kana;
    input = input.slice(chunk.length);
  }

  return output;
}

function readingAnswerMatches(input: string, correctAnswer: string) {
  if (normalizeReadingAnswer(input) === normalizeReadingAnswer(correctAnswer)) {
    return true;
  }

  return normalizeReadingAnswer(romajiToHiragana(input)) === normalizeReadingAnswer(correctAnswer);
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

function splitKunyomiPromptReadingByPosition(card: QuizCard) {
  const reading = kataToHira(card.sourceReading ?? "").trim();
  const target = kataToHira(card.reading ?? "").trim();
  if (!reading || !target) return splitKunyomiPromptReading(card.sourceReading, card.reading);

  const sourceChars = Array.from(card.sourceWord);
  const readingChars = Array.from(reading);
  const targetChars = Array.from(target);
  const position = card.kanjiPosition;

  if (position == null || position < 0) {
    return splitKunyomiPromptReading(card.sourceReading, card.reading);
  }

  let sourceCharIndex = -1;
  let seenKanji = 0;
  for (const [index, char] of sourceChars.entries()) {
    if (!/\p{Script=Han}/u.test(char)) continue;
    if (seenKanji === position) {
      sourceCharIndex = index;
      break;
    }
    seenKanji += 1;
  }

  if (sourceCharIndex === -1) {
    return splitKunyomiPromptReading(card.sourceReading, card.reading);
  }

  let readingOffset = 0;
  for (let index = 0; index < sourceCharIndex; index += 1) {
    const char = sourceChars[index];
    if (/\p{Script=Hiragana}/u.test(char) || /\p{Script=Katakana}/u.test(char)) {
      readingOffset += Array.from(kataToHira(char)).length;
      continue;
    }

    readingOffset += 1;
  }

  const normalizedReading = normalizeReading(reading);
  const normalizedTarget = normalizeReading(target);
  const normalizedSlice = normalizeReading(readingChars.slice(readingOffset).join(""));

  if (!normalizedSlice.startsWith(normalizedTarget)) {
    const fallbackIndex = normalizedReading.indexOf(normalizedTarget);
    if (fallbackIndex >= 0) readingOffset = Array.from(reading.slice(0, fallbackIndex)).length;
  }

  const endOffset = Math.min(readingChars.length, readingOffset + targetChars.length);

  return {
    before: readingChars.slice(0, readingOffset).join(""),
    strong: readingChars.slice(readingOffset, endOffset).join(""),
    ghost: readingChars.slice(endOffset).join(""),
  };
}

function kunyomiToKanjiPromptForCard(card: QuizCard) {
  const splitReading = splitKunyomiPromptReadingByPosition(card);
  if (!splitReading.strong && !splitReading.ghost) return null;

  return splitReading;
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

function missingKanjiRadicalColumnName(error: unknown) {
  const message = typeof (error as any)?.message === "string" ? (error as any).message : "";
  if (message.includes("jlpt_level") && message.includes("does not exist")) return "jlpt_level";
  if (message.includes("radical_english_name") && message.includes("does not exist")) return "radical_english_name";
  if (message.includes("is_jouyou") && message.includes("does not exist")) return "is_jouyou";
  if (message.includes("school_grade") && message.includes("does not exist")) return "school_grade";
  return null;
}

function kanjiRadicalMetaSelectColumns(includeJlptLevel: boolean, includeEnglishName: boolean, includeJouyou: boolean, includeSchoolGrade: boolean) {
  return [
    "kanji",
    "radical",
    "radical_name",
    includeEnglishName ? "radical_english_name" : null,
    includeJlptLevel ? "jlpt_level" : null,
    includeJouyou ? "is_jouyou" : null,
    includeSchoolGrade ? "school_grade" : null,
    "stroke_count",
  ].filter(Boolean).join(", ");
}

async function loadKanjiRadicalMetaRows(kanjiChunk: string[]) {
  let includeJlptLevel = true;
  let includeEnglishName = true;
  let includeJouyou = true;
  let includeSchoolGrade = true;

  while (true) {
    const result = await supabase
      .from("kanji_radicals")
      .select(kanjiRadicalMetaSelectColumns(includeJlptLevel, includeEnglishName, includeJouyou, includeSchoolGrade))
      .in("kanji", kanjiChunk)
      .returns<Partial<KanjiRadicalMetaRow>[]>();

    if (!result.error) {
      return (result.data ?? []).map((row) => ({
        kanji: row.kanji ?? "",
        radical: row.radical ?? null,
        radical_name: row.radical_name ?? null,
        radical_english_name: row.radical_english_name ?? null,
        jlpt_level: row.jlpt_level ?? null,
        is_jouyou: row.is_jouyou ?? null,
        school_grade: row.school_grade ?? null,
        stroke_count: row.stroke_count ?? null,
      }));
    }

    const missing = missingKanjiRadicalColumnName(result.error);
    if (missing === "jlpt_level" && includeJlptLevel) {
      includeJlptLevel = false;
      continue;
    }
    if (missing === "radical_english_name" && includeEnglishName) {
      includeEnglishName = false;
      continue;
    }
    if (missing === "is_jouyou" && includeJouyou) {
      includeJouyou = false;
      continue;
    }
    if (missing === "school_grade" && includeSchoolGrade) {
      includeSchoolGrade = false;
      continue;
    }

    throw result.error;
  }
}

async function loadKanjiMapRows() {
  const rows: KanjiMapRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("vocabulary_kanji_map")
      .select(
        "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading, excluded_from_kanji_practice, flagged_for_review"
      )
      .not("kanji", "is", null)
      .not("base_reading", "is", null)
      .not("realized_reading", "is", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<KanjiMapRow[]>();

    if (error) throw error;

    const pageRows = data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) break;
    from += pageSize;
  }

  return rows;
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

  const [levelFilters, setLevelFilters] = useState<LevelFilter[]>(
    [...KANJI_LEVEL_FILTER_VALUES]
  );
  const [studyMode, setStudyMode] = useState<KanjiStudyMode>("kanjiToOnyomi");

  const canAccessKanjiPractice = true;

  const filteredBaseCards = useMemo(() => {
    const readingType = readingTypeForStudyMode(studyMode);

    return baseCards.filter((card) => {
      if (!card.kanji || !matchesLevelFilters(card.kanjiJlpt, levelFilters)) return false;
      if (!wordLevelAllowedForKanji(card.kanjiJlpt, card.wordJlpt)) return false;

      if (studyMode === "kanjiStrokeCount") {
        return card.strokeCount != null;
      }

      return card.readingType === readingType && !!card.reading;
    });
  }, [baseCards, levelFilters, studyMode]);

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

        const kanjiMapRows = await loadKanjiMapRows();

        const activeKanjiMapRows = kanjiMapRows.filter((row) => {
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
        const kanjiChars = Array.from(
          new Set(
            activeKanjiMapRows
              .map((row) => row.kanji?.trim() ?? "")
              .filter(Boolean)
          )
        );

        const vocabularyById = new Map<number, VocabularyCacheRow>();
        const radicalMetaByKanji = new Map<string, KanjiRadicalMetaRow>();

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

        for (const kanjiChunk of chunkArray(kanjiChars, 400)) {
          const radicalRows = await loadKanjiRadicalMetaRows(kanjiChunk);

          for (const row of radicalRows) {
            radicalMetaByKanji.set(row.kanji, row);
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
          const radicalMeta = km.kanji ? radicalMetaByKanji.get(km.kanji) : null;
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
            kanjiPosition: km.kanji_position,
            flaggedForReview: !!km.flagged_for_review,
            kanji: km.kanji,
            reading,
            baseReading: km.base_reading?.trim() || null,
            readingType,
            sourceWord: surface,
            sourceMeaning,
            sourceReading,
            jlpt: radicalMeta?.jlpt_level ?? vocab?.jlpt ?? null,
            kanjiJlpt: radicalMeta?.jlpt_level ?? null,
            wordJlpt: vocab?.jlpt ?? null,
            userBookId: context?.user_book_id ?? null,
            userBookWordId: context?.id ?? null,
            bookTitle: context
              ? bookInfoByUserBookId.get(context.user_book_id)?.title ?? "Untitled Book"
              : null,
            bookCover: context
              ? bookInfoByUserBookId.get(context.user_book_id)?.cover ?? null
              : null,
            strokeCount: radicalMeta?.stroke_count ?? null,
            radical: radicalMeta?.radical ?? null,
            radicalName: radicalMeta?.radical_name ?? null,
            radicalEnglishName: radicalMeta?.radical_english_name ?? null,
            isJouyou: radicalMeta?.is_jouyou ?? null,
            schoolGrade: radicalMeta?.school_grade ?? null,
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

    if (cardQuestionMode === "strokeCountChoice") {
      return strokeCountOptionsForCard(card);
    }

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

    const studyCards = shuffleArray(selectOneCardPerKanji(cards));

    const onePassDeck = studyCards.map((c, i) => ({
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

  function moveDeckToNextMode() {
    const nextMode = nextKanjiStudyMode(studyMode);
    setStudyMode(nextMode);
    setIndex(0);
    resetCardState();
    setSkipTypingThisSession(false);
    setEndedEarly(false);
    setUsedRecallWords([]);
    setCardsSinceLastRecall(0);
    setNotice(`Next mode: ${studyModeSummary(nextMode)}`);
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
      cardQuestionMode === "kanjiChoice" || cardQuestionMode === "strokeCountChoice"
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
    const ok = readingAnswerMatches(answer, displayedCorrect);

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

  function shuffleCurrentDeck() {
    if (deck.length <= 1) {
      setNotice("Not enough cards to shuffle");
      return;
    }

    setDeck((currentDeck) => shuffleArray(currentDeck));
    setIndex(0);
    resetCardState();
    setEndedEarly(false);
    setNotice("Shuffled cards");
  }

  function handleToggleLevelFilter(level: LevelFilter) {
    setLevelFilters((current) =>
      current.includes(level)
        ? current.filter((selectedLevel) => selectedLevel !== level)
        : [...current, level]
    );
  }

  function handleSelectAllLevelFilters() {
    setLevelFilters([...KANJI_LEVEL_FILTER_VALUES]);
  }

  function handleClearLevelFilters() {
    setLevelFilters([]);
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
        nextModeLabel={studyModeSummary(nextKanjiStudyMode(studyMode))}
        onBackToStudyHub={() => router.push("/library-study")}
        onNextMode={moveDeckToNextMode}
        onRestart={restartDeck}
      />
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-100 px-6 py-4">
      <KanjiStudyHeader
        note="This is kanji reading practice, so easier kanji may appear in harder words, and harder kanji may appear in easier words. To study whole words, use Library Review."
        onOpenCharacterStudy={() => router.push("/library-study/characters")}
        onOpenLibrary={() => router.push("/library")}
      />

      <div className="mb-4 w-full max-w-3xl space-y-0"></div>
      <KanjiStudyFilterPanel
        selectedLevels={levelFilters}
        onToggleLevel={handleToggleLevelFilter}
        onSelectAll={handleSelectAllLevelFilters}
        onClear={handleClearLevelFilters}
      />

      <KanjiStudyModeSelector
        value={studyMode}
        options={KANJI_STUDY_MODE_OPTIONS}
        onChange={(value) => setStudyMode(value as KanjiStudyMode)}
        showAnswerStyle={cardQuestionMode === "readingChoice" && !noCardsForCurrentMode}
        answerStyle={effectiveAnswerStyle}
        onAnswerStyleChange={setAnswerStyle}
      />

      <div className="mb-5 w-full max-w-3xl"></div>
      <KanjiStudyProgressPanel
        current={index + 1}
        total={deck.length}
        summaryText={studyModeSummary(studyMode)}
        answerModeLabel={effectiveAnswerStyle === "typing" ? "Typing" : "Multiple Choice"}
        levelSummaryLabel={kanjiLevelSummaryLabel(levelFilters)}
      />

      <KanjiStudyNotice notice={notice} />

      {noCardsForCurrentMode ? (
        <KanjiStudyNoCardsState />
      ) : (
        <>

          <KanjiStudyCardFrame
            flaggedForReview={card.flaggedForReview}
            kanji={card.kanji}
            showReadingTypeBadge={studyMode === "kanjiStrokeCount" || Boolean(card.readingType)}
            readingTypeText={studyMode === "kanjiStrokeCount" ? "Strokes" : card.readingType ? readingTypeLabel(card.readingType) : ""}
            strokeCount={studyMode === "kanjiStrokeCount" && !checked ? null : card.strokeCount}
            radical={card.radical}
            radicalName={card.radicalName}
            radicalEnglishName={card.radicalEnglishName}
            isJouyou={card.isJouyou}
            schoolGrade={card.schoolGrade}
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
                readingPrompt={
                  studyMode === "kunyomiToKanji" ? kunyomiToKanjiPromptForCard(card) ?? undefined : undefined
                }
                contextWord={cardQuestionMode === "readingChoice" ? card.sourceWord : undefined}
                targetKanji={cardQuestionMode === "readingChoice" ? card.kanji : undefined}
              />

              {studyMode === "kanjiStrokeCount" && !checked ? (
                <p className="text-sm font-semibold text-slate-500">
                  How many strokes does this kanji have?
                </p>
              ) : null}

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
                      (cardQuestionMode === "kanjiChoice" || cardQuestionMode === "strokeCountChoice"
                        ? opt.trim() === displayedCorrect
                        : normalizeReadingAnswer(opt) === normalizeReadingAnswer(displayedCorrect));

                    const isChosen =
                      !!selected &&
                      (cardQuestionMode === "kanjiChoice" || cardQuestionMode === "strokeCountChoice"
                        ? opt.trim() === selected.trim()
                        : normalizeReadingAnswer(opt) === normalizeReadingAnswer(selected));

                    return {
                      value: opt,
                      largeText: cardQuestionMode === "kanjiChoice" || cardQuestionMode === "strokeCountChoice",
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
                  showExample={studyMode !== "kanjiStrokeCount" && !inRecallFlow}
                  relatedExamples={studyMode === "kanjiStrokeCount" ? [] : relatedReadingExamplesForCard(card, baseCards)}
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
            onShuffle={shuffleCurrentDeck}
            onFlag={() => {
              if (card) void flagKanjiCardForReview(card);
            }}
          />
        </>
      )}
    </main>
  );
}
