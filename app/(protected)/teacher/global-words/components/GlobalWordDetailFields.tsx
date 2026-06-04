"use client";

import type { RefObject } from "react";

export const GLOBAL_WORD_TYPES = [
  "vocabulary",
  "person",
  "place",
  "work title",
  "organization",
  "cultural reference",
  "other",
] as const;

type GlobalWordType = (typeof GLOBAL_WORD_TYPES)[number];

type Props = {
  fieldsRef: RefObject<HTMLDivElement | null>;
  surface: string;
  reading: string;
  meaningNote: string;
  entryType: GlobalWordType;
  jlpt: string;
  isCommon: boolean;
  onReadingChange: (value: string) => void;
  onMeaningNoteChange: (value: string) => void;
  onEntryTypeChange: (value: GlobalWordType) => void;
  onJlptChange: (value: string) => void;
  onIsCommonChange: (checked: boolean) => void;
  onPlaceholderSave: () => void;
  onClear: () => void;
};

export type { GlobalWordType };

export default function GlobalWordDetailFields({
  fieldsRef,
  surface,
  reading,
  meaningNote,
  entryType,
  jlpt,
  isCommon,
  onReadingChange,
  onMeaningNoteChange,
  onEntryTypeChange,
  onJlptChange,
  onIsCommonChange,
  onPlaceholderSave,
  onClear,
}: Props) {
  return (
    <div ref={fieldsRef} className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
        <span className="font-semibold text-stone-900">Preparation only:</span>{" "}
        Fill this out now; global save will be connected in the next implementation pass.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Reading
          </label>
          <input
            value={reading}
            onChange={(event) => onReadingChange(event.target.value)}
            placeholder="Reading"
            className="w-full rounded border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Type
          </label>
          <select
            value={entryType}
            onChange={(event) => onEntryTypeChange(event.target.value as GlobalWordType)}
            className="w-full rounded border bg-white px-3 py-2 text-sm"
          >
            {GLOBAL_WORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          Meaning / note
        </label>
        <textarea
          value={meaningNote}
          onChange={(event) => onMeaningNoteChange(event.target.value)}
          placeholder="Type a meaning, cultural note, or preparation note..."
          className="min-h-[96px] w-full rounded border bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Optional JLPT
          </label>
          <select
            value={jlpt}
            onChange={(event) => onJlptChange(event.target.value)}
            className="w-full rounded border bg-white px-3 py-2 text-sm"
          >
            <option value="NON-JLPT">NON-JLPT</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={isCommon}
            onChange={(event) => onIsCommonChange(event.target.checked)}
          />
          <span>Common / high-priority candidate</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPlaceholderSave}
          disabled={!surface.trim()}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          Prepare Global Entry
        </button>

        <button
          type="button"
          disabled
          className="rounded-xl border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-500"
          title="Global save is not wired yet."
        >
          Save Globally
        </button>

        <button
          type="button"
          onClick={onClear}
          className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
        >
          Clear Fields
        </button>
      </div>
    </div>
  );
}
