type BookVocabActionsCellProps = {
  onDelete: () => void;
};

// Action buttons for one vocabulary row.
// page.tsx keeps the routing and database-changing handlers;
// this component only renders the buttons and calls the callbacks it receives.
export default function BookVocabActionsCell({
  onDelete,
}: BookVocabActionsCellProps) {
  return (
    <td className="w-28 whitespace-nowrap p-2 text-right">
      <button
        type="button"
        onClick={onDelete}
        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        title="Delete word"
      >
        Delete
      </button>
    </td>
  );
}
