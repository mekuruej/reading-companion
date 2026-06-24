import SectionBand from "./SectionBand";

type ComparisonBook = {
  title: string;
  averageMinutesPerPage: number | null;
  pagesRead: number;
};

type ComparisonRow = {
  bookType: string;
  pushed: ComparisonBook | null;
  flowed: ComparisonBook | null;
};

type ReadingAbilityComparisonPanelProps = {
  selectedFilterLabel: string;
  tone: string;
  rows: ComparisonRow[];
  bookTypeLabel: (value: string | null | undefined) => string;
  formatDecimal: (value: number | null, digits?: number) => string;
};

function ComparisonBookCell({
  book,
  formatDecimal,
}: {
  book: ComparisonBook | null;
  formatDecimal: (value: number | null, digits?: number) => string;
}) {
  if (!book) return <>—</>;

  return (
    <div>
      <div className="font-medium text-slate-900">{book.title}</div>
      <div className="text-xs text-slate-500">
        {formatDecimal(book.averageMinutesPerPage)} min/page · {book.pagesRead} pages
      </div>
    </div>
  );
}

export default function ReadingAbilityComparisonPanel({
  selectedFilterLabel,
  tone,
  rows,
  bookTypeLabel,
  formatDecimal,
}: ReadingAbilityComparisonPanelProps) {
  return (
    <SectionBand
      eyebrow={`Comparison — ${selectedFilterLabel}`}
      title="Books that pushed back / books that flowed"
      description="Within each book type, this compares the slowest and fastest timed reading experiences."
      tone={tone}
    >
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          No timed reading comparison yet. Add minutes to reading sessions to see pace.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Book type</th>
                <th className="px-3 py-2">Pushed back</th>
                <th className="px-3 py-2">Flowed</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.bookType}>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {bookTypeLabel(row.bookType)}
                  </td>

                  <td className="px-3 py-2 text-slate-700">
                    <ComparisonBookCell book={row.pushed} formatDecimal={formatDecimal} />
                  </td>

                  <td className="px-3 py-2 text-slate-700">
                    <ComparisonBookCell book={row.flowed} formatDecimal={formatDecimal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionBand>
  );
}