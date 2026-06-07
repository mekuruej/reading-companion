type RecurringWordItem = {
  surface: string;
  reading: string | null;
  totalAppearances: number;
};

type RecurringWordsPanelProps = {
  loading: boolean;
  items: RecurringWordItem[];
  onSelectWord: (surface: string) => void;
};

export default function RecurringWordsPanel({
  loading,
  items,
  onSelectWord,
}: RecurringWordsPanelProps) {
  return (
    <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <div className="text-lg font-semibold text-stone-900">
          Words I Often Look Up
        </div>

        <p className="mt-1 text-sm text-stone-500">
          Words that show up the most in this book&apos;s saved reading.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-stone-500">
          Loading recurring words…
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-stone-500">
          Nothing here yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={`${item.surface}|||${item.reading ?? ""}`}
              type="button"
              onClick={() => onSelectWord(item.surface)}
              className="w-full rounded-xl border p-3 text-left transition hover:bg-stone-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-stone-900">
                    {item.surface}
                  </div>

                  {item.reading ? (
                    <div className="mt-0.5 text-sm text-stone-500">
                      {item.reading}
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 text-right text-xs text-stone-500">
                  <div>{item.totalAppearances} appearances</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}