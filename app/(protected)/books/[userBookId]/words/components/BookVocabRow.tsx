import type { ComponentProps } from "react";

import BookVocabActionsCell from "./BookVocabActionsCell";
import BookVocabChapterCell from "./BookVocabChapterCell";
import BookVocabKatakanaBadge from "./BookVocabKatakanaBadge";
import BookVocabLibraryStageCell from "./BookVocabLibraryStageCell";
import BookVocabLibraryStudyStatusBadge from "./BookVocabLibraryStudyStatusBadge";
import BookVocabPageCell from "./BookVocabPageCell";
import BookVocabRepeatCountCell from "./BookVocabRepeatCountCell";

type ChapterDisplayParts = ComponentProps<typeof BookVocabChapterCell>["chapter"];
type SharedColorInfo = ComponentProps<
  typeof BookVocabLibraryStageCell
>["sharedColorInfo"];
type LibraryStudyStatus = ComponentProps<
  typeof BookVocabLibraryStudyStatusBadge
>["status"];

type BookVocabRowProps = {
  hidden: boolean;
  surface: string | null | undefined;
  reading: string | null | undefined;
  meaning: string | null | undefined;
  meaningChoiceIndex: number | null | undefined;
  pageNumber: number | null | undefined;

  repeatCount: number;
  chapter: ChapterDisplayParts;

  sharedColorInfo: SharedColorInfo | null;
  status: LibraryStudyStatus;
  showBadgeNumbers: boolean;
  encounterCount: number;

  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void | Promise<void>;
  onMoveDown: () => void | Promise<void>;

  onOpen: () => void;
  onEdit: () => void;
  onHide: () => void;
  onUnhide: () => void;
  onDelete: () => void;
};

// Visual row for one saved vocabulary word.
// page.tsx still owns row calculations, reorder behavior, routing,
// and database-changing actions. This component only renders the prepared row.
export default function BookVocabRow({
  hidden,
  surface,
  reading,
  meaning,
  meaningChoiceIndex,
  pageNumber,
  repeatCount,
  chapter,
  sharedColorInfo,
  status,
  showBadgeNumbers,
  encounterCount,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onOpen,
  onEdit,
  onHide,
  onUnhide,
  onDelete,
}: BookVocabRowProps) {
  return (
    <tr className={`border-t ${hidden ? "bg-gray-50 text-gray-400" : ""}`}>
      <td className="p-2">
        <div className="flex items-center justify-center gap-1">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-stone-200 bg-stone-50 text-sm font-black leading-none text-stone-500"
            title="Reading order"
          >
            ☰
          </span>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => void onMoveUp()}
              disabled={!canMoveUp}
              className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-30"
            >
              Up
            </button>
            <button
              type="button"
              onClick={() => void onMoveDown()}
              disabled={!canMoveDown}
              className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-30"
            >
              Down
            </button>
          </div>
        </div>
      </td>

      <BookVocabRepeatCountCell repeatCount={repeatCount} />

      <BookVocabLibraryStageCell
        sharedColorInfo={sharedColorInfo}
        fallbackBadge={
          <BookVocabLibraryStudyStatusBadge
            status={status}
            showNumbers={showBadgeNumbers}
            encounterCount={encounterCount}
          />
        }
      />

      <td className="p-2 font-medium">
        <span className="inline-flex items-center gap-2">
          {surface}
          <BookVocabKatakanaBadge surface={surface} />
        </span>
      </td>

      <td className="p-2">{reading ?? "—"}</td>

      <td className="p-2">
        <div>{meaning ?? "—"}</div>
      </td>

      <td className="p-2 text-center">
        {meaningChoiceIndex != null ? meaningChoiceIndex + 1 : meaning ? "O" : "—"}
      </td>

      <BookVocabChapterCell chapter={chapter} />
      <BookVocabPageCell pageNumber={pageNumber} />

      <BookVocabActionsCell
        hidden={hidden}
        onOpen={onOpen}
        onEdit={onEdit}
        onHide={onHide}
        onUnhide={onUnhide}
        onDelete={onDelete}
      />
    </tr>
  );
}
