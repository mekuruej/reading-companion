import type { ComponentProps, DragEvent } from "react";

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

  isDragging: boolean;
  isDropTarget: boolean;

  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLTableRowElement>) => void;
  onDrop: (event: DragEvent<HTMLTableRowElement>) => void | Promise<void>;
  onDragEnd: () => void;

  onOpen: () => void;
  onEdit: () => void;
  onHide: () => void;
  onUnhide: () => void;
  onDelete: () => void;
};

// Visual row for one saved vocabulary word.
// page.tsx still owns row calculations, drag/drop behavior, routing,
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
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onOpen,
  onEdit,
  onHide,
  onUnhide,
  onDelete,
}: BookVocabRowProps) {
  return (
    <tr
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`border-t ${hidden ? "bg-gray-50 text-gray-400" : ""} ${
        isDropTarget ? "bg-blue-50" : ""
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <td
        className="cursor-grab select-none p-2 text-center text-gray-400"
        title="Drag to reorder within this page"
      >
        ☰
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