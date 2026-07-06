type BookVocabPageCellProps = {
  pageNumber: number | null | undefined;
};

// Visual page-number cell for one vocabulary row.
// page.tsx still owns the word row data; this component only renders the page fallback.
export default function BookVocabPageCell({
  pageNumber,
}: BookVocabPageCellProps) {
  return <td className="p-2 text-center text-sm font-semibold text-stone-600">{pageNumber ?? "—"}</td>;
}