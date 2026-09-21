import type { ProgressTrackingMethod } from "@/lib/books/readingProgress";
import { positionLabel } from "@/lib/vocabulary/wordPosition";
import { KeyboardEvent, useEffect, useState } from "react";

type BookVocabPageCellProps = {
  positionUnit?: ProgressTrackingMethod;
  pageNumber: number | null | undefined;
  readOnly?: boolean;
  onPageChange?: (value: string) => void | Promise<void>;
};

// Visual page-number cell for one vocabulary row.
// page.tsx still owns the word row data and database-changing action.
export default function BookVocabPageCell({
  positionUnit = "page",
  pageNumber,
  readOnly = true,
  onPageChange,
}: BookVocabPageCellProps) {
  const [draft, setDraft] = useState(pageNumber == null ? "" : String(pageNumber));

  useEffect(() => {
    setDraft(pageNumber == null ? "" : String(pageNumber));
  }, [pageNumber]);

  async function commit() {
    const nextValue = draft.trim();
    const currentValue = pageNumber == null ? "" : String(pageNumber);
    if (nextValue === currentValue) return;
    await onPageChange?.(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      setDraft(pageNumber == null ? "" : String(pageNumber));
      event.currentTarget.blur();
    }
  }

  if (readOnly || !onPageChange) {
    return <td className="p-2 text-center text-sm font-semibold text-stone-600">{positionLabel(positionUnit)} {pageNumber ?? "—"}</td>;
  }

  return (
    <td className="p-2 text-center">
      <span className="block text-xs text-stone-500">{positionLabel(positionUnit)}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={handleKeyDown}
        aria-label={positionLabel(positionUnit)}
        placeholder={positionLabel(positionUnit)}
        className="w-20 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-center text-sm font-semibold text-stone-700 shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
      />
    </td>
  );
}
