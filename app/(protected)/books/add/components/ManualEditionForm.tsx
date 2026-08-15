import AddBookCatalogResult from "./AddBookCatalogResult";
import {
  COMMON_BOOK_LANGUAGE_OPTIONS,
  bookLanguageLabel,
  normalizeBookLanguageCode,
} from "@/lib/books/bookLanguage";

export type ManualEditionMode = "isbn" | "asin" | "manual";

type EditionFormatOption = {
  value: string;
  label: string;
};

type ManualEditionCandidate = {
  result: {
    id: string;
    title: string | null;
    author: string | null;
    cover_url: string | null;
    book_type: string | null;
    isbn13: string | null;
    asin: string | null;
    publisher: string | null;
    published_date: string | null;
    page_count: number | null;
    allow_missing_isbn?: boolean | null;
    allow_missing_publisher?: boolean | null;
    missing_info_cleared_at?: string | null;
    needs_review?: boolean | null;
    language_code?: string | null;
  };
  missingFields: string[];
  adding: boolean;
  requestLoading: boolean;
};

type ManualEditionFormProps = {
  mode: ManualEditionMode;
  identifierLabel: string;
  title: string;
  author: string;
  editionFormat: string;
  languageCode: string;
  pageCount: string;
  error: string;
  loading: boolean;
  candidates: ManualEditionCandidate[];
  editionFormatOptions: EditionFormatOption[];
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onEditionFormatChange: (value: string) => void;
  onLanguageCodeChange: (value: string) => void;
  onPageCountChange: (value: string) => void;
  onSubmit: () => void;
  onSubmitDifferentEdition: () => void;
  onCancel: () => void;
  onUseExistingEdition: (bookId: string) => void;
  onCheckDetails: (result: ManualEditionCandidate["result"]) => void;
};

function manualEditionTitle(mode: ManualEditionMode) {
  if (mode === "isbn") return "Add this ISBN edition";
  if (mode === "asin") return "Add this Amazon edition";
  return "Add a book manually";
}

export default function ManualEditionForm({
  mode,
  identifierLabel,
  title,
  author,
  editionFormat,
  languageCode,
  pageCount,
  error,
  loading,
  candidates,
  editionFormatOptions,
  onTitleChange,
  onAuthorChange,
  onEditionFormatChange,
  onLanguageCodeChange,
  onPageCountChange,
  onSubmit,
  onSubmitDifferentEdition,
  onCancel,
  onUseExistingEdition,
  onCheckDetails,
}: ManualEditionFormProps) {
  const formatRequired = mode === "manual";
  const authorRequired = mode === "manual";
  const normalizedLanguageCode = normalizeBookLanguageCode(languageCode);
  const languageLabel = bookLanguageLabel(normalizedLanguageCode);
  const selectedCommonLanguageCode = COMMON_BOOK_LANGUAGE_OPTIONS.some(
    (option) => option.code === normalizedLanguageCode
  )
    ? normalizedLanguageCode ?? ""
    : "";

  return (
    <section className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Manual details
        </p>
        <p className="w-fit rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-bold text-stone-600">
          {identifierLabel}
        </p>
      </div>
      <h2 className="mt-2 text-xl font-black text-stone-950">
        {manualEditionTitle(mode)}
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Add the details you know. Page count is recommended for pacing and
        page-based stats, but it is optional.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-stone-500">
            Title
          </span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Book title"
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-stone-500">
            {authorRequired ? "Author" : "Author (optional)"}
          </span>
          <input
            value={author}
            onChange={(event) => onAuthorChange(event.target.value)}
            placeholder={authorRequired ? "Author" : "Author if known"}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-stone-500">
              {formatRequired ? "Format" : "Format (optional)"}
            </span>
            <select
              value={editionFormat}
              onChange={(event) => onEditionFormatChange(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
            >
              <option value="">Choose format</option>
              {editionFormatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-stone-500">
              Page count (optional)
            </span>
            <input
              value={pageCount}
              onChange={(event) => onPageCountChange(event.target.value)}
              inputMode="numeric"
              placeholder="Page count"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
            />
            <p className="mt-2 text-xs leading-5 text-stone-500">
              Recommended for pacing and page-based stats.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
          <label className="block text-sm font-black text-stone-900">
            Language of this edition
          </label>
          <select
            value={selectedCommonLanguageCode}
            onChange={(event) => onLanguageCodeChange(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
          >
            <option value="">Select edition language</option>
            {COMMON_BOOK_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={languageCode}
            onChange={(event) => onLanguageCodeChange(event.target.value)}
            placeholder="Edition language code"
            className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
          />
          <p className="mt-2 text-xs leading-5 text-stone-600">
            {languageLabel
              ? `This will be saved as ${languageLabel}.`
              : "Language is saved as book metadata for this edition."}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {error}
        </div>
      ) : null}

      {candidates.length > 0 ? (
        <div className="mt-5 space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-bold text-stone-800">
            We found a possible existing edition. Use it if it matches, or
            confirm this is a different edition.
          </p>
          {candidates.map((candidate) => (
            <AddBookCatalogResult
              key={candidate.result.id}
              result={candidate.result}
              missingFields={candidate.missingFields}
              adding={candidate.adding}
              requestLoading={candidate.requestLoading}
              addLabel="Use This Edition"
              onAdd={() => onUseExistingEdition(candidate.result.id)}
              onRequestReview={() => onCheckDetails(candidate.result)}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add to Library"}
        </button>
        {candidates.length > 0 ? (
          <button
            type="button"
            onClick={onSubmitDifferentEdition}
            disabled={loading}
            className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            This Is a Different Edition
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
