import type { ReactNode } from "react";

type KanjiStudyCardFrameProps = {
  flaggedForReview: boolean;
  kanji: string;
  showReadingTypeBadge: boolean;
  readingTypeText?: string;
  strokeCount?: number | null;
  radical?: string | null;
  radicalName?: string | null;
  radicalEnglishName?: string | null;
  isJouyou?: boolean | null;
  schoolGrade?: number | null;
  onCardClick: () => void;
  children: ReactNode;
};

function readingTypeBadgeClassName(readingTypeText: string | undefined, flaggedForReview: boolean) {
  const base = "absolute z-10 rounded-full border px-3 py-1.5 text-sm font-black";
  const position = flaggedForReview ? "left-4 top-14" : "left-4 top-3";
  const tone = (readingTypeText ?? "").toLowerCase();

  if (tone === "onyomi") {
    return `${base} ${position} border-slate-950 bg-slate-950 text-white`;
  }

  if (tone === "kunyomi") {
    return `${base} ${position} border-slate-950 bg-white text-slate-950`;
  }

  return `${base} ${position} border-slate-200 bg-slate-100 text-slate-600`;
}

export default function KanjiStudyCardFrame({
  flaggedForReview,
  kanji,
  showReadingTypeBadge,
  readingTypeText,
  strokeCount,
  radical,
  radicalName,
  radicalEnglishName,
  isJouyou,
  schoolGrade,
  onCardClick,
  children,
}: KanjiStudyCardFrameProps) {
  const showKanjiMeta = strokeCount != null || radical || radicalName || radicalEnglishName || isJouyou != null || schoolGrade != null;
  const radicalNames = [radicalName, radicalEnglishName].filter(Boolean).join(" / ");
  const jouyouLabel = isJouyou == null ? "" : isJouyou ? "Jouyou" : "Not Jouyou";
  const gradeLabel = schoolGrade == null ? "" : schoolGrade === 8 ? "Junior High" : schoolGrade === 9 ? "High School" : `Grade ${schoolGrade}`;

  return (
    <div
      className={`relative mt-6 flex min-h-[24rem] w-full max-w-3xl select-none items-center justify-center rounded-2xl border bg-white p-8 text-center shadow-2xl sm:min-h-[28rem] ${
        flaggedForReview ? "border-red-400 bg-red-50/30" : "border-slate-500"
      }`}
      onClick={onCardClick}
    >
      {flaggedForReview ? (
        <div className="absolute left-4 top-3 z-10 rounded-full bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700">
          Review Carefully
        </div>
      ) : null}

      {showReadingTypeBadge && readingTypeText ? (
        <div
          className={
            readingTypeBadgeClassName(readingTypeText, flaggedForReview)
          }
        >
          {readingTypeText}
        </div>
      ) : null}

      {showKanjiMeta ? (
        <div className="absolute right-4 top-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
          <div className="flex flex-col items-end leading-none">
            <div className="text-sm font-medium">
              {kanji}{strokeCount != null ? ` · ${strokeCount} strokes` : ""}
            </div>

            <div className="mt-1 text-[10px] text-slate-400">
              {radical ? `radical: ${radical}` : ""}
              {radicalNames ? ` (${radicalNames})` : ""}
              {jouyouLabel ? ` · ${jouyouLabel}` : ""}
              {gradeLabel ? ` · ${gradeLabel}` : ""}
            </div>
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}
