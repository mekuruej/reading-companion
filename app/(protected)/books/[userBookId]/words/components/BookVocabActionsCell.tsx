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
  const buttonClass = "min-w-16 rounded px-2 py-1.5 text-xs font-medium";

  return (
    <td className="min-w-[9rem] p-2">
      <div className="grid w-max grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={`${buttonClass} bg-gray-200 hover:bg-gray-300`}
          title="Open word card"
        >
          Open
        </button>

        <button
          type="button"
          onClick={onEdit}
          className={`${buttonClass} bg-blue-400 hover:bg-green-500`}
        >
          Edit
        </button>

        {hidden ? (
          <button
            type="button"
            onClick={onUnhide}
            className={`${buttonClass} bg-green-700 text-white hover:bg-green-800`}
          >
            Unhide
          </button>
        ) : (
          <button
            type="button"
            onClick={onHide}
            className={`${buttonClass} bg-amber-600 text-white hover:bg-amber-700`}
          >
            Hide
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className={`${buttonClass} bg-gray-700 text-white hover:bg-red-700`}
        >
          Delete
        </button>
      </div>
    </td>
  );
}
