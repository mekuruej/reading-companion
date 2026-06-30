import type { KeyboardEvent, RefObject } from "react";

type MultipleChoiceAnswerPanelProps = {
  answerPrompt: string;
  options: string[];
  selected: string | null;
  answered: boolean;
  wasCorrect: boolean | null;
  correctAnswerText: string;
  correctionInput: string;
  correctionFeedback: string | null;
  correctionInputRef: RefObject<HTMLInputElement | null>;
  correctionPlaceholder: string;
  isOptionCorrect: (option: string) => boolean;
  onSelectOption: (option: string) => void;
  onCorrectionInputChange: (value: string) => void;
  onCorrectionInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCheckCorrection: () => void;
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
  correctionInput,
  correctionFeedback,
  correctionInputRef,
  correctionPlaceholder,
  isOptionCorrect,
  onSelectOption,
  onCorrectionInputChange,
  onCorrectionInputKeyDown,
  onCheckCorrection,
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

          {!wasCorrect ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-500">
                Type one word from the answer to continue.
              </p>

              <div className="flex gap-2">
                <input
                  ref={correctionInputRef}
                  type="text"
                  value={correctionInput}
                  onChange={(event) => onCorrectionInputChange(event.target.value)}
                  onKeyDown={onCorrectionInputKeyDown}
                  autoCorrect="off"
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder={correctionPlaceholder}
                />

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCheckCorrection();
                  }}
                  className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-gray-300"
                >
                  Check
                </button>
              </div>

              {correctionFeedback ? (
                <p className="text-xs text-red-700">{correctionFeedback}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
