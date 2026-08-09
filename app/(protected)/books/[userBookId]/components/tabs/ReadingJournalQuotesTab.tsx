import {
  normalizeSavedQuote,
  type FavoriteQuoteInput,
} from "./quoteLocationHelpers";

type ReadingJournalQuotesTabProps = {
  favoriteQuoteInputs: FavoriteQuoteInput[];
  quoteSearch: string;
  setQuoteSearch: (value: string) => void;
  savedFavoriteQuotes: FavoriteQuoteInput[];
  savingQuotes: boolean;
  quotesSaveMessage: string;
  addFavoriteQuote: () => void;
  updateFavoriteQuote: (index: number, field: keyof FavoriteQuoteInput, value: string) => void;
  removeFavoriteQuote: (index: number) => void;
  saveFavoriteQuotes: () => Promise<void>;
};

export default function ReadingJournalQuotesTab({
  favoriteQuoteInputs,
  quoteSearch,
  setQuoteSearch,
  savedFavoriteQuotes,
  savingQuotes,
  quotesSaveMessage,
  addFavoriteQuote,
  updateFavoriteQuote,
  removeFavoriteQuote,
  saveFavoriteQuotes,
}: ReadingJournalQuotesTabProps) {
  const normalizedSavedQuotes = savedFavoriteQuotes.map(normalizeSavedQuote).filter(Boolean);
  const cleanQuoteSearch = quoteSearch.trim().toLowerCase();
  const visibleQuoteRows = favoriteQuoteInputs
    .map((quote, index) => ({ quote, index }))
    .filter((item) => {
      if (!cleanQuoteSearch) return true;
      return [item.quote.text, item.quote.page, item.quote.percent]
        .join(" ")
        .toLowerCase()
        .includes(cleanQuoteSearch);
    });

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-stone-900">Quotes</div>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Save memorable lines from this book. These reuse the same quote data as Review & Notes.
          </p>
        </div>
        <button
          type="button"
          onClick={addFavoriteQuote}
          className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-black text-amber-900 transition hover:bg-amber-100"
        >
          Add Quote
        </button>
      </div>

      <input
        value={quoteSearch}
        onChange={(event) => setQuoteSearch(event.target.value)}
        placeholder="Search quotes..."
        className="mb-3 w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
      />

      <div className="space-y-3">
        {visibleQuoteRows.length === 0 ? (
          <div className="rounded-xl border border-amber-100 bg-white p-4 text-sm text-stone-600">
            No quotes match this search.
          </div>
        ) : null}
        {visibleQuoteRows.map(({ quote, index }) => {
          const quoteIsSaved =
            normalizeSavedQuote(quote).length > 0 &&
            normalizedSavedQuotes.includes(normalizeSavedQuote(quote));

          return (
            <div
              key={index}
              className={[
                "rounded-2xl border p-3 transition",
                quoteIsSaved
                  ? "border-emerald-200 bg-emerald-50 shadow-sm shadow-emerald-100"
                  : "border-amber-100 bg-white",
              ].join(" ")}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                    Quote {index + 1}
                  </span>
                  {quoteIsSaved ? (
                    <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                      Saved
                    </span>
                  ) : null}
                </div>
                {favoriteQuoteInputs.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeFavoriteQuote(index)}
                    className="text-xs font-semibold text-stone-500 hover:text-rose-700"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <textarea
                value={quote.text}
                onChange={(event) => updateFavoriteQuote(index, "text", event.target.value)}
                className={[
                  "min-h-[96px] w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none focus:ring-2",
                  quoteIsSaved
                    ? "border-emerald-200 focus:ring-emerald-200"
                    : "border-amber-100 focus:ring-amber-200",
                ].join(" ")}
                placeholder="Add one quote you want to remember."
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
                    Page
                  </span>
                  <input
                    value={quote.page}
                    onChange={(event) => updateFavoriteQuote(index, "page", event.target.value)}
                    inputMode="numeric"
                    className="mt-1 w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                    placeholder="123"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
                    Percent
                  </span>
                  <div className="mt-1 flex rounded-xl border border-amber-100 bg-white focus-within:ring-2 focus-within:ring-amber-200">
                    <input
                      value={quote.percent}
                      onChange={(event) =>
                        updateFavoriteQuote(index, "percent", event.target.value)
                      }
                      inputMode="decimal"
                      className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
                      placeholder="45"
                    />
                    <span className="flex items-center px-3 text-sm font-semibold text-stone-500">
                      %
                    </span>
                  </div>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void saveFavoriteQuotes()}
          disabled={savingQuotes}
          className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-800 disabled:opacity-50"
        >
          {savingQuotes ? "Saving..." : "Save Quotes"}
        </button>
        {quotesSaveMessage ? (
          <span className="text-sm font-semibold text-stone-600">{quotesSaveMessage}</span>
        ) : null}
      </div>
    </div>
  );
}
