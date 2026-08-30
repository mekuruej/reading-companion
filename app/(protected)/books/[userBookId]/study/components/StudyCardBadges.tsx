import type { ComponentProps } from "react";
import LibraryColorBadge from "@/components/LibraryColorBadge";

type LibraryColorStatus = ComponentProps<typeof LibraryColorBadge>["colorStatus"];

type StudyCardBadgesProps = {
  jlpt: string;
  colorStatus: LibraryColorStatus;
  meaningChoiceIndex: number;
  totalCount: number;
};

function getDefinitionLabel(index: number) {
  return index === 0 ? "Primary definition" : `Definition ${index + 1}`;
}

function definitionChipClassName(
  meaningChoiceIndex: number,
  colorStatus: LibraryColorStatus
) {
  const base =
    "rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm sm:px-3 sm:py-1.5 sm:text-xs";
  const pulseClass = meaningChoiceIndex > 0 ? " animate-pulse" : "";
  const color = colorStatus?.color;

  if (color === "yellow") {
    return `${base} border-yellow-300 bg-yellow-100 text-yellow-950${pulseClass}`;
  }

  if (color === "blue") {
    return `${base} border-sky-300 bg-sky-100 text-sky-950${pulseClass}`;
  }

  if (color === "purple") {
    return `${base} border-violet-300 bg-violet-100 text-violet-950${pulseClass}`;
  }

  if (color === "red") {
    return `${base} border-red-300 bg-red-100 text-red-950${pulseClass}`;
  }

  if (color === "orange") {
    return `${base} border-orange-300 bg-orange-100 text-orange-950${pulseClass}`;
  }

  if (color === "grey") {
    return `${base} border-slate-300 bg-slate-100 text-slate-700${pulseClass}`;
  }

  return `${base} border-emerald-300 bg-emerald-100 text-emerald-950${pulseClass}`;
}

export default function StudyCardBadges({
  jlpt,
  colorStatus,
  meaningChoiceIndex,
  totalCount,
}: StudyCardBadgesProps) {
  return (
    <>
      <div className="absolute left-4 top-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
        <div className="text-xs font-medium leading-none">
          {jlpt || "NON-JLPT"}
        </div>
      </div>

      <div className="absolute right-4 top-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
        <LibraryColorBadge colorStatus={colorStatus} size="sm" />
      </div>

      <div className={`absolute bottom-3 left-4 ${definitionChipClassName(meaningChoiceIndex, colorStatus)}`}>
        {getDefinitionLabel(meaningChoiceIndex)}
      </div>

      <div className="absolute bottom-3 right-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
        <div className="text-xs font-medium leading-none">
          Saved {totalCount}x
        </div>
      </div>
    </>
  );
}
