import { bookTypeLabel } from "@/lib/books/bookTypes";
import { bookLanguageLabel } from "@/lib/books/bookLanguage";

type CatalogBookResult = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
  isbn13: string | null;
  asin: string | null;
  language_code?: string | null;
};

type AddBookCatalogResultProps = {
  result: CatalogBookResult;
  missingFields: string[];
  adding: boolean;
  requestLoading: boolean;
  addLabel: string;
  onAdd: () => void;
  onRequestReview: () => void;
};

export default function AddBookCatalogResult({
  result,
  missingFields,
  adding,
  requestLoading,
  addLabel,
  onAdd,
  onRequestReview,
}: AddBookCatalogResultProps) {
  const displayLanguage = bookLanguageLabel(result.language_code);
  const hasMissingDetails = missingFields.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row">
      {result.cover_url ? (
        <img
          src={result.cover_url}
          alt=""
          className="h-28 w-[74px] shrink-0 rounded-xl object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-28 w-[74px] shrink-0 items-center justify-center rounded-xl bg-stone-100 px-2 text-center text-[10px] font-bold text-stone-500">
          No cover
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="text-base font-black text-stone-900">
          {result.title || "Untitled book"}
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          {result.author || "Author not listed"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          {result.book_type ? (
            <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-stone-600">
              {bookTypeLabel(result.book_type)}
            </span>
          ) : null}
          {result.isbn13 ? (
            <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-stone-600">
              ISBN {result.isbn13}
            </span>
          ) : null}
          {result.asin ? (
            <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-stone-600">
              ASIN {result.asin}
            </span>
          ) : null}
          {displayLanguage ? (
            <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-stone-600">
              {displayLanguage}
            </span>
          ) : null}
          {hasMissingDetails ? (
            <span className="rounded-full border border-stone-200 bg-stone-100 px-2 py-1 text-stone-700">
              Some details missing
            </span>
          ) : (
            <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-stone-500">
              Ready to add
            </span>
          )}
        </div>
        {hasMissingDetails ? (
          <p className="mt-2 text-xs leading-5 text-stone-600">
            Some details are missing. You can still add this book.
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:w-40">
        <button
          type="button"
          onClick={onAdd}
          disabled={adding}
          className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
        >
          {adding ? "Adding..." : addLabel}
        </button>
        {hasMissingDetails ? (
          <button
            type="button"
            onClick={onRequestReview}
            disabled={requestLoading}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
          >
            {requestLoading ? "Sending..." : "Check details"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
