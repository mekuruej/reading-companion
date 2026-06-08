"use client";

import KanjiComponentLookup from "@/components/KanjiComponentLookup";

type Props = {
  isOpen: boolean;
  scratchWord: string;
  resetKey: number;
  onToggleOpen: (open: boolean) => void;
  onScratchWordChange: (value: string) => void;
  onUseScratchWord: () => void;
  onPickKanji: (kanji: string) => void;
};

export default function GlobalWordHelpPanel({
  isOpen,
  scratchWord,
  resetKey,
  onToggleOpen,
  onScratchWordChange,
  onUseScratchWord,
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
