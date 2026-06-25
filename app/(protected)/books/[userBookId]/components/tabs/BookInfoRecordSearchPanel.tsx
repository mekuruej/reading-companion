import type { ReactNode } from "react";

type SearchRecord = {
  id: string;
  name_ja?: string | null;
  name_en?: string | null;
  reading?: string | null;
};

type BookInfoRecordSearchPanelProps<T extends SearchRecord> = {
  label: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  loading: boolean;
  error: string | null;
  results: T[];
  onSelectResult: (record: T) => void;
  noResultsMessage: string;

  selectedLabel: string;
  hasSelectedRecord: boolean;
  onClearSelected: () => void;

  canCreateSharedRecords?: boolean;
  requireSharedRecord: boolean;
  requireSharedRecordMessage: string;
  createNewMessage: string;
  createNewButtonLabel: string;
  onCreateFromSearch: () => void;

  extraMatches?: ReactNode;
  footerContent?: ReactNode;
  descriptionContent?: ReactNode;
};

export default function BookInfoRecordSearchPanel<T extends SearchRecord>({
  label,
  searchValue,
  onSearchChange,
  placeholder,
  loading,
  error,
  results,
  onSelectResult,
  noResultsMessage,
  selectedLabel,
  hasSelectedRecord,
  onClearSelected,
  canCreateSharedRecords = false,
  requireSharedRecord,
  requireSharedRecordMessage,
  createNewMessage,
  createNewButtonLabel,
  onCreateFromSearch,
  extraMatches,
  footerContent,
  descriptionContent,
}: BookInfoRecordSearchPanelProps<T>) {
  const hasSearch = searchValue.trim().length > 0;

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <label className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded border px-2 py-1 text-sm"
      />

      {descriptionContent ? (
        <div className="mt-2 text-xs text-stone-500">{descriptionContent}</div>
      ) : null}

      {loading ? (
        <div className="mt-2 text-xs text-stone-500">Searching…</div>
      ) : null}

      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}

      {results.length > 0 ? (
        <div className="mt-2 rounded border border-stone-200">
          {results.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelectResult(record)}
              className="block w-full border-b border-stone-200 px-3 py-2 text-left last:border-b-0 hover:bg-stone-50"
            >
              <div className="font-medium text-stone-900">{record.name_ja}</div>
              <div className="text-xs text-stone-600">
                {record.name_en || "—"} · {record.reading || "—"}
              </div>
            </button>
          ))}
        </div>
      ) : hasSearch && !loading && !error ? (
        <div className="mt-2 text-xs text-stone-500">{noResultsMessage}</div>
      ) : null}

      {extraMatches}

      {hasSelectedRecord ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
          <span className="rounded-full bg-stone-100 px-2 py-1">
            {selectedLabel}
          </span>
          <button
            type="button"
            onClick={onClearSelected}
            className="text-stone-500 underline hover:text-stone-700"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      {canCreateSharedRecords && requireSharedRecord ? (
        <div className="mt-2 text-xs font-medium text-amber-700">
          {requireSharedRecordMessage}
        </div>
      ) : null}

      {canCreateSharedRecords && hasSearch ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs text-amber-900">{createNewMessage}</div>
          <button
            type="button"
            onClick={onCreateFromSearch}
            className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 transition hover:bg-amber-100"
          >
            {createNewButtonLabel}
          </button>
        </div>
      ) : null}

      {footerContent}
    </div>
  );
}
