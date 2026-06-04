"use client";

import KanjiComponentLookup from "@/components/KanjiComponentLookup";

type Props = {
  isOpen: boolean;
  scratchWord: string;
  pickedKanji: string;
  resetKey: number;
  onToggleOpen: (open: boolean) => void;
  onScratchWordChange: (value: string) => void;
  onUseScratchWord: () => void;
  onClearPickedKanji: () => void;
  onPickKanji: (kanji: string) => void;
};

export default function GlobalWordHelpPanel({
  isOpen,
  scratchWord,
  pickedKanji,
  resetKey,
  onToggleOpen,
  onScratchWordChange,
  onUseScratchWord,
  onClearPickedKanji,
  onPickKanji,
}: Props) {
  return (
    <details
      open={isOpen}
      onToggle={(event) => onToggleOpen((event.currentTarget as HTMLDetailsElement).open)}
      className="rounded-xl border border-stone-200 bg-white/75 p-3"
    >
      <summary className="cursor-pointer text-sm font-semibold text-stone-800">
        Having trouble? Look up a kanji. Build a word.
      </summary>

      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Build a word or name
          </label>
          <p className="mt-1 text-xs text-stone-500">
            Try pieces here first. Nothing will save until the global flow is wired.
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={scratchWord}
              onChange={(event) => onScratchWordChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              placeholder="Try building the entry here..."
              className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
            />
            <button
              type="button"
              disabled={!scratchWord.trim()}
              onClick={onUseScratchWord}
              className="shrink-0 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
            >
              Use this entry
            </button>
          </div>
        </div>

        {pickedKanji ? (
          <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-stone-600">
              Last Kanji:{" "}
              <span className="text-2xl font-semibold text-stone-900">{pickedKanji}</span>
            </div>
            <button
              type="button"
              onClick={onClearPickedKanji}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              Clear selection
            </button>
          </div>
        ) : null}

        <KanjiComponentLookup
          resetKey={resetKey}
          onPickKanji={(kanji) => {
            onPickKanji(kanji);
          }}
        />
      </div>
    </details>
  );
}
