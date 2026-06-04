"use client";

import type { RefObject } from "react";

type Props = {
  surface: string;
  lookupLoading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onSurfaceChange: (value: string) => void;
  onLookup: () => void;
};

export default function GlobalWordQuickSearchForm({
  surface,
  lookupLoading,
  inputRef,
  onSurfaceChange,
  onLookup,
}: Props) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!surface.trim() || lookupLoading) return;
        onLookup();
      }}
      className="space-y-1"
    >
      <label className="block text-sm font-medium text-stone-700">
        Rapid search
      </label>
      <p className="text-xs text-stone-500">
        Use this as a preparation field for the next global lookup pass.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          value={surface}
          onChange={(event) => onSurfaceChange(event.target.value)}
          placeholder="Search or prepare a word, name, or reference..."
          className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
        />

        <button
          type="submit"
          disabled={lookupLoading || !surface.trim()}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {lookupLoading ? "Searching..." : "Preview Lookup"}
        </button>
      </div>
    </form>
  );
}
