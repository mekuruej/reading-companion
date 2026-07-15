import BookVocabActionsCell from "./BookVocabActionsCell";
import BookVocabKatakanaBadge from "./BookVocabKatakanaBadge";
import BookVocabPageCell from "./BookVocabPageCell";

type BookVocabRowProps = {
  hidden: boolean;
  surface: string | null | undefined;
  reading: string | null | undefined;
  meaning: string | null | undefined;
  pageNumber: number | null | undefined;
  readOnly?: boolean;
  onPageChange?: (value: string) => void | Promise<void>;

  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void | Promise<void>;
  onMoveDown: () => void | Promise<void>;

  onOpen: () => void;
  onDelete: () => void;
};

// Visual row for one saved vocabulary word.
// page.tsx still owns row calculations, reorder behavior, routing,
// and database-changing actions. This component only renders the prepared row.
export default function BookVocabRow({
  hidden,
  surface,
  reading,
  meaning,
  pageNumber,
  readOnly = false,
  onPageChange,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onOpen,
  onDelete,
}: BookVocabRowProps) {
  return (
    <tr className={`border-t ${hidden ? "bg-gray-50 text-gray-400" : ""}`}>
      <td className="w-20 p-2">
        {readOnly ? null : (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => void onMoveUp()}
              disabled={!canMoveUp}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-xs font-black text-stone-700 transition hover:bg-stone-50 disabled:opacity-30"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => void onMoveDown()}
              disabled={!canMoveDown}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-xs font-black text-stone-700 transition hover:bg-stone-50 disabled:opacity-30"
              title="Move down"
            >
              ↓
            </button>
          </div>
        )}
      </td>

      <BookVocabPageCell
        pageNumber={pageNumber}
        readOnly={readOnly}
        onPageChange={onPageChange}
      />

      <td className="w-20 whitespace-nowrap p-2">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-black text-sky-800 transition hover:bg-sky-100"
          title="Open word detail"
        >
          Detail
        </button>
      </td>

      <td className="break-words p-2 text-lg font-semibold text-stone-950">
        <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
          {surface}
          <BookVocabKatakanaBadge surface={surface} />
        </span>
      </td>

      <td className="break-words p-2">{reading ?? "—"}</td>

      <td className="break-words p-2">
        <div>{meaning ?? "—"}</div>
      </td>

      <BookVocabActionsCell onDelete={readOnly ? undefined : onDelete} />
    </tr>
  );
}
