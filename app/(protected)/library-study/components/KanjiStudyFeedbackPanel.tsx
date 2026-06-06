import type { ReactNode } from "react";

type KanjiStudyFeedbackCard = {
  sourceWord: string;
  sourceReading: string;
  sourceMeaning: string | null;
  bookTitle: string | null;
};

type KanjiStudyFeedbackPanelProps = {
  checked: {
    ok: boolean;
    correct: string;
  };
  card: KanjiStudyFeedbackCard;
  showBaseReading: boolean;
  baseReading: string | null | undefined;
  showExample: boolean;
  recallSlot?: ReactNode;
};

export default function KanjiStudyFeedbackPanel({
  checked,
  card,
  showBaseReading,
  baseReading,
  showExample,
  recallSlot,
}: KanjiStudyFeedbackPanelProps) {
  return (
    <div className="mt-2 w-full max-w-sm text-center text-sm">
      {checked.ok ? (
        <>
          <p className="text-green-700">✅ Correct!</p>

          {showBaseReading && baseReading ? (
            <p className="mt-1 text-gray-600">
              Base reading: {baseReading}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-red-700">❌ Not quite.</p>

          <p className="mt-1 text-gray-600">
            Correct answer: {checked.correct}
          </p>

          {showBaseReading && baseReading ? (
            <p className="mt-1 text-gray-600">
              Base reading: {baseReading}
            </p>
          ) : null}
        </>
      )}

      {showExample ? (
        <>
          <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-center">
            <div className="text-lg font-semibold">
              {card.sourceWord}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              {card.bookTitle ? `Seen in: ${card.bookTitle}` : "Shared kanji bank"}
            </div>

            {card.sourceReading ? (
              <div className="mt-1 text-sm text-slate-500">
                {card.sourceReading}
              </div>
            ) : null}

            {card.sourceMeaning ? (
              <div className="mt-1 text-sm text-slate-700">
                {card.sourceMeaning}
              </div>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Next word comes automatically.
          </p>
        </>
      ) : null}

      {recallSlot}
    </div>
  );
}