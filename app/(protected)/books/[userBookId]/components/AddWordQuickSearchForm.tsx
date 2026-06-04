import type { RefObject } from "react";

type AddWordQuickSearchFormProps = {
  word: string;
  lookupLoading: boolean;
  wordInputRef: RefObject<HTMLInputElement | null>;
  onWordChange: (value: string) => void;
  onSubmitLookup: () => void;
};

export default function AddWordQuickSearchForm({
  word,
  lookupLoading,
  wordInputRef,
  onWordChange,
  onSubmitLookup,
}: AddWordQuickSearchFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmitLookup();
      }}
      className="space-y-1"
    >
      <label className="block text-sm font-medium text-stone-700">
        Rapid search
      </label>

      <p className="text-xs text-stone-500">
        Already know the kanji? Search with a simple Enter tap.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={wordInputRef}
          value={word}
          onChange={(event) => onWordChange(event.target.value)}
          placeholder="Search or edit a word..."
          className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
        />

        <button
          type="submit"
          disabled={lookupLoading || !word.trim()}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {lookupLoading ? "Searching..." : "Search"}
        </button>
      </div>
    </form>
  );
}