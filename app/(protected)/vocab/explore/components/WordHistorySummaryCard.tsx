type WordHistorySummaryCardProps = {
  surface: string;
  reading?: string | null;
  jlpt?: string | null;
  isCommon?: boolean | null;
  totalLookupCount: number;
  normalizeJlpt: (value: string | null | undefined) => string;
};

export default function WordHistorySummaryCard({
  surface,
  reading,
  jlpt,
  isCommon,
  totalLookupCount,
  normalizeJlpt,
}: WordHistorySummaryCardProps) {
  const normalizedJlpt = normalizeJlpt(jlpt);

  return (
    <section className="w-full rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 text-lg font-semibold">Word History</div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Word
          </div>

          <div className="break-words text-4xl font-bold">
            {surface}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Reading
          </div>

          <div className="text-2xl font-medium">
            {reading || "—"}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {normalizedJlpt !== "NON-JLPT" ? (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[17px] font-medium leading-none text-gray-800">
              {normalizedJlpt}
            </span>
          ) : null}

          {isCommon ? (
            <span className="text-gray-500">Common</span>
          ) : null}
        </div>

        <div className="mt-2 rounded-xl border p-3">
          <div className="text-xs text-gray-500">
            Appearances in this book
          </div>

          <div className="text-2xl font-semibold">
            {totalLookupCount}
          </div>
        </div>
      </div>
    </section>
  );
}