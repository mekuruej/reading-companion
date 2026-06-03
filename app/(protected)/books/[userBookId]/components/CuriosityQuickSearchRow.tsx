import type { KeyboardEvent, RefObject } from "react";
import LibraryColorBadge from "@/components/LibraryColorBadge";
import type { LibraryStudyWordColorInfo } from "@/lib/libraryStudyColorLookup";

type CuriosityQuickSearchRowProps = {
  surface: string;
  reading: string;
  quickLoading: boolean;
  quickPreviewLibraryColorInfo: LibraryStudyWordColorInfo | null;
  quickWordInputRef: RefObject<HTMLInputElement | null>;
  onSurfaceChange: (value: string) => void;
  onSearch: () => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export default function CuriosityQuickSearchRow({
  surface,
  reading,
  quickLoading,
  quickPreviewLibraryColorInfo,
  quickWordInputRef,
  onSurfaceChange,
  onSearch,
  onSearchKeyDown,
}: CuriosityQuickSearchRowProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:items-end">
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Rapid search
        </label>
        <p className="mb-1 text-xs text-stone-500">
          Already know the kanji? Search with a simple Enter tap.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={quickWordInputRef}
            type="text"
            value={surface}
            onChange={(event) => onSurfaceChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search or edit a word..."
            className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />

          <button
            type="button"
            onClick={onSearch}
            disabled={quickLoading || !surface.trim()}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {quickLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {surface.trim() && reading.trim() ? (
        <div className="flex min-h-12 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
          <span>Current library status:</span>
          {quickPreviewLibraryColorInfo ? (
            <LibraryColorBadge
              colorStatus={quickPreviewLibraryColorInfo.colorStatus}
              stageLabel={quickPreviewLibraryColorInfo.stageLabel}
            />
          ) : (
            <LibraryColorBadge color="none" label="Not in library yet" />
          )}
        </div>
      ) : null}
    </div>
  );
}