import type { ComponentType } from "react";

type BookDetails = {
  title_reading?: string | null;
  book_type?: string | null;
  published_date?: string | null;
  page_count?: number | string | null;
  series_number?: number | string | null;
  isbn?: string | null;
  isbn13?: string | null;
};

type Option = {
  value: string;
  label: string;
};

type BookInfoDetailsSectionProps = {
  book: BookDetails;
  canEditBookInfo: boolean;
  isEditingBookInfo: boolean;
  saving: boolean;
  onEditBookInfo: () => void;
  onCancel: () => void;
  onSave: () => void;

  titleReading: string;
  setTitleReading: (value: string) => void;
  bookType: string;
  setBookType: (value: string) => void;
  publishedDate: string;
  setPublishedDate: (value: string) => void;
  pageCount: string;
  setPageCount: (value: string) => void;
  seriesNumber: string;
  setSeriesNumber: (value: string) => void;
  isbn: string;
  setIsbn: (value: string) => void;
  isbn13: string;
  setIsbn13: (value: string) => void;
  coverUrl: string;
  setCoverUrl: (value: string) => void;

  bookTypeLabel: (value: string | null | undefined) => string;
  BOOK_TYPE_OPTIONS: readonly Option[];

  Detail: ComponentType<{
    label: string;
    value: any;
    editing: boolean;
    inputValue: string;
    setInputValue: (v: string) => void;
    placeholder?: string;
  }>;
};

export default function BookInfoDetailsSection({
  book,
  canEditBookInfo,
  isEditingBookInfo,
  saving,
  onEditBookInfo,
  onCancel,
  onSave,
  titleReading,
  setTitleReading,
  bookType,
  setBookType,
  publishedDate,
  setPublishedDate,
  pageCount,
  setPageCount,
  seriesNumber,
  setSeriesNumber,
  isbn,
  setIsbn,
  isbn13,
  setIsbn13,
  coverUrl,
  setCoverUrl,
  bookTypeLabel,
  BOOK_TYPE_OPTIONS,
  Detail,
}: BookInfoDetailsSectionProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span>These book details are managed by the site.</span>
          </div>
          <div className="mt-2 text-sm font-semibold text-stone-900">
            Book Info
          </div>
        </div>
        {!isEditingBookInfo ? (
          canEditBookInfo ? (
            <button
              type="button"
              onClick={onEditBookInfo}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100"
            >
              Edit
            </button>
          ) : null
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Detail
          label="Title Reading"
          value={book.title_reading}
          editing={isEditingBookInfo}
          inputValue={titleReading}
          setInputValue={setTitleReading}
          placeholder="かな reading for the title"
        />

        <div className="rounded border bg-white p-3 text-sm">
          <div className="text-stone-600">Book Type</div>
          {!isEditingBookInfo ? (
            <div className="font-medium">{bookTypeLabel(book.book_type)}</div>
          ) : (
            <select
              value={bookType}
              onChange={(e) => setBookType(e.target.value)}
              className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
            >
              <option value="">—</option>
              {BOOK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <Detail
          label="Published"
          value={book.published_date}
          editing={isEditingBookInfo}
          inputValue={publishedDate}
          setInputValue={setPublishedDate}
          placeholder="e.g. 2005"
        />

        <Detail
          label="Page Count"
          value={book.page_count}
          editing={isEditingBookInfo}
          inputValue={pageCount}
          setInputValue={setPageCount}
          placeholder="e.g. 352"
        />

        <Detail
          label="Series Number"
          value={book.series_number}
          editing={isEditingBookInfo}
          inputValue={seriesNumber}
          setInputValue={setSeriesNumber}
          placeholder="e.g. 2"
        />

        <Detail
          label="ISBN"
          value={book.isbn}
          editing={isEditingBookInfo}
          inputValue={isbn}
          setInputValue={setIsbn}
          placeholder="ISBN"
        />

        <Detail
          label="ISBN-13"
          value={book.isbn13}
          editing={isEditingBookInfo}
          inputValue={isbn13}
          setInputValue={setIsbn13}
          placeholder="ISBN-13"
        />
      </div>

      {isEditingBookInfo ? (
        <div className="mt-4 rounded border bg-white p-3 text-sm">
          <div className="text-stone-600">Cover URL</div>
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="Cover URL"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      ) : null}
    </div>
  );
}