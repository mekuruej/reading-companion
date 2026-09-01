import { displayBookTitle } from "@/lib/books/bookIdentity";
import type { ReactNode } from "react";

type LibraryBookRowBook = {
  title: string;
  language_code?: string | null;
  cover_url: string | null;
};

type LibraryBookRowData = {
  id: string;
  isTeachingOnly?: boolean;
  books: LibraryBookRowBook | null;
};

type LibraryBookRowProps = {
  row: LibraryBookRowData;
  status: string;
  onOpen: () => void;
  secondaryActionHref?: string | null;
  secondaryActionLabel?: string;
  teachingControls?: ReactNode;
};

export default function LibraryBookRow({
  row,
  status,
  onOpen,
  secondaryActionHref = null,
  secondaryActionLabel = "Open",
  teachingControls = null,
}: LibraryBookRowProps) {
  const book = row.books;
  if (!book) return null;
  const displayTitle = displayBookTitle(book);

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
          {displayTitle}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span>{status}</span>
          {row.isTeachingOnly ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-sky-700">
              Teaching Only
            </span>
          ) : null}
        </div>
        {teachingControls}
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
