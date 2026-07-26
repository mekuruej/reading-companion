// Foundation Vocabulary
//
"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import MultipleChoiceAnswerPanel from "@/app/(protected)/books/[userBookId]/study/components/MultipleChoiceAnswerPanel";
import Row from "@/app/(protected)/books/[userBookId]/study/components/StudyCardFieldRow";
import StudyFlashcardShell from "@/app/(protected)/books/[userBookId]/study/components/StudyFlashcardShell";
import StudyModePanel from "@/app/(protected)/books/[userBookId]/study/components/StudyModePanel";
import StudyProgressPanel from "@/app/(protected)/books/[userBookId]/study/components/StudyProgressPanel";
import TypingAnswerPanel from "@/app/(protected)/books/[userBookId]/study/components/TypingAnswerPanel";
import { JLPT_N5_FOUNDATION_VOCABULARY } from "@/lib/foundationVocabulary";

type FoundationMode = "COMPLETE" | "READING_MC" | "MEANING_MC" | "TYPING_READING";

const FOUNDATION_MODE_OPTIONS = [
  { value: "COMPLETE", label: "Complete Review" },
  { value: "READING_MC", label: "Reading MC" },
  { value: "MEANING_MC", label: "Meaning MC" },
  { value: "TYPING_READING", label: "Typing Reading" },
];

const AUTO_FORWARD_MS = 1200;

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeKana(value: string) {
  return value.trim().replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function normalizeMeaning(value: string) {
  return value.trim().toLowerCase();
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
  const [typedInput, setTypedInput] = useState("");
  const [typedFeedback, setTypedFeedback] = useState<null | { ok: boolean; message: string }>(null);
  const [readyForNextCard, setReadyForNextCard] = useState(false);
  const [autoForwardPaused, setAutoForwardPaused] = useState(false);
  const [inputResetKey, setInputResetKey] = useState(0);
  const correctionInputRef = useRef<HTMLInputElement | null>(null);
  const typedInputRef = useRef<HTMLInputElement | null>(null);

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

  function resetCardState() {
    setRevealStep(0);
    setAnswered(false);
    setSelected(null);
    setWasCorrect(null);
    setCorrectionInput("");
    setCorrectionFeedback(null);
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
      return;
    }
    goNext();
  }

  function handleAnswer(option: string) {
    if (!card || answered) return;

    const correct =
      mode === "READING_MC"
        ? normalizeKana(option) === normalizeKana(card.reading)
        : normalizeMeaning(option) === normalizeMeaning(card.meaning);

    setSelected(option);
    setAnswered(true);
    setWasCorrect(correct);
  }

  function checkTypedReadingAnswer() {
    if (!card || readyForNextCard) return;

    const input = typedInput.trim();
    if (!input) return;

    const correct = normalizeKana(input) === normalizeKana(card.reading);

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

  function checkCorrectionAnswer() {
    if (!card) return;

    const input = correctionInput.trim();
    if (!input) return;

    const correct =
      mode === "READING_MC"
        ? normalizeKana(input) === normalizeKana(card.reading)
        : card.meaning
            .split(";")
            .map((part) => normalizeMeaning(part))
            .filter(Boolean)
            .some((meaning) => normalizeMeaning(input) === meaning);

    if (!correct) {
      setCorrectionInput("");
      setCorrectionFeedback("Try typing the correct answer once.");
      return;
    }

    setCorrectionFeedback("Good. Moving to the next card...");
    window.setTimeout(goNext, 500);
  }

  useEffect(() => {
    if (mode !== "TYPING_READING") return;
    if (!readyForNextCard) return;
    if (autoForwardPaused) return;

    const timer = window.setTimeout(goNext, AUTO_FORWARD_MS);
    return () => window.clearTimeout(timer);
  }, [mode, readyForNextCard, autoForwardPaused, sessionIndex]);

  if (complete) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
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
            <Link
              href="/library-study/characters"
              className="rounded bg-gray-200 px-4 py-2"
            >
              Foundation Sets
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <div className="mb-4 mt-4 flex w-full flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:mb-8 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
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
          <Link
            href="/library-study/characters"
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Foundation Sets
          </Link>
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

        <StudyFlashcardShell isClickable={mode === "COMPLETE"} onReveal={handleReveal}>
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
                  feedbackHelpText="Try the reading again, or use Next to move on."
                  typedInputRef={typedInputRef}
                  onTypedInputChange={(value) => {
                    setTypedInput(value);
                    if (!readyForNextCard) setTypedFeedback(null);
                  }}
                  onTypedInputKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.stopPropagation();

                      if (readyForNextCard) {
                        goNext();
                        return;
                      }

                      checkTypedReadingAnswer();
                    }
                  }}
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
                  isOptionCorrect={(option) =>
                    mode === "READING_MC"
                      ? normalizeKana(option) === normalizeKana(card.reading)
                      : normalizeMeaning(option) === normalizeMeaning(card.meaning)
                  }
                  onSelectOption={handleAnswer}
                  onCorrectionInputChange={(value) => {
                    setCorrectionInput(value);
                    setCorrectionFeedback(null);
                  }}
                  onCorrectionInputKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.stopPropagation();
                      checkCorrectionAnswer();
                    }
                  }}
                  onCheckCorrection={checkCorrectionAnswer}
                />
              </>
            )}
          </div>
        </StudyFlashcardShell>

        <section className="mt-4 w-full rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-sm">
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
              Known
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
