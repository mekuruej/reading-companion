import type { CSSProperties, ReactNode } from "react";

import BookVocabTableHeader from "./BookVocabTableHeader";

type BookVocabTableShellProps = {
  headerStickyStyle: CSSProperties;
  readOnly?: boolean;
  children: ReactNode;
};

// Layout shell for the book vocabulary table.
// The parent page still owns the word rows, drag/drop behavior, color calculations,
// and action callbacks; this component only owns the table wrapper and header.
export default function BookVocabTableShell({
  headerStickyStyle,
  readOnly = false,
  children,
}: BookVocabTableShellProps) {
  return (
    <div className="relative overflow-x-auto overflow-y-visible rounded border bg-white">
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
        <BookVocabTableHeader headerStickyStyle={headerStickyStyle} readOnly={readOnly} />

        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
