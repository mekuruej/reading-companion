type ReaderFitTableRow = {
  id: string;
  rating_difficulty: number | null;
  rating_overall: number | null;
  books: {
    title: string | null;
    book_type: string | null;
  } | null;
};

export default function ReaderFitTable({
  rows,
  bookTypeLabel,
  formatRating,
}: {
  rows: ReaderFitTableRow[];
  bookTypeLabel: (value: string | null | undefined) => string;
  formatRating: (value: number | null | undefined) => string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Book</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Difficulty</th>
            <th className="px-3 py-2">Entertainment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>
                No difficulty or reader-fit data in this window yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 font-medium text-slate-900">
                  {row.books?.title ?? "Untitled book"}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {bookTypeLabel(row.books?.book_type)}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {formatRating(row.rating_difficulty)}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {formatRating(row.rating_overall)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}