type ReadAlongCurrentPageSummaryProps = {
  currentPageLabel: string;
  wordCount: number;
  hasCurrentPage: boolean;
};

// Sticky reader-header summary for the current page or section.
// page.tsx still owns currentPage/page calculation; this component only
// renders the label, saved-word count, and helper text.
export default function ReadAlongCurrentPageSummary({
  currentPageLabel,
  wordCount,
  hasCurrentPage,
}: ReadAlongCurrentPageSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3 sm:items-center sm:text-left">
      <div className="order-2 text-sm text-stone-500 sm:order-1">
        {hasCurrentPage
          ? `${wordCount} ready word${wordCount === 1 ? "" : "s"}`
          : "No ready words yet"}
      </div>

      <div className="order-1 text-xl font-bold text-stone-900 sm:order-2 sm:text-center">
        {hasCurrentPage ? currentPageLabel : "Fluid Reading"}
      </div>

      <div className="order-3 text-sm text-stone-500 sm:text-right">
        Tap words as you see them in your book.
      </div>
    </div>
  );
}
