"use client";

import { useState } from "react";

export const KANJI_LEVEL_FILTER_VALUES = [
  "N5",
  "N4",
  "N3",
  "N2",
  "N1",
  "unlabeled",
] as const;

export type KanjiLevelFilter = (typeof KANJI_LEVEL_FILTER_VALUES)[number];

type KanjiStudyFilterPanelProps = {
  selectedLevels: KanjiLevelFilter[];
  onToggleLevel: (level: KanjiLevelFilter) => void;
  onSelectAll: () => void;
  onClear: () => void;
};

function levelLabel(level: KanjiLevelFilter) {
  if (level === "unlabeled") return "Unlabeled";
  return level;
}

function levelSummary(selectedLevels: KanjiLevelFilter[]) {
  if (
    selectedLevels.length === 0 ||
    selectedLevels.length === KANJI_LEVEL_FILTER_VALUES.length
  ) {
    return "All levels";
  }

  const ordered = KANJI_LEVEL_FILTER_VALUES.filter((level) =>
    selectedLevels.includes(level)
  );

  if (ordered.length <= 3) {
    return ordered.map(levelLabel).join(" + ");
  }

  return `${ordered.length} levels`;
}

export default function KanjiStudyFilterPanel({
  selectedLevels,
  onToggleLevel,
  onSelectAll,
  onClear,
}: KanjiStudyFilterPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        Filters · Step 1
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black text-slate-950">
          Choose which kanji to study
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
        {levelSummary(selectedLevels)}
      </p>

      {open ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            Pick one level for a focused set, or combine levels for a bigger review.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            This study set is still growing. Some levels may have fewer cards for now.
          </p>

          <div className="mt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
              Kanji levels
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {KANJI_LEVEL_FILTER_VALUES.map((level) => {
                const checkedLevel = selectedLevels.includes(level);

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onToggleLevel(level)}
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
                    {levelLabel(level)}
                  </button>
                );
              })}

              <div className="ml-0 flex gap-2 sm:ml-2">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-300"
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-300"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}