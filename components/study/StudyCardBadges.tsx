import { studyCardModeBadgeClass, type StudyCardTarget } from "@/lib/studyCardPresentation";

type StudyCardBadgesProps = {
  modeLabel: string;
  jlpt?: string | null;
  modeTarget?: StudyCardTarget;
  colorDotClassName: string;
  colorName: string;
  showKatakanaBadge: boolean;
  definitionText: string;
  definitionChipClassName: string;
  readChipClassName: string;
  encounterCount: number;
};

export default function StudyCardBadges({
  modeLabel,
  jlpt,
  modeTarget,
  colorDotClassName,
  colorName,
  showKatakanaBadge,
  definitionText,
  definitionChipClassName,
  readChipClassName,
  encounterCount,
}: StudyCardBadgesProps) {
  return (
    <>
      <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4 sm:gap-3">
        <div className={studyCardModeBadgeClass(modeTarget)}>
          {modeLabel}
          {jlpt ? ` · ${jlpt}` : ""}
        </div>

        <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2">
          <div className="rounded-full border border-slate-100 bg-white px-2 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-xs font-semibold text-slate-700 shadow-sm">
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
