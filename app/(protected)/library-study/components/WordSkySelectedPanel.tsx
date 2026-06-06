type WordSkySelectedWord = {
  surface: string;
  reading: string;
  meaning: string;
  jlpt?: string | null;
  encounterCount?: number | null;
};

type WordSkySelectedPanelProps = {
  selectedWord: WordSkySelectedWord;
  selectedKey: string;
  hasClaim: boolean;
  isSaving: boolean;
  greenButtonClassName: string;
  greenLabel: string;
  onSaveGreen: () => void;
  onClearOrClose: () => void;
  onClose: () => void;
};

export default function WordSkySelectedPanel({
  selectedWord,
  hasClaim,
  isSaving,
  greenButtonClassName,
  greenLabel,
  onSaveGreen,
  onClearOrClose,
  onClose,
}: WordSkySelectedPanelProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Selected
          </div>

          <div className="mt-1 text-2xl font-semibold">
            {selectedWord.surface}
          </div>

          <div className="text-sm text-slate-500">
            {selectedWord.reading} · {selectedWord.meaning}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {(selectedWord.jlpt ?? "Non-JLPT").toUpperCase()}
            {selectedWord.encounterCount
              ? ` · ${selectedWord.encounterCount} library encounters`
              : ""}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          aria-label="Close selected word"
        >
          Close
        </button>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={onSaveGreen}
          disabled={isSaving}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition hover:brightness-95 disabled:opacity-60 ${greenButtonClassName}`}
        >
          {greenLabel}
        </button>

        <button
          type="button"
          onClick={onClearOrClose}
          disabled={isSaving}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
        >
          {hasClaim ? "Leave it clear" : "Leave it clear"}
        </button>
      </div>
    </>
  );
}