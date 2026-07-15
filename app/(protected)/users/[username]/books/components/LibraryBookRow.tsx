type LibraryBookRowBook = {
  title: string;
  cover_url: string | null;
};

type LibraryBookRowData = {
  id: string;
  books: LibraryBookRowBook | null;
};

type LibraryBookRowProps = {
  row: LibraryBookRowData;
  status: string;
  onOpen: () => void;
  secondaryActionHref?: string | null;
  secondaryActionLabel?: string;
};

export default function LibraryBookRow({
  row,
  status,
  onOpen,
  secondaryActionHref = null,
  secondaryActionLabel = "Open",
}: LibraryBookRowProps) {
  const book = row.books;
  if (!book) return null;

  return (
    <li
      className="cursor-pointer flex items-center gap-4 border-b px-3 py-3 hover:bg-stone-50"
      onClick={onOpen}
    >
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt=""
          className="h-16 w-11 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="h-16 w-11 shrink-0 rounded bg-gray-200" />
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-stone-900">
          {book.title}
        </div>
        <div className="mt-1 text-xs text-stone-500">{status}</div>
      </div>

      {secondaryActionHref ? (
        <a
          href={secondaryActionHref}
          onClick={(event) => event.stopPropagation()}
          className="shrink-0 rounded-full border border-amber-600 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
        >
          {secondaryActionLabel}
        </a>
      ) : null}
    </li>
  );
}
