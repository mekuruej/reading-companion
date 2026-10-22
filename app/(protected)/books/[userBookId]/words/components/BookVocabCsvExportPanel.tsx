"use client";

type ChapterOption = {
  value: string;
  label: string;
};

type BookVocabCsvExportPanelProps = {
  chapterOptions: ChapterOption[];
  wordCount: number;
  exportChapter: string;
  exportJlpt: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onExportChapterChange: (chapterValue: string) => void;
  onExportJlptChange: (jlptValue: string) => void;
  onExportCsv: () => void;
};

export default function BookVocabCsvExportPanel({
  chapterOptions,
  wordCount,
  exportChapter,
  exportJlpt,
  expanded,
  onExpandedChange,
  onExportChapterChange,
  onExportJlptChange,
  onExportCsv,
}: BookVocabCsvExportPanelProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-900">Export vocabulary</h2>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="vocab-export-options"
          onClick={() => onExpandedChange(!expanded)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          {expanded ? "Hide options" : "Options"}
        </button>
      </div>

      {expanded ? (
        <div id="vocab-export-options" className="mt-3 border-t border-stone-100 pt-3">
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
            Choose which words you&apos;d like to export.
          </p>
          <p
            aria-live="polite"
            className={
              wordCount === 0
                ? "mt-2 text-xs text-stone-500"
                : "mt-2 inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-stone-800"
            }
          >
            {wordCount === 0
              ? "No words match these filters."
              : `${wordCount} ${wordCount === 1 ? "word" : "words"} available to export.`}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
            <label className="sr-only" htmlFor="vocab-csv-chapter">
              Chapter to export
            </label>

            <select
              id="vocab-csv-chapter"
              value={exportChapter}
              onChange={(event) => onExportChapterChange(event.target.value)}
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
              onChange={(event) => onExportJlptChange(event.target.value)}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="all">All Words</option>
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
              onClick={onExportCsv}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              Download CSV
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
