"use client";

import { useState } from "react";

type LibraryPracticeFilterPanelProps = {
  jlptLevels: readonly string[];
  selectedJlptLevels: string[];
  selectedColorFilters: string[];
  multiBookOnly: boolean;
  colorFilterLocked?: boolean;
  lockedColorLabel?: string;
  onToggleJlpt: (level: string) => void;
  onSelectAllJlpt: () => void;
  onClearJlpt: () => void;
  onToggleColorFilter: (value: string) => void;
  onSelectAllColorFilters: () => void;
  onClearColorFilters: () => void;
  onMultiBookOnlyChange: (value: boolean) => void;
};

const PRACTICE_COLOR_OPTIONS = [
  { value: "purple", label: "Purple (Mastered)" },
  { value: "blue", label: "Blue (Meaning)" },
  { value: "green", label: "Green (Reading)" },
  { value: "yellow", label: "Yellow (Ready)" },
  { value: "orange", label: "Orange (Repeating)" },
  { value: "red", label: "Red (New)" },
  { value: "grey", label: "Limbo" },
  { value: "katakana", label: "Katakana only" },
];

function jlptLabel(level: string) {
  if (level === "NON-JLPT") return "Unlabeled";
  return level;
}

function jlptSummary(jlptLevels: readonly string[], selectedJlptLevels: string[]) {
  if (
    selectedJlptLevels.length === 0 ||
    selectedJlptLevels.length === jlptLevels.length
  ) {
    return "All levels";
  }

  const ordered = jlptLevels.filter((level) => selectedJlptLevels.includes(level));

  if (ordered.length <= 3) {
    return ordered.map(jlptLabel).join(" + ");
  }

  return `${ordered.length} levels`;
}

function colorSummary(selectedColorFilters: string[]) {
  if (
    selectedColorFilters.length === 0 ||
    selectedColorFilters.length === PRACTICE_COLOR_OPTIONS.length
  ) {
    return "All colors";
  }

  const ordered = PRACTICE_COLOR_OPTIONS.filter((option) =>
    selectedColorFilters.includes(option.value)
  );

  if (ordered.length <= 3) {
    return ordered.map((option) => option.label).join(" + ");
  }

  return `${ordered.length} colors`;
}

function sourceSummary(multiBookOnly: boolean) {
  return multiBookOnly ? "Seen in multiple books" : "All sources";
}

export default function LibraryPracticeFilterPanel({
  jlptLevels,
  selectedJlptLevels,
  selectedColorFilters,
  multiBookOnly,
  colorFilterLocked = false,
  lockedColorLabel,
  onToggleJlpt,
  onSelectAllJlpt,
  onClearJlpt,
  onToggleColorFilter,
  onSelectAllColorFilters,
  onClearColorFilters,
  onMultiBookOnlyChange,
}: LibraryPracticeFilterPanelProps) {
  const [open, setOpen] = useState(false);

  const filterSummary = [
    jlptSummary(jlptLevels, selectedJlptLevels),
    colorSummary(selectedColorFilters),
    sourceSummary(multiBookOnly),
  ].join(" • ");

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-sm font-black uppercase tracking-wide text-blue-700">
        Filters · Step 1
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black text-slate-950">
          {colorFilterLocked ? "Choose which mastered words to review" : "Choose which saved words to review"}
        </h2>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="ml-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100 sm:ml-4"
        >
          {open ? "Close" : "Change"}
        </button>
      </div>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {filterSummary}
      </p>

      {open ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            {colorFilterLocked
              ? "Choose a JLPT level for this focused mastered-words review."
              : "Choose a JLPT level, color, or readiness group for a focused review."}
          </p>

          <div className="mt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
              JLPT levels
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {jlptLevels.map((level) => {
                const checkedLevel = selectedJlptLevels.includes(level);

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onToggleJlpt(level)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-black shadow-sm transition ${
                      checkedLevel
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                        checkedLevel
                          ? "border-white bg-white text-slate-950"
                          : "border-slate-400 bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    {jlptLabel(level)}
                  </button>
                );
              })}

              <div className="ml-0 flex gap-2 sm:ml-2">
                <button
                  type="button"
                  onClick={onSelectAllJlpt}
                  className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-300"
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={onClearJlpt}
                  className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-300"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {colorFilterLocked ? (
            <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-950">
              Color is locked to {lockedColorLabel ?? colorSummary(selectedColorFilters)} for this Mastered Words review.
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                Color / readiness
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {PRACTICE_COLOR_OPTIONS.map((option) => {
                  const checkedColor = selectedColorFilters.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onToggleColorFilter(option.value)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-black shadow-sm transition ${
                        checkedColor
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                          checkedColor
                            ? "border-white bg-white text-slate-950"
                            : "border-slate-400 bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      {option.label}
                    </button>
                  );
                })}

                <div className="ml-0 flex gap-2 sm:ml-2">
                  <button
                    type="button"
                    onClick={onSelectAllColorFilters}
                    className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-300"
                  >
                    All
                  </button>

                  <button
                    type="button"
                    onClick={onClearColorFilters}
                    className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={multiBookOnly}
                onChange={(event) => onMultiBookOnlyChange(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950"
              />
              <span>
                <span className="block text-sm font-black text-slate-900">
                  Seen in multiple books
                </span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                  Only review words that appear in more than one book in your Library.
                </span>
              </span>
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}
