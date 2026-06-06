import type { ReactNode } from "react";

type KanjiStudyFeedbackCard = {
  sourceWord: string;
  sourceReading: string;
  sourceMeaning: string | null;
  bookTitle: string | null;
};

type KanjiStudyRelatedExample = {
  word: string;
  reading: string | null;
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
  relatedExamples?: KanjiStudyRelatedExample[];
  autoAdvancePaused: boolean;
  onToggleAutoAdvancePaused: () => void;
  recallSlot?: ReactNode;
};

export default function KanjiStudyFeedbackPanel({
  checked,
  card,
  showBaseReading,
  baseReading,
  showExample,
  relatedExamples = [],
  autoAdvancePaused,
  onToggleAutoAdvancePaused,
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
            <div className="text-3xl font-semibold text-slate-950">
              {card.sourceWord}
            </div>

            {card.sourceReading ? (
              <div className="mt-2 text-xl font-medium text-slate-600">
                {card.sourceReading}
              </div>
            ) : null}

            {relatedExamples.length > 0 ? (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Same kanji reading
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {relatedExamples.map((example) => (
                    <span
                      key={`${example.word}-${example.reading ?? ""}`}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-base text-slate-700"
                    >
                      <span className="font-semibold text-slate-950">
                        {example.word}
                      </span>
                      {example.reading ? (
                        <span className="ml-1 text-slate-500">
                          {example.reading}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleAutoAdvancePaused();
              }}
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
            >
              {autoAdvancePaused ? "Resume" : "Pause"}
            </button>

            <p className="text-xs text-slate-400">
              {autoAdvancePaused
                ? "Paused. Take your time with this reading."
                : "Next word comes automatically."}
            </p>
          </div>
        </>
      ) : null}

      {recallSlot}
    </div>
  );
}
