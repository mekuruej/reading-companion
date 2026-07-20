import type { KeyboardEvent, RefObject } from "react";

type AbilityCheckTypingMode = "reading_typing" | "meaning_typing";

type AbilityCheckTypingPromptProps = {
  mode: AbilityCheckTypingMode;
  surface: string;
  reading: string;
  promptClassName: string;
  typingInput: string;
  checked: { ok: boolean; correct: string } | null;
  instructionText: string | null;
  canSendBackToSupport: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onTypingInputChange: (value: string) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCheckAnswer: () => void;
  onSendBackToSupport: () => void;
};

export default function AbilityCheckTypingPrompt({
  mode,
  surface,
  reading,
  promptClassName,
  typingInput,
  checked,
  instructionText,
  canSendBackToSupport,
  inputRef,
  onTypingInputChange,
  onInputKeyDown,
  onCheckAnswer,
  onSendBackToSupport,
}: AbilityCheckTypingPromptProps) {
  const isReadingMode = mode === "reading_typing";

  return (
    <>
      <div className={promptClassName}>
        {isReadingMode ? "READING" : "MEANING"}
      </div>

      <div className="text-5xl font-bold">{surface}</div>

      {!isReadingMode ? (
        <div className="text-lg text-slate-500">{reading}</div>
      ) : null}

      <div className="w-full max-w-sm">
        {isReadingMode ? (
          <p className="mb-2 text-center text-xs text-gray-500">
            <span className="inline sm:whitespace-nowrap">Kana is best; </span>
            <span className="inline sm:whitespace-nowrap">
              Hepburn romaji also works
            </span>
          </p>
        ) : null}

        <input
          ref={inputRef}
          value={typingInput}
          onChange={(event) => onTypingInputChange(event.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={
            isReadingMode ? "Type kana or Hepburn romaji" : "Type the meaning"
          }
          inputMode="text"
          autoCorrect="off"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded border px-4 py-3 text-base"
          disabled={!!checked && (checked.ok || !isReadingMode)}
        />

        {instructionText ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-center text-sm font-semibold text-stone-700">
            {instructionText}
          </div>
        ) : null}

        {!checked ? (
          <div className="mt-3 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onCheckAnswer}
              className="rounded bg-gray-700 px-4 py-2 text-white"
            >
              Check
            </button>

            {canSendBackToSupport ? (
              <button
                type="button"
                onClick={onSendBackToSupport}
                className="rounded border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Send back to Red support
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
