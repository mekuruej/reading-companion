import type { ReactNode } from "react";

type ChapterDisplayParts = {
  num?: ReactNode;
  name?: ReactNode;
  fallback: ReactNode;
};

type BookVocabChapterCellProps = {
  chapter: ChapterDisplayParts;
};

// Visual chapter cell for one vocabulary row.
// page.tsx still owns chapter parsing/normalization through chapterDisplayParts;
// this component only renders the prepared chapter display.
export default function BookVocabChapterCell({
  chapter,
}: BookVocabChapterCellProps) {
  return (
    <td className="p-2">
      {chapter.num && chapter.name ? (
        <span className="leading-tight">
          <span className="block">{chapter.num}</span>
          <span className="block text-gray-600">{chapter.name}</span>
        </span>
      ) : (
        chapter.fallback
      )}
    </td>
  );
}