"use client";

import { useState } from "react";

type ChapterOption = {
  value: string;
  label: string;
};

type BookVocabCsvExportPanelProps = {
  chapterOptions: ChapterOption[];
  wordCount: number;
  onExportCsv: (chapterValue: string, jlptValue: string) => void;
};

export default function BookVocabCsvExportPanel({
  chapterOptions,
  wordCount,
  onExportCsv,
}: BookVocabCsvExportPanelProps) {
  const [exportChapter, setExportChapter] = useState("all");
  const [exportJlpt, setExportJlpt] = useState("all");

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-stone-900">Export vocabulary</h2>
          <p className="text-xs text-stone-600">
            Choose a chapter, JLPT level, or export all saved words. CSV files can be opened in spreadsheet apps.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-72 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="vocab-csv-chapter">
            Chapter to export
          </label>

          <select
            id="vocab-csv-chapter"
            value={exportChapter}
            onChange={(event) => setExportChapter(event.target.value)}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="all">All chapters</option>
            {chapterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="vocab-csv-jlpt">
            JLPT level to export
          </label>

          <select
            id="vocab-csv-jlpt"
            value={exportJlpt}
            onChange={(event) => setExportJlpt(event.target.value)}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="all">All JLPT</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
            <option value="NON-JLPT">Non-JLPT</option>
          </select>

          <button
            type="button"
            disabled={wordCount === 0}
            onClick={() => onExportCsv(exportChapter, exportJlpt)}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            Download CSV
          </button>
        </div>
      </div>
    </section>
  );
}
