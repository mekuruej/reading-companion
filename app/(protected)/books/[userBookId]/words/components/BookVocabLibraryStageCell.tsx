import type { ComponentProps } from "react";

// Use the same import paths that page.tsx currently uses for these two components.
import LibraryColorBadge from "PASTE_EXISTING_LIBRARY_COLOR_BADGE_IMPORT_PATH";
import LibraryStudyStatusBadge from "PASTE_EXISTING_LIBRARY_STUDY_STATUS_BADGE_IMPORT_PATH";

type LibraryColorBadgeProps = ComponentProps<typeof LibraryColorBadge>;
type LibraryStudyStatusBadgeProps = ComponentProps<typeof LibraryStudyStatusBadge>;

type SharedColorInfo = {
  colorStatus: LibraryColorBadgeProps["colorStatus"];
  stageLabel: LibraryColorBadgeProps["stageLabel"];
};

type BookVocabLibraryStageCellProps = {
  sharedColorInfo: SharedColorInfo | null;
  status: LibraryStudyStatusBadgeProps["status"];
  showBadgeNumbers: boolean;
  encounterCount: number;
};

// Visual Library Study stage cell for one vocabulary row.
// page.tsx still owns the encounter/progress lookups and status calculation;
// this component only chooses which badge display to show.
export default function BookVocabLibraryStageCell({
  sharedColorInfo,
  status,
  showBadgeNumbers,
  encounterCount,
}: BookVocabLibraryStageCellProps) {
  return (
    <td className="p-2 text-center text-xs text-gray-600 align-middle">
      <span className="mx-auto flex justify-center">
        {sharedColorInfo ? (
          <LibraryColorBadge
            colorStatus={sharedColorInfo.colorStatus}
            stageLabel={sharedColorInfo.stageLabel}
            size="md"
            dotOnly
          />
        ) : (
          <LibraryStudyStatusBadge
            status={status}
            showNumbers={showBadgeNumbers}
            encounterCount={encounterCount}
          />
        )}
      </span>
    </td>
  );
}