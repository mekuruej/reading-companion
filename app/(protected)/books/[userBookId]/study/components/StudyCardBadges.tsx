import type { ComponentProps } from "react";
import { studyCardSenseClass } from "@/lib/studyCardPresentation";
import LibraryColorBadge from "@/components/LibraryColorBadge";

type LibraryColorStatus = ComponentProps<typeof LibraryColorBadge>["colorStatus"];

type StudyCardBadgesProps = {
  jlpt: string;
  colorStatus: LibraryColorStatus;
  meaningChoiceIndex: number;
  totalCount: number;
};

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

      <div className={`absolute bottom-3 left-4 ${studyCardSenseClass(meaningChoiceIndex + 1)}`}>
        Definition {meaningChoiceIndex + 1}
      </div>

      <div className="absolute bottom-3 right-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm">
        <div className="text-xs font-medium leading-none">
          Saved {totalCount}x
        </div>
      </div>
    </>
  );
}
