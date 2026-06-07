type OtherMatchEntry = {
  word: string;
  reading: string;
  meanings: string[];
};

type OtherMatchesPanelProps = {
  matches: OtherMatchEntry[];
};

export default function OtherMatchesPanel({
  matches,
}: OtherMatchesPanelProps) {
  if (matches.length === 0) return null;

  return (
    <section className="mt-6 w-full rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 text-lg font-semibold">
        Other Possible Matches
      </div>

      <div className="space-y-3">
        {matches.map((entry, index) => (
          <div
            key={`${entry.word}-${entry.reading}-${index}`}
            className="w-full rounded-xl border p-4"
          >
            <div className="font-medium text-stone-900">
              {entry.word}
            </div>

            <div className="mt-1 text-sm text-stone-500">
              {entry.reading || "—"}
            </div>

            <div className="mt-2 text-sm text-stone-700">
              {entry.meanings[0] || "—"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}