type BookVocabActionsCellProps = {
  onOpen: () => void;
};

// Action buttons for one vocabulary row.
// page.tsx keeps the routing and database-changing handlers;
// this component only renders the buttons and calls the callbacks it receives.
export default function BookVocabActionsCell({
  onOpen,
}: BookVocabActionsCellProps) {
  return (
    <td className="w-28 whitespace-nowrap p-2 text-right">
      <button
        type="button"
        onClick={onOpen}
        className="rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-stone-700"
        title="Open word card"
      >
        Open
      </button>
    </td>
  );
}
