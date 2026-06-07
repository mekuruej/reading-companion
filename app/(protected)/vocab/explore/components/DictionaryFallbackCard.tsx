type DictionaryFallbackEntry = {
  word: string;
  reading: string;
  meanings: string[];
};

type DictionaryFallbackCardProps = {
  entry: DictionaryFallbackEntry;
};

export default function DictionaryFallbackCard({
  entry,
}: DictionaryFallbackCardProps) {
  return (
    <section className="mt-6 w-full rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 text-lg font-semibold">
        Not found in this book
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Word
          </div>

          <div className="break-words text-4xl font-bold">
            {entry.word || "—"}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Reading
          </div>

          <div className="text-2xl font-medium">
            {entry.reading || "—"}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Definitions
          </div>

          {entry.meanings.length > 0 ? (
            <div className="space-y-2">
              {entry.meanings.map((meaning, index) => (
                <div key={`${meaning}-${index}`} className="rounded-xl border p-3">
                  <div className="text-sm font-semibold text-stone-700">
                    Def {index + 1}
                  </div>

                  <div className="mt-1 text-base text-stone-900">
                    {meaning}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-lg">—</div>
          )}
        </div>
      </div>
    </section>
  );
}