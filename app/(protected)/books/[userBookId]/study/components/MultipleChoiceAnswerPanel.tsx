import type { CompositionEvent, KeyboardEvent, RefObject } from "react";

type MultipleChoiceAnswerPanelProps = {
  answerPrompt: string;
  options: string[];
  selected: string | null;
  answered: boolean;
  wasCorrect: boolean | null;
  correctAnswerText: string;
  correctionInput?: string;
  correctionFeedback?: string | null;
  correctionInputRef?: RefObject<HTMLInputElement | null>;
  correctionPlaceholder?: string;
  correctionTitle?: string;
  correctionHelpText?: string;
  correctionAnswerDisplay?: string;
  correctionFeedbackOk?: boolean;
  isOptionCorrect: (option: string) => boolean;
  onSelectOption: (option: string) => void;
  onCorrectionInputChange?: (value: string) => void;
  onCorrectionInputKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCorrectionInputCompositionEnd?: (event: CompositionEvent<HTMLInputElement>) => void;
  onCheckCorrection?: () => void;
  autoAdvancePaused?: boolean;
  onToggleAutoAdvancePaused?: () => void;
};

function containsJapanese(value: string) {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value);
}

export default function MultipleChoiceAnswerPanel({
  answerPrompt,
  options,
  selected,
  answered,
  wasCorrect,
  correctAnswerText,
  isOptionCorrect,
  onSelectOption,
  autoAdvancePaused = false,
  onToggleAutoAdvancePaused,
}: MultipleChoiceAnswerPanelProps) {
  return (
    <div className="w-full max-w-md pt-2">
      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
        {answerPrompt}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((option, index) => {
          const isSelected = selected === option;
          const isCorrect = answered && isOptionCorrect(option);
          const isWrongSelected = answered && isSelected && !isCorrect;
          const hasJapanese = containsJapanese(option);

          return (
            <button
              key={option}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectOption(option);
              }}
              disabled={answered}
              className={[
                "rounded-xl border px-3 py-3 font-medium leading-tight transition",
                hasJapanese ? "text-2xl sm:text-3xl" : "text-sm sm:text-base",
                isCorrect
                  ? "border-green-600 bg-green-50 text-green-800"
                  : isWrongSelected
                    ? "border-red-600 bg-red-50 text-red-800"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                answered ? "cursor-default" : "",
              ].join(" ")}
            >
              <span className="mr-2 align-middle text-sm font-semibold text-slate-500">
                {index + 1}.
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="mt-3 w-full">
          <p className={`text-sm ${wasCorrect ? "text-green-700" : "text-red-700"}`}>
            {wasCorrect
              ? "✅ You got it!"
              : `❌ Not quite. Correct answer: ${correctAnswerText}`}
          </p>

          {onToggleAutoAdvancePaused ? (
            <div className="mt-2 flex flex-col items-center gap-1.5">
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
                {autoAdvancePaused ? "Paused. Take your time with this card." : "Next card comes automatically."}
              </p>
            </div>
          ) : null}

        </div>
      ) : null}
    </div>
  );
}
