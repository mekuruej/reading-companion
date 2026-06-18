type KanaStudyHeaderProps = {
  title?: string;
  onOpenLibrary?: () => void;
  onOpenCharacterStudy?: () => void;
};

export function KanaStudyHeader({
  title = "Hiragana & Katakana Study",
  onOpenLibrary,
  onOpenCharacterStudy,
}: KanaStudyHeaderProps) {
  return (
    <div className="mb-4 mt-4 flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4">
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

      {onOpenLibrary || onOpenCharacterStudy ? (
        <div className="flex flex-wrap gap-2 sm:mr-10 sm:justify-end">
          {onOpenCharacterStudy ? (
            <button
              type="button"
              onClick={onOpenCharacterStudy}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Character Study
            </button>
          ) : null}

          {onOpenLibrary ? (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Library
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default KanaStudyHeader;