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

function pageSummary(pageFilter: string) {
  if (pageFilter === "all") return "All pages";
  return `Page ${pageFilter}`;
}

type StudyFilterPanelProps = {
  jlptLevels: readonly string[];
  jlptSelected: string[];
  colorOptions: readonly LibraryStudyColor[];
  colorSelected: LibraryStudyColor[];
  chapterFilter: string;
  chapterOptions: { value: string; label: string }[];
  pageFilter: string;
  pageOptions: number[];
  repeatsOnly: boolean;
  onToggleJlpt: (level: string) => void;
  onSelectAllJlpt: () => void;
  onClearJlpt: () => void;
  onToggleColor: (color: LibraryStudyColor) => void;
  onSelectAllColors: () => void;
  onClearColors: () => void;
  onChapterFilterChange: (value: string) => void;
  onPageFilterChange: (value: string) => void;
  onRepeatsOnlyChange: (checked: boolean) => void;
};

export default function StudyFilterPanel({
  jlptLevels,
  jlptSelected,
  colorOptions,
  colorSelected,
  chapterFilter,
  chapterOptions,
  pageFilter,
  pageOptions,
  repeatsOnly,
  onToggleJlpt,
  onSelectAllJlpt,
  onClearJlpt,
  onToggleColor,
  onSelectAllColors,
  onClearColors,
  onChapterFilterChange,
  onPageFilterChange,
  onRepeatsOnlyChange,
}: StudyFilterPanelProps) {
  const [locationOpen, setLocationOpen] = useState(false);
  const [difficultyOpen, setDifficultyOpen] = useState(false);

  const locationSummary = [
    chapterSummary(chapterFilter, chapterOptions),
    pageSummary(pageFilter),
  ]
    .filter(Boolean)
    .join(" • ");
  const difficultySummary = [
    jlptSummary(jlptLevels, jlptSelected),
    colorSummary(colorOptions, colorSelected),
    repeatsOnly ? "Repeats only" : null,
  ].join(" • ");

  return (
    <div className="w-full max-w-3xl space-y-3">
      <section className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Location · Step 1
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-black text-slate-950">
            Choose where the flashcards come from
          </h2>

          <button
            type="button"
            onClick={() => setLocationOpen((current) => !current)}
            className="ml-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100 sm:ml-4"
          >
            {locationOpen ? "Close" : "Change"}
          </button>
        </div>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          {locationSummary}
        </p>

        {locationOpen ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              Choose a chapter or page focus for this book.
            </p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                Book section
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="sr-only">Chapter</span>
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
                </label>

                <label className="block">
                  <span className="sr-only">Page</span>
                  <select
                    value={pageFilter}
                    onChange={(event) => onPageFilterChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">All pages</option>
                    {pageOptions.map((page) => (
                      <option key={page} value={String(page)}>
                        Page {page}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Difficulty · Step 2
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-black text-slate-950">
            Choose the difficulty
          </h2>

          <button
            type="button"
            onClick={() => setDifficultyOpen((current) => !current)}
            className="ml-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100 sm:ml-4"
          >
            {difficultyOpen ? "Close" : "Change"}
          </button>
        </div>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          {difficultySummary}
        </p>

        {difficultyOpen ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              Choose a JLPT level, readiness color, or repeated-word focus.
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
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                Color / readiness
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {colorOptions.map((color) => {
                  const checkedColor = colorSelected.includes(color);

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onToggleColor(color)}
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
                      {colorDropdownLabel(color)}
                    </button>
                  );
                })}

                <div className="ml-0 flex gap-2 sm:ml-2">
                  <button
                    type="button"
                    onClick={onSelectAllColors}
                    className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-300"
                  >
                    All
                  </button>

                  <button
                    type="button"
                    onClick={onClearColors}
                    className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <label
              className="mt-4 flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
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
        ) : null}
      </section>
    </div>
  );
}
