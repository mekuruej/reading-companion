type MonthlyRhythmSectionProps = {
  // Monthly rhythm calculations stay in page.tsx during the visual pass.
  loading: boolean;
  totalReadingTimeLabel: string;
  totalEngagementTimeLabel: string;
  averagePagesPerEngagedDayLabel: string;
};

export default function MonthlyRhythmSection({
  loading,
  totalReadingTimeLabel,
  totalEngagementTimeLabel,
  averagePagesPerEngagedDayLabel,
}: MonthlyRhythmSectionProps) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
        Monthly rhythm
      </p>

      <h2 className="mt-2 text-2xl font-black text-stone-900">
        What this month looks like
      </h2>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        This combines reading sessions, listening, and saved words because
        looking up and saving vocabulary is also part of your reading life.
      </p>

      <div className="mt-5 grid gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-bold text-stone-700">
            Total reading time
          </p>
          <p className="mt-1 text-2xl font-black text-stone-900">
            {loading ? "—" : totalReadingTimeLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-bold text-stone-700">
            Total engagement time
          </p>
          <p className="mt-1 text-2xl font-black text-stone-900">
            {loading ? "—" : totalEngagementTimeLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-bold text-stone-700">
            Average pages per engaged day
          </p>
          <p className="mt-1 text-2xl font-black text-stone-900">
            {loading ? "—" : averagePagesPerEngagedDayLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
