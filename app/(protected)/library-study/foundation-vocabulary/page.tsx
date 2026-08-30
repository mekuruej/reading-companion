// Foundation Vocabulary
//
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import MultipleChoiceAnswerPanel from "@/app/(protected)/books/[userBookId]/study/components/MultipleChoiceAnswerPanel";
import Row from "@/app/(protected)/books/[userBookId]/study/components/StudyCardFieldRow";
import StudyFlashcardShell from "@/app/(protected)/books/[userBookId]/study/components/StudyFlashcardShell";
import StudyModePanel from "@/app/(protected)/books/[userBookId]/study/components/StudyModePanel";
import StudyProgressPanel from "@/app/(protected)/books/[userBookId]/study/components/StudyProgressPanel";
import TypingAnswerPanel from "@/app/(protected)/books/[userBookId]/study/components/TypingAnswerPanel";
import { JLPT_N5_FOUNDATION_VOCABULARY } from "@/lib/foundationVocabulary";
import { normalizeKanaReading } from "@/lib/kanaInput";

type FoundationMode = "COMPLETE" | "READING_MC" | "MEANING_MC" | "TYPING_READING";

const FOUNDATION_MODE_OPTIONS = [
  { value: "COMPLETE", label: "Complete Review" },
  { value: "READING_MC", label: "Reading MC" },
  { value: "MEANING_MC", label: "Meaning MC" },
  { value: "TYPING_READING", label: "Typing Reading" },
];

const AUTO_FORWARD_MS = 1200;

const KANA_TO_ROMAJI = [
  ["きょ", "kyo"],
  ["きゅ", "kyu"],
  ["きゃ", "kya"],
  ["ぎょ", "gyo"],
  ["ぎゅ", "gyu"],
  ["ぎゃ", "gya"],
  ["しょ", "sho"],
  ["しゅ", "shu"],
  ["しゃ", "sha"],
  ["じょ", "jo"],
  ["じゅ", "ju"],
  ["じゃ", "ja"],
  ["ちょ", "cho"],
  ["ちゅ", "chu"],
  ["ちゃ", "cha"],
  ["にょ", "nyo"],
  ["にゅ", "nyu"],
  ["にゃ", "nya"],
  ["ひょ", "hyo"],
  ["ひゅ", "hyu"],
  ["ひゃ", "hya"],
  ["びょ", "byo"],
  ["びゅ", "byu"],
  ["びゃ", "bya"],
  ["ぴょ", "pyo"],
  ["ぴゅ", "pyu"],
  ["ぴゃ", "pya"],
  ["みょ", "myo"],
  ["みゅ", "myu"],
  ["みゃ", "mya"],
  ["りょ", "ryo"],
  ["りゅ", "ryu"],
  ["りゃ", "rya"],
  ["あ", "a"],
  ["い", "i"],
  ["う", "u"],
  ["え", "e"],
  ["お", "o"],
  ["か", "ka"],
  ["き", "ki"],
  ["く", "ku"],
  ["け", "ke"],
  ["こ", "ko"],
  ["が", "ga"],
  ["ぎ", "gi"],
  ["ぐ", "gu"],
  ["げ", "ge"],
  ["ご", "go"],
  ["さ", "sa"],
  ["し", "shi"],
  ["す", "su"],
  ["せ", "se"],
  ["そ", "so"],
  ["ざ", "za"],
  ["じ", "ji"],
  ["ず", "zu"],
  ["ぜ", "ze"],
  ["ぞ", "zo"],
  ["た", "ta"],
  ["ち", "chi"],
  ["つ", "tsu"],
  ["て", "te"],
  ["と", "to"],
  ["だ", "da"],
  ["ぢ", "ji"],
  ["づ", "zu"],
  ["で", "de"],
  ["ど", "do"],
  ["な", "na"],
  ["に", "ni"],
  ["ぬ", "nu"],
  ["ね", "ne"],
  ["の", "no"],
  ["は", "ha"],
  ["ひ", "hi"],
  ["ふ", "fu"],
  ["へ", "he"],
  ["ほ", "ho"],
  ["ば", "ba"],
  ["び", "bi"],
  ["ぶ", "bu"],
  ["べ", "be"],
  ["ぼ", "bo"],
  ["ぱ", "pa"],
  ["ぴ", "pi"],
  ["ぷ", "pu"],
  ["ぺ", "pe"],
  ["ぽ", "po"],
  ["ま", "ma"],
  ["み", "mi"],
  ["む", "mu"],
  ["め", "me"],
  ["も", "mo"],
  ["や", "ya"],
  ["ゆ", "yu"],
  ["よ", "yo"],
  ["ら", "ra"],
  ["り", "ri"],
  ["る", "ru"],
  ["れ", "re"],
  ["ろ", "ro"],
  ["わ", "wa"],
  ["を", "wo"],
  ["ん", "n"],
] as const;

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeMeaning(value: string) {
  return value.trim().toLowerCase();
}

function isReadingAnswerMode(mode: FoundationMode) {
  return mode === "READING_MC" || mode === "TYPING_READING";
}

function readingAnswersMatch(input: string, correctReading: string) {
  return normalizeKanaReading(input) === normalizeKanaReading(correctReading);
}

function kanaToRomaji(reading: string) {
  const normalized = normalizeKanaReading(reading);
  let output = "";
  let index = 0;

  while (index < normalized.length) {
    const current = normalized[index];

    if (current === "っ") {
      const nextMatch = KANA_TO_ROMAJI.find(([kana]) =>
        normalized.slice(index + 1).startsWith(kana)
      );
      output += nextMatch ? nextMatch[1][0] : "";
      index += 1;
      continue;
    }

    const match = KANA_TO_ROMAJI.find(([kana]) =>
      normalized.slice(index).startsWith(kana)
    );

    if (match) {
      output += match[1];
      index += match[0].length;
      continue;
    }

    output += current;
    index += 1;
  }

  return output;
}

function readingInputExample(reading: string) {
  return `You can type ${reading} or ${kanaToRomaji(reading)}.`;
}

function isComposingEnter(event: ReactKeyboardEvent<HTMLInputElement>) {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

function buildOptions(correct: string, pool: string[]) {
  const seen = new Set([correct]);
  const distractors = shuffleArray(pool.filter((item) => item && !seen.has(item))).slice(0, 3);
  return shuffleArray([correct, ...distractors]);
}

export default function FoundationVocabularyPage() {
  const [mode, setMode] = useState<FoundationMode>("COMPLETE");
  const [order, setOrder] = useState(() =>
    shuffleArray(JLPT_N5_FOUNDATION_VOCABULARY.map((_, index) => index))
  );
  const [sessionIndex, setSessionIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [correctionInput, setCorrectionInput] = useState("");
  const [correctionFeedback, setCorrectionFeedback] = useState<string | null>(null);
  const [correctionAccepted, setCorrectionAccepted] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [typedFeedback, setTypedFeedback] = useState<null | { ok: boolean; message: string }>(null);
  const [readyForNextCard, setReadyForNextCard] = useState(false);
  const [autoForwardPaused, setAutoForwardPaused] = useState(false);
  const [inputResetKey, setInputResetKey] = useState(0);
  const correctionInputRef = useRef<HTMLInputElement | null>(null);
  const typedInputRef = useRef<HTMLInputElement | null>(null);
  const submitTypedAfterCompositionRef = useRef(false);
  const submitCorrectionAfterCompositionRef = useRef(false);

  const card = JLPT_N5_FOUNDATION_VOCABULARY[order[sessionIndex] ?? 0];
  const complete = sessionIndex >= order.length;
  const sessionCurrent = complete ? order.length : Math.min(sessionIndex + 1, order.length);

  const readingOptions = useMemo(
    () => buildOptions(card?.reading ?? "", JLPT_N5_FOUNDATION_VOCABULARY.map((word) => word.reading)),
    [card]
  );
  const meaningOptions = useMemo(
    () => buildOptions(card?.meaning ?? "", JLPT_N5_FOUNDATION_VOCABULARY.map((word) => word.meaning)),
    [card]
  );
  const cardSuccessfullyCompleted =
    (mode === "COMPLETE" && revealStep >= 2) ||
    ((mode === "READING_MC" || mode === "MEANING_MC") && answered && wasCorrect === true) ||
    ((mode === "READING_MC" || mode === "MEANING_MC") && correctionAccepted) ||
    (mode === "TYPING_READING" && readyForNextCard);

  function resetCardState() {
    setRevealStep(0);
    setAnswered(false);
    setSelected(null);
    setWasCorrect(null);
    setCorrectionInput("");
    setCorrectionFeedback(null);
    setCorrectionAccepted(false);
    setTypedInput("");
    setTypedFeedback(null);
    setReadyForNextCard(false);
    setInputResetKey((current) => current + 1);
  }

  function goNext() {
    if (sessionIndex + 1 >= order.length) {
      setSessionIndex(order.length);
    } else {
      setSessionIndex((current) => current + 1);
    }
    resetCardState();
  }

  function markAgain() {
    const currentCardIndex = order[sessionIndex];
    if (currentCardIndex == null) return;

    setOrder((current) => [...current, currentCardIndex]);
    goNext();
  }

  function goPrevious() {
    setSessionIndex((current) => Math.max(0, current - 1));
    resetCardState();
  }

  function shuffleDeck() {
    setOrder(shuffleArray(JLPT_N5_FOUNDATION_VOCABULARY.map((_, index) => index)));
    setSessionIndex(0);
    resetCardState();
  }

  function restartDeck() {
    setSessionIndex(0);
    resetCardState();
  }

  function handleReveal() {
    if (mode !== "COMPLETE") return;
    if (revealStep < 2) {
      setRevealStep((current) => current + 1);
    }
  }

  function handleAnswer(option: string) {
    if (!card || answered) return;

    const correct =
      isReadingAnswerMode(mode)
        ? readingAnswersMatch(option, card.reading)
        : normalizeMeaning(option) === normalizeMeaning(card.meaning);

    setSelected(option);
    setAnswered(true);
    setWasCorrect(correct);
  }

  function checkTypedReadingAnswer(inputOverride?: string) {
    if (!card || readyForNextCard) return;

    const input = (inputOverride ?? typedInput).trim();
    if (!input) return;

    const correct = readingAnswersMatch(input, card.reading);

    if (correct) {
      setTypedFeedback({ ok: true, message: `Correct: ${card.reading}` });
      setReadyForNextCard(true);
      return;
    }

    setTypedInput("");
    setInputResetKey((current) => current + 1);
    setTypedFeedback({
      ok: false,
      message: `Not quite. Correct reading: ${card.reading}`,
    });
    setReadyForNextCard(false);
  }

  function checkCorrectionAnswer(inputOverride?: string) {
    if (!card) return;

    const input = (inputOverride ?? correctionInput).trim();
    if (!input) return;

    const correct =
      isReadingAnswerMode(mode)
        ? readingAnswersMatch(input, card.reading)
        : card.meaning
            .split(";")
            .map((part) => normalizeMeaning(part))
            .filter(Boolean)
            .some((meaning) => normalizeMeaning(input) === meaning);

    if (!correct) {
      setCorrectionInput("");
      setCorrectionAccepted(false);
      setCorrectionFeedback("Try typing the correct answer once.");
      return;
    }

    setCorrectionAccepted(true);
    setCorrectionFeedback(
      autoForwardPaused ? "Good. Use Next when you are ready." : "Good. Next card coming..."
    );
    setCorrectionInput("");
  }

  function handleTypedInputEnter(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    if (isComposingEnter(event)) {
      submitTypedAfterCompositionRef.current = true;
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (readyForNextCard) {
      goNext();
      return;
    }

    checkTypedReadingAnswer();
  }

  function handleTypedCompositionEnd() {
    if (!submitTypedAfterCompositionRef.current) return;

    submitTypedAfterCompositionRef.current = false;
    window.setTimeout(() => {
      checkTypedReadingAnswer(typedInputRef.current?.value ?? typedInput);
    }, 0);
  }

  function handleCorrectionInputEnter(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    if (isComposingEnter(event)) {
      submitCorrectionAfterCompositionRef.current = true;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    checkCorrectionAnswer();
  }

  function handleCorrectionCompositionEnd() {
    if (!submitCorrectionAfterCompositionRef.current) return;

    submitCorrectionAfterCompositionRef.current = false;
    window.setTimeout(() => {
      checkCorrectionAnswer(correctionInputRef.current?.value ?? correctionInput);
    }, 0);
  }

  useEffect(() => {
    if (!cardSuccessfullyCompleted) return;
    if (autoForwardPaused) return;

    const timer = window.setTimeout(goNext, AUTO_FORWARD_MS);
    return () => window.clearTimeout(timer);
  }, [cardSuccessfullyCompleted, autoForwardPaused, sessionIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTypingTarget || answered) return;
      if (mode !== "READING_MC" && mode !== "MEANING_MC") return;

      const optionIndex = Number(event.key) - 1;
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) return;

      const option = (mode === "READING_MC" ? readingOptions : meaningOptions)[optionIndex];
      if (!option) return;

      event.preventDefault();
      handleAnswer(option);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answered, meaningOptions, mode, readingOptions]);

  if (complete) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
          <Link
            href="/library-study"
            className="mb-4 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            ← Back to Study Hub
          </Link>

        <div className="w-full rounded-2xl border bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Foundation Vocabulary
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Nice work!</h1>
          <p className="mt-3 text-gray-700">
            You reviewed the N5 foundation vocabulary deck.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={restartDeck}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Study Again
            </button>
          </div>
        </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <Link
          href="/library-study"
          className="mb-2 w-full text-left text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Study Hub
        </Link>

        <div className="mb-4 flex w-full flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Foundation Set
            </p>
            <h1 className="text-base font-semibold text-stone-900">
              Foundation Vocabulary
            </h1>
            <p className="mt-1 text-sm font-medium text-stone-500">
              JLPT N5 starter words. Free for every reader.
            </p>
          </div>
        </div>

        <div className="mb-7 w-full space-y-0">
          <StudyModePanel
            studySet={mode}
            modeOptions={FOUNDATION_MODE_OPTIONS}
            onStudySetChange={(value) => {
              setMode(value as FoundationMode);
              resetCardState();
            }}
          />
        </div>

        <div className="mb-7 w-full">
          <StudyProgressPanel
            currentNumber={sessionCurrent}
            totalNumber={order.length}
            studyingNowLabel={`JLPT N5 Foundation Vocabulary · ${JLPT_N5_FOUNDATION_VOCABULARY.length} words`}
          />
        </div>

        <StudyFlashcardShell
          isClickable={mode === "COMPLETE" && !cardSuccessfullyCompleted}
          onReveal={handleReveal}
        >
          <div className="absolute left-4 top-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
            <div className="text-xs font-medium leading-none">N5</div>
          </div>

          <div className="absolute right-4 top-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
            <div className="text-xs font-medium leading-none">Foundation</div>
          </div>

          <div className="flex w-full flex-col items-center justify-center gap-3">
            {mode === "COMPLETE" ? (
              <>
                <Row label="Word" value={card.surface} visible big placeholder="---" />
                <Row label="Reading" value={card.reading} visible={revealStep >= 1} placeholder="---" />
                <Row label="Meaning" value={card.meaning} visible={revealStep >= 2} placeholder="---" />
              </>
            ) : mode === "TYPING_READING" ? (
              <>
                <Row label="Word" value={card.surface} visible big placeholder="---" />
                <Row label="Meaning" value={card.meaning} visible placeholder="---" />
                <TypingAnswerPanel
                  answerLabel="Reading"
                  showReadingHint
                  inputKey={`${card.id}-${inputResetKey}`}
                  typedInput={typedInput}
                  typedFeedback={typedFeedback}
                  readyForNextCard={readyForNextCard}
                  placeholder="Type the reading"
                  feedbackHelpText={`${readingInputExample(card.reading)} Next is only there if you need to move on.`}
                  typedInputRef={typedInputRef}
                  onTypedInputChange={(value) => {
                    setTypedInput(value);
                    if (!readyForNextCard) setTypedFeedback(null);
                  }}
                  onTypedInputKeyDown={handleTypedInputEnter}
                  onTypedInputCompositionEnd={handleTypedCompositionEnd}
                  autoAdvancePaused={autoForwardPaused}
                  onToggleAutoAdvancePaused={() =>
                    setAutoForwardPaused((current) => !current)
                  }
                />

                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {!readyForNextCard ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        checkTypedReadingAnswer();
                      }}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
                    >
                      Check
                    </button>
                  ) : autoForwardPaused ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        goNext();
                      }}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
                    >
                      Next
                    </button>
                  ) : null}

                  {typedFeedback && !typedFeedback.ok ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setTypedInput("");
                        setTypedFeedback(null);
                        setInputResetKey((current) => current + 1);
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Try Again
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Row label="Word" value={card.surface} visible big placeholder="---" />
                <Row
                  label={mode === "READING_MC" ? "Meaning" : "Reading"}
                  value={mode === "READING_MC" ? card.meaning : card.reading}
                  visible
                  placeholder="---"
                />
                <MultipleChoiceAnswerPanel
                  answerPrompt={mode === "READING_MC" ? "Choose the Reading" : "Choose the Meaning"}
                  options={mode === "READING_MC" ? readingOptions : meaningOptions}
                  selected={selected}
                  answered={answered}
                  wasCorrect={wasCorrect}
                  correctAnswerText={mode === "READING_MC" ? card.reading : card.meaning}
                  correctionInput={correctionInput}
                  correctionFeedback={correctionFeedback}
                  correctionInputRef={correctionInputRef}
                  correctionPlaceholder={mode === "READING_MC" ? "Type the reading" : "Type the meaning"}
                  correctionTitle={
                    mode === "READING_MC"
                      ? "Type the reading to continue."
                      : "Type one word from the correct answer to continue."
                  }
                  correctionHelpText={
                    mode === "READING_MC"
                      ? readingInputExample(card.reading)
                      : undefined
                  }
                  correctionAnswerDisplay={mode === "READING_MC" ? card.reading : undefined}
                  isOptionCorrect={(option) =>
                    isReadingAnswerMode(mode)
                      ? readingAnswersMatch(option, card.reading)
                      : normalizeMeaning(option) === normalizeMeaning(card.meaning)
                  }
                  onSelectOption={handleAnswer}
                  onCorrectionInputChange={(value) => {
                    setCorrectionInput(value);
                    setCorrectionFeedback(null);
                    setCorrectionAccepted(false);
                  }}
                  onCorrectionInputKeyDown={handleCorrectionInputEnter}
                  onCorrectionInputCompositionEnd={handleCorrectionCompositionEnd}
                  onCheckCorrection={checkCorrectionAnswer}
                  correctionFeedbackOk={correctionAccepted}
                  autoAdvancePaused={autoForwardPaused}
                  onToggleAutoAdvancePaused={() =>
                    setAutoForwardPaused((current) => !current)
                  }
                />
              </>
            )}
          </div>
        </StudyFlashcardShell>

        <section className="mt-4 w-full rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold text-slate-500">
              {autoForwardPaused
                ? "Auto-forward paused. Use Next when you are ready."
                : "Auto-forward is on after correct or completed cards."}
            </p>
            <button
              type="button"
              onClick={() => setAutoForwardPaused((current) => !current)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {autoForwardPaused ? "Resume Auto-forward" : "Pause Auto-forward"}
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={goPrevious}
              disabled={sessionIndex === 0}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={markAgain}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Again
            </button>
            <button
              type="button"
              onClick={shuffleDeck}
              className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              Shuffle
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Next
            </button>
          </div>
          <p className="mt-3 text-center text-xs font-medium text-slate-400">
            Previous and Next are manual safeguards only. They do not mark words known or change study progress.
          </p>
        </section>
      </div>
    </main>
  );
}
