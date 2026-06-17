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

      <div className="absolute bottom-3 left-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
        <div className="text-xs font-medium leading-none">
          {getDefinitionLabel(meaningChoiceIndex)}
        </div>
      </div>

      <div className="absolute bottom-3 right-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
        <div className="text-xs font-medium leading-none">
          Saved {totalCount}x
        </div>
      </div>
    </>
  );
}
