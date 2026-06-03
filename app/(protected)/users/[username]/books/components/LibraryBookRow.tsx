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
};

export default function LibraryBookRow({
  row,
  status,
  onOpen,
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
    </li>
  );
}