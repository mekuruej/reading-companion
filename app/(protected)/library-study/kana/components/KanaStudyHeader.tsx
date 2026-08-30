type KanaStudyHeaderProps = {
  title?: string;
  onBackToFoundationSets?: () => void;
};

export function KanaStudyHeader({
  title = "Hiragana & Katakana Study",
  onBackToFoundationSets,
}: KanaStudyHeaderProps) {
  return (
    <div className="w-full max-w-3xl">
      {onBackToFoundationSets ? (
        <button
          type="button"
          onClick={onBackToFoundationSets}
          className="mb-2 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Foundation Sets
        </button>
      ) : null}

      <div className="mb-4 flex w-full flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-4 rounded-xl text-left">
          <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-[2.6rem] font-bold leading-none text-stone-900 shadow-sm">
            あ
          </div>

          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Character study
            </p>

            <h1 className="truncate text-base font-semibold text-stone-900">
              {title}
            </h1>

            <p className="mt-1 text-sm font-medium text-stone-500">
              Practice kana recognition, matching, and reading.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KanaStudyHeader;
