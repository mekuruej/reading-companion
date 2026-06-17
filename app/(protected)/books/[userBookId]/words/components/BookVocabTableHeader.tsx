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
          className="sticky z-20 w-10 bg-gray-50 p-2"
          style={headerStickyStyle}
          title="Move words up or down within the same chapter/page"
        >
          ↕
        </th>

        <th
          className="sticky z-20 w-5 bg-gray-50 p-2 text-center"
          style={headerStickyStyle}
          title="How many times this word appears in this book (same word + same definition)"
        >
          <span className="block leading-tight">
            <span className="block">Book</span>
            <span className="block">Repeats</span>
          </span>
        </th>

        <th
          className="sticky z-20 w-5 bg-gray-50 p-2 text-center"
          style={headerStickyStyle}
          title="Library Study color from encounters across saved books"
        >
          <span className="block leading-tight">
            <span className="block">Library</span>
            <span className="block">Stage</span>
          </span>
        </th>

        <th
          className="sticky z-20 w-20 bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Word
        </th>
        <th
          className="sticky z-20 w-30 bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Reading
        </th>
        <th
          className="sticky z-20 w-60 bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Meaning
        </th>
        <th
          className="sticky z-20 w-10 bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Def #
        </th>
        <th
          className="sticky z-20 w-5 bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Chapter
        </th>
        <th
          className="sticky z-20 w-10 bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Page
        </th>
        <th
          className="sticky z-20 w-36 bg-gray-50 p-2"
          style={headerStickyStyle}
        >
          Actions
        </th>
      </tr>
    </thead>
  );
}
