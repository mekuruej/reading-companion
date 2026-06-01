type WordExplorerModalProps = {
  query: string;
  loading: boolean;
  error: string | null;
  results: any[];
  onQueryChange: (value: string) => void;
  onSearch: () => void | Promise<void>;
  onClose: () => void;
};

export default function WordExplorerModal({
  query,
  loading,
  error,
  results,
  onQueryChange,
  onSearch,
  onClose,
}: WordExplorerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Word Explorer
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Search and explore a word without leaving the page.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onSearch();
                }
              }}
              placeholder="Search a word..."
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />

            <button
              type="button"
              onClick={() => void onSearch()}
              disabled={loading || !query.trim()}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((item, index) => {
                const japanese = item?.japanese?.[0];
                const senses = item?.senses ?? [];

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="text-lg font-semibold text-stone-900">
                      {japanese?.word || item?.slug || "—"}
                    </div>

                    {japanese?.reading ? (
                      <div className="mt-1 text-sm text-stone-500">
                        {japanese.reading}
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-2">
                      {senses
                        .slice(0, 3)
                        .map((sense: any, senseIndex: number) => (
                          <div
                            key={senseIndex}
                            className="text-sm text-stone-700"
                          >
                            <span className="font-medium text-stone-500">
                              {senseIndex + 1}.
                            </span>{" "}
                            {(sense?.english_definitions ?? []).join("; ") ||
                              "—"}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !loading && !error && query.trim() ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
              No results yet.
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
              Type a word to explore.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}