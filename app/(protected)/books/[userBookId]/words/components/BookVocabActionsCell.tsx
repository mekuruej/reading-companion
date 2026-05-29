type BookVocabActionsCellProps = {
  hidden: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onHide: () => void;
  onUnhide: () => void;
  onDelete: () => void;
};

// Action buttons for one vocabulary row.
// page.tsx keeps the routing and database-changing handlers;
// this component only renders the buttons and calls the callbacks it receives.
export default function BookVocabActionsCell({
  hidden,
  onOpen,
  onEdit,
  onHide,
  onUnhide,
  onDelete,
}: BookVocabActionsCellProps) {
  return (
    <td className="p-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
          title="Open word card"
        >
          Open
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="rounded bg-blue-400 px-2 py-1 text-xs hover:bg-green-500"
        >
          Edit
        </button>

        {hidden ? (
          <button
            type="button"
            onClick={onUnhide}
            className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-800"
          >
            Unhide
          </button>
        ) : (
          <button
            type="button"
            onClick={onHide}
            className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700"
          >
            Hide
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </td>
  );
}