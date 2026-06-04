import type { KeyboardEvent } from "react";
import KanjiComponentLookup from "@/components/KanjiComponentLookup";

type AddWordHelpPanelProps = {
  isOpen: boolean;
  scratchWord: string;
  pickedKanji: string;
  kanjiLookupResetKey: number;
  onToggleOpen: (open: boolean) => void;
  onScratchWordChange: (value: string) => void;
  onScratchWordKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onUseScratchWord: () => void;
  onClearPickedKanji: () => void;
  onPickKanji: (kanji: string) => void;
};

export default function AddWordHelpPanel({
  isOpen,
  scratchWord,
  pickedKanji,
  kanjiLookupResetKey,
  onToggleOpen,
  onScratchWordChange,
  onScratchWordKeyDown,
  onUseScratchWord,
  onClearPickedKanji,
  onPickKanji,
}: AddWordHelpPanelProps) {
  return (
    <details
      open={isOpen}
      onToggle={(event) =>
        onToggleOpen((event.currentTarget as HTMLDetailsElement).open)
      }
      className="rounded-xl border border-stone-200 bg-white/75 p-3"
    >
      <summary className="cursor-pointer text-sm font-semibold text-stone-800">
        Having trouble? Look up a kanji. Build a word.
      </summary>

      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Build a word
          </label>
          <p className="mt-1 text-xs text-stone-500">
            Try pieces here first. Nothing will search until you use it.
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={scratchWord}
              onChange={(event) => onScratchWordChange(event.target.value)}
              onKeyDown={onScratchWordKeyDown}
              placeholder="Try building the word here..."
              className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
            />

            <button
              type="button"
              disabled={!scratchWord.trim()}
              onClick={onUseScratchWord}
              className="shrink-0 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
            >
              Use this word
            </button>
          </div>
        </div>

        {pickedKanji ? (
          <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-stone-600">
              Last Kanji:{" "}
              <span className="text-2xl font-semibold text-stone-900">
                {pickedKanji}
              </span>
            </div>

            <button
              type="button"
              onClick={onClearPickedKanji}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              Use this kanji
            </button>
          </div>
        ) : null}

        <KanjiComponentLookup
          resetKey={kanjiLookupResetKey}
          onPickKanji={onPickKanji}
        />
      </div>
    </details>
  );
}