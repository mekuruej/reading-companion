import type { CSSProperties } from "react";

type BookVocabTableHeaderProps = {
  headerStickyStyle: CSSProperties;
};

// Static table header for the book vocabulary list.
// page.tsx still owns the row rendering, reorder behavior, and word actions.
export default function BookVocabTableHeader({
  headerStickyStyle,
}: BookVocabTableHeaderProps) {
  return (
    <thead className="bg-gray-50">
      <tr className="text-left">
        <th
          className="sticky z-20 w-20 bg-gray-50 p-2 text-center"
          style={headerStickyStyle}
          title="Move words up or down within the same chapter/page"
        >
          Order
        </th>
        <th
          className="sticky z-20 w-16 bg-gray-50 p-2 text-center"
          style={headerStickyStyle}
          title="Words can be reordered within the same page"
        >
          Page
        </th>

        <th
          className="sticky z-20 w-[21%] bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Word
        </th>
        <th
          className="sticky z-20 w-[21%] bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Reading
        </th>
        <th
          className="sticky z-20 w-[42%] bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Definition
        </th>
        <th
          className="sticky z-20 w-28 bg-gray-50 p-2 text-right"
          style={headerStickyStyle}
        >
          Word Detail
        </th>
      </tr>
    </thead>
  );
}
