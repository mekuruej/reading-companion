"use client";

import { useState } from "react";
import type { LibraryStudyColor } from "@/lib/libraryStudyColor";

function colorLabel(color: LibraryStudyColor) {
  if (color === "grey") return "Limbo";
  if (color === "none") return "Not ready";
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function colorDropdownLabel(color: LibraryStudyColor) {
  if (color === "purple") return "Purple (Mastered)";
  if (color === "blue") return "Blue (Meaning)";
  if (color === "green") return "Green (Reading)";
  if (color === "yellow") return "Yellow (Ready)";
  if (color === "orange") return "Orange (Repeating)";
  if (color === "red") return "Red (New)";
  if (color === "grey") return "Limbo";
  if (color === "none") return "Not ready";

  return colorLabel(color);
}

function jlptLabel(level: string) {
  if (level === "NON-JLPT") return "Unlabeled";
  return level;
}

function jlptSummary(jlptLevels: readonly string[], jlptSelected: string[]) {
  if (jlptSelected.length === 0 || jlptSelected.length === jlptLevels.length) {
    return "All levels";
  }

  const ordered = jlptLevels.filter((level) => jlptSelected.includes(level));

  if (ordered.length <= 3) {
    return ordered.map(jlptLabel).join(" + ");
  }

  return `${ordered.length} levels`;
}

function colorSummary(
  colorOptions: readonly LibraryStudyColor[],
  colorSelected: LibraryStudyColor[]
) {
  if (colorSelected.length === 0 || colorSelected.length === colorOptions.length) {
    return "All colors";
  }

  const ordered = colorOptions.filter((color) => colorSelected.includes(color));

  if (ordered.length === 1) {
    return colorDropdownLabel(ordered[0]);
  }

  if (ordered.length <= 3) {
    return ordered.map(colorLabel).join(" + ");
  }

  return `${ordered.length} colors`;
}

function chapterSummary(
  chapterFilter: string,
  chapterOptions: { value: string; label: string }[]
) {
  if (chapterFilter === "all") return "All chapters";

  return (
    chapterOptions.find((chapter) => chapter.value === chapterFilter)?.label ??
    "Selected chapter"
  );
}

type StudyFilterPanelProps = {
  jlptLevels: readonly string[];
  jlptSelected: string[];
  colorOptions: readonly LibraryStudyColor[];
  colorSelected: LibraryStudyColor[];
  chapterFilter: string;
  chapterOptions: { value: string; label: string }[];
  repeatsOnly: boolean;
  onToggleJlpt: (level: string) => void;
  onSelectAllJlpt: () => void;
  onClearJlpt: () => void;
  onToggleColor: (color: LibraryStudyColor) => void;
  onSelectAllColors: () => void;
  onClearColors: () => void;
  onChapterFilterChange: (value: string) => void;
  onRepeatsOnlyChange: (checked: boolean) => void;
};

export default function StudyFilterPanel({
  jlptLevels,
  jlptSelected,
  colorOptions,
  colorSelected,
  chapterFilter,
  chapterOptions,
  repeatsOnly,
  onToggleJlpt,
  onSelectAllJlpt,
  onClearJlpt,
  onToggleColor,
  onSelectAllColors,
  onClearColors,
  onChapterFilterChange,
  onRepeatsOnlyChange,
}: StudyFilterPanelProps) {
  const [open, setOpen] = useState(false);

  const selectedColorValue =
    colorSelected.length === 0 || colorSelected.length === colorOptions.length
      ? "all"
      : colorSelected.length === 1
        ? colorSelected[0]
        : "mixed";

  const filterSummary = [
    jlptSummary(jlptLevels, jlptSelected),
    colorSummary(colorOptions, colorSelected),
    chapterSummary(chapterFilter, chapterOptions),
    repeatsOnly ? "Repeats only" : null,
  ]
    .filter(Boolean)
    .join(" • ");

  function handleColorDropdownChange(value: string) {
    if (value === "mixed") return;

    if (value === "all") {
      onSelectAllColors();
      return;
    }

    onClearColors();
    onToggleColor(value as LibraryStudyColor);
  }

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        Filters · Step 1
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black text-slate-950">
          Choose which words to study
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
            Choose a JLPT level, color, or book section for a focused review.
          </p>

          <div className="mt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
              JLPT levels
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {jlptLevels.map((level) => {
                const checkedLevel = jlptSelected.includes(level);

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

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Color / readiness
              </span>

              <select
                value={selectedColorValue}
                onChange={(event) => handleColorDropdownChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All colors</option>

                {selectedColorValue === "mixed" ? (
                  <option value="mixed">Multiple colors</option>
                ) : null}

                {colorOptions.map((color) => (
                  <option key={color} value={color}>
                    {colorDropdownLabel(color)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
              Book section
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={chapterFilter}
                onChange={(event) => onChapterFilterChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Chapters</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.value} value={chapter.value}>
                    {chapter.label}
                  </option>
                ))}
              </select>

              <label
                className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                title="Show only words that appear 2+ times in this book"
              >
                <input
                  type="checkbox"
                  checked={repeatsOnly}
                  onChange={(event) => onRepeatsOnlyChange(event.target.checked)}
                />
                Repeats only
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}