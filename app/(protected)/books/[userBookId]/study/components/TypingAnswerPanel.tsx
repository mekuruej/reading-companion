import type { KeyboardEvent, RefObject } from "react";

type TypedFeedback = {
  ok: boolean;
  message: string;
};

type TypingAnswerPanelProps = {
  answerLabel: string;
  showReadingHint: boolean;
  inputKey: string;
  typedInput: string;
  typedFeedback: TypedFeedback | null;
  readyForNextCard: boolean;
  placeholder: string;
  feedbackHelpText: string | null;
  typedInputRef: RefObject<HTMLInputElement | null>;
  onTypedInputChange: (value: string) => void;
  onTypedInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  autoAdvancePaused?: boolean;
  onToggleAutoAdvancePaused?: () => void;
};

export default function TypingAnswerPanel({
  answerLabel,
  showReadingHint,
  inputKey,
  typedInput,
  typedFeedback,
  readyForNextCard,
  placeholder,
  feedbackHelpText,
  typedInputRef,
  onTypedInputChange,
  onTypedInputKeyDown,
  autoAdvancePaused = false,
  onToggleAutoAdvancePaused,
}: TypingAnswerPanelProps) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
        Type {answerLabel}
      </div>

      {showReadingHint ? (
        <p className="mb-2 text-xs text-gray-500">
          <span className="inline sm:whitespace-nowrap">Kana is best; </span>
          <span className="inline sm:whitespace-nowrap">Hepburn romaji also works</span>
        </p>
      ) : null}

      <div className="flex gap-2">
        <input
          ref={typedInputRef}
          key={inputKey}
          type="text"
          value={typedInput}
          onChange={(event) => onTypedInputChange(event.target.value)}
          onKeyDown={onTypedInputKeyDown}
          inputMode="text"
          autoCorrect="off"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          className="w-full rounded border p-2"
          placeholder={readyForNextCard ? "Press Enter for next card" : placeholder}
        />
      </div>

      {typedFeedback ? (
        <div
          className={`mt-2 text-sm ${
            typedFeedback.ok ? "text-green-700" : "text-red-700"
          }`}
        >
          <p>
            {typedFeedback.ok ? "✅ " : "❌ "}
            {typedFeedback.message}
          </p>

          {readyForNextCard && onToggleAutoAdvancePaused ? (
            <div className="mt-2 flex flex-col items-center gap-1.5 text-slate-500">
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

          {!typedFeedback.ok && feedbackHelpText ? (
            <p className="mt-1 text-xs text-slate-500">{feedbackHelpText}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
