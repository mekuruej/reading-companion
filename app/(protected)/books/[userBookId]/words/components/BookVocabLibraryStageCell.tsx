import type { ComponentProps, ReactNode } from "react";

import LibraryColorBadge from "@/components/LibraryColorBadge";

type LibraryColorBadgeProps = ComponentProps<typeof LibraryColorBadge>;

type SharedColorInfo = {
  colorStatus: LibraryColorBadgeProps["colorStatus"];
  stageLabel: LibraryColorBadgeProps["stageLabel"];
};

type BookVocabLibraryStageCellProps = {
  sharedColorInfo: SharedColorInfo | null;
  fallbackBadge: ReactNode;
};

// Visual Library Study stage cell for one vocabulary row.
// page.tsx still owns the encounter/progress lookups, fallback status calculation,
// and the local fallback badge helper. This component only renders the table cell
// and chooses between the shared LibraryColorBadge display or the provided fallback badge.
export default function BookVocabLibraryStageCell({
  sharedColorInfo,
  fallbackBadge,
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
          fallbackBadge
        )}
      </span>
    </td>
  );
}