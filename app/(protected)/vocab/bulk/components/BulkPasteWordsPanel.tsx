import type { FormEvent } from "react";

type BulkPasteWordsPanelProps = {
  rawInput: string;
  wordCount: number;
  isPreviewing: boolean;
  onRawInputChange: (value: string) => void;
  onPreview: (event: FormEvent<HTMLFormElement>) => void;
};

export default function BulkPasteWordsPanel({
  rawInput,
  wordCount,
  isPreviewing,
  onRawInputChange,
  onPreview,
}: BulkPasteWordsPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 text-lg font-medium">Step 1 — Paste Words</div>
      <p className="mb-3 text-sm text-gray-500">
        Paste one word per line or comma-separated, then preview them.
      </p>

      <form onSubmit={onPreview} className="flex flex-col gap-3">
        <textarea
          value={rawInput}
          onChange={(e) => onRawInputChange(e.target.value)}
          rows={8}
          className="rounded border bg-white p-3 font-mono text-sm"
          placeholder={`Paste one per line (or comma-separated)\n\n生意気\nメンヘラ\n都市伝説`}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={isPreviewing}
            className="rounded bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {isPreviewing ? "Loading…" : `Preview Words${wordCount ? ` (${wordCount})` : ""}`}
          </button>
        </div>
      </form>
    </div>
  );
}