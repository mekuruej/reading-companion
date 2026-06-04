import LibraryColorBadge from "@/components/LibraryColorBadge";
import type { LibraryStudyWordColorInfo } from "@/lib/libraryStudyColorLookup";

type AddWordRecentSessionWord = {
  id: string;
  surface: string;
  reading: string;
  meaning: string;
  pageNumber: string | number | null;
  chapterNumber: string | number | null;
  chapterName: string | null;
};

type AddWordRecentSessionWordCardProps = {
  word: AddWordRecentSessionWord;
  colorInfo: LibraryStudyWordColorInfo | null;
  className?: string;
  showLocation?: boolean;
  showLibraryBadge?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export default function AddWordRecentSessionWordCard({
  word,
  colorInfo,
  className = "rounded-lg border bg-white p-3",
  showLocation = true,
  showLibraryBadge = true,
  onEdit,
  onDelete,
}: AddWordRecentSessionWordCardProps) {
  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-stone-900">{word.surface}</div>

            {showLibraryBadge && colorInfo ? (
              <LibraryColorBadge
                colorStatus={colorInfo.colorStatus}
                stageLabel={colorInfo.stageLabel}
              />
            ) : null}
          </div>

          <div className="text-stone-500">{word.reading || "—"}</div>
          <div className="mt-1 text-stone-700">{word.meaning || "—"}</div>

          {showLocation ? (
            <div className="mt-1 text-xs text-stone-500">
              Page {word.pageNumber || "—"} · Ch {word.chapterNumber || "—"} ·{" "}
              {word.chapterName || "—"}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}