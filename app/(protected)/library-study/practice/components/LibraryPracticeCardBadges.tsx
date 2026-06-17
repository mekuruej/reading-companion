type LibraryPracticeCardBadgesProps = {
  modeLabel: string;
  jlpt: string | null;
  colorDotClassName: string;
  colorName: string;
  showKatakanaBadge: boolean;
  definitionText: string;
  definitionChipClassName: string;
  readChipClassName: string;
  encounterCount: number;
};

export default function LibraryPracticeCardBadges({
  modeLabel,
  jlpt,
  colorDotClassName,
  colorName,
  showKatakanaBadge,
  definitionText,
  definitionChipClassName,
  readChipClassName,
  encounterCount,
}: LibraryPracticeCardBadgesProps) {
  return (
    <>
      <div className="absolute left-4 top-4 flex">
        <div className="rounded-full border border-sky-100 bg-white/90 px-5 py-2 text-sm font-semibold text-sky-950 shadow-sm">
          {modeLabel}
          {jlpt ? ` · ${jlpt}` : ""}
        </div>
      </div>

      <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
        <div className="rounded-full border border-slate-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
          <span
            className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${colorDotClassName}`}
          />
          {colorName}
        </div>

        {showKatakanaBadge ? (
          <span
            title="Katakana-only word"
            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
          >
            カ
          </span>
        ) : null}
      </div>

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
        {definitionText ? (
          <div className={definitionChipClassName}>
            {definitionText}
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-4 right-4 flex flex-wrap justify-end gap-2">
        <div className={readChipClassName}>
          Saved {encounterCount}x
        </div>
      </div>
    </>
  );
}
