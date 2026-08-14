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
  canAddExisting: boolean;
  adding: boolean;
  requestLoading: boolean;
  addLabel: string;
  onAdd: () => void;
  onRequestReview: () => void;
};

export default function AddBookCatalogResult({
  result,
  missingFields,
  canAddExisting,
  adding,
  requestLoading,
  addLabel,
  onAdd,
  onRequestReview,
}: AddBookCatalogResultProps) {
  const displayLanguage = bookLanguageLabel(result.language_code);
  const canAddThisExistingBook = canAddExisting;
  const hasMissingDetails = missingFields.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:flex-row">
      {result.cover_url ? (
        <img
          src={result.cover_url}
          alt=""
          className="h-24 w-16 shrink-0 rounded-xl object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-200 px-2 text-center text-[10px] font-bold text-stone-500">
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
          {hasMissingDetails && canAddExisting ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
              Some details missing
            </span>
          ) : canAddExisting ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
              Ready to add
            </span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
              Needs review
            </span>
          )}
        </div>
        {hasMissingDetails && canAddExisting ? (
          <p className="mt-2 text-xs leading-5 text-amber-800">
            Some book details are missing ({missingFields.join(", ")}). You can still add this book.
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:w-40">
        {canAddExisting ? (
          <>
            <button
              type="button"
              onClick={onAdd}
              disabled={adding || !canAddThisExistingBook}
              className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
            >
              {adding ? "Adding..." : addLabel}
            </button>
            {hasMissingDetails ? (
              <button
                type="button"
                onClick={onRequestReview}
                disabled={requestLoading}
                className="rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
              >
                {requestLoading ? "Sending..." : "Request review"}
              </button>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={onRequestReview}
            disabled={requestLoading}
            className="rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
          >
            {requestLoading ? "Sending..." : "Request review"}
          </button>
        )}
      </div>
    </div>
  );
}
