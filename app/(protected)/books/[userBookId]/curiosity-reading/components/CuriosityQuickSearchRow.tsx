import { useId, type KeyboardEvent, type RefObject } from "react";
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
  const inputId = useId();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="max-w-56 shrink-0">
        <label htmlFor={inputId} className="block text-sm font-medium text-stone-700">
          Rapid search
        </label>
        <p id={`${inputId}-hint`} className="text-xs leading-4 text-stone-500">
          <span className="block">Already know the kanji?</span>
          <span className="block">Search with a simple Enter tap.</span>
        </p>

      </div>
        <div className="flex min-w-0 flex-[1_1_17rem] items-center gap-2">
          <input
            id={inputId}
            aria-describedby={`${inputId}-hint`}
            ref={quickWordInputRef}
            type="text"
            value={surface}
            onChange={(event) => onSurfaceChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search or edit a word..."
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />

          <button
            type="button"
            onClick={onSearch}
            disabled={quickLoading || !surface.trim()}
            className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {quickLoading ? "Searching..." : "Search"}
          </button>
        </div>

      {surface.trim() && reading.trim() ? (
        <div className="flex min-h-10 shrink-0 items-center gap-2 text-xs text-stone-500">
          <span className="sr-only">Current library status:</span>
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