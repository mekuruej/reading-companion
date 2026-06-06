type DifficultyNeighborhoodPanelProps = {
  neighborhood: {
    label: string;
    colorClass: string;
    note: string;
  };
  percentHarderThan: number | null;
  sampleSize: number;
  typeLabel: string;
  ratingDifficulty: number | null;
  ratingText: string;
};

export default function DifficultyNeighborhoodPanel({
  neighborhood,
  percentHarderThan,
  sampleSize,
  typeLabel,
  ratingDifficulty,
  ratingText,
}: DifficultyNeighborhoodPanelProps) {
  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${neighborhood.colorClass}`}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_210px] md:items-stretch">
        <div className="rounded-2xl bg-white/35 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
            Difficulty Neighborhood
          </div>

          <div className="mt-2 text-3xl font-black">
            {neighborhood.label}
          </div>

          {percentHarderThan != null ? (
            <p className="mt-2 text-sm leading-6">
              Harder than{" "}
              <span className="font-black">
                {percentHarderThan}%
              </span>{" "}
              of your other {typeLabel}.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6">
              {neighborhood.note}
            </p>
          )}

          <div className="mt-4 text-xs opacity-70">
            Compared only with your rated {typeLabel}.{" "}
            {sampleSize > 0
              ? `Based on ${sampleSize} other rated ${typeLabel}.`
              : "Rate more books of this type to compare fairly."}
          </div>
        </div>

        <div className="flex min-h-[150px] flex-col justify-center rounded-2xl border border-white/70 bg-white/75 p-5 text-center shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
            Your Rating
          </div>

          <div className="mt-2 text-4xl font-black">
            {ratingDifficulty ? `${ratingDifficulty}/5` : "—"}
          </div>

          <div className="mt-2 text-sm font-semibold opacity-80">
            {ratingText}
          </div>
        </div>
      </div>
    </section>
  );
}