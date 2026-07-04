import BookHubStatCard from "./BookHubStatCard";

type BookHubProgressSummaryProps = {
  // Progress math and reading-session calculations stay in page.tsx.
  progressLabel: string;
  progressSummaryLabel: string;
  progressBarWidth: string;
  daysEngagedLabel: string;
  savedWordsPerPageLabel: string;
  averageMinutesPerPageLabel: string;
};

export default function BookHubProgressSummary({
  progressLabel,
  progressSummaryLabel,
  progressBarWidth,
  daysEngagedLabel,
  savedWordsPerPageLabel,
  averageMinutesPerPageLabel,
}: BookHubProgressSummaryProps) {
  return (
    <>
      <div>
        <div className="mb-3 rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm sm:px-5">
          <div className="font-semibold text-stone-900">Your Progress</div>
          <div className="mt-1 text-stone-600">{progressSummaryLabel}</div>
        </div>

        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-stone-500">
          <span>Current page</span>
          <span>{progressLabel}</span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-stone-700 transition-all"
            style={{ width: progressBarWidth }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BookHubStatCard
          label="Days Engaged"
          value={daysEngagedLabel}
          caption="Reading or listening"
        />

        <BookHubStatCard
          label="Saved Words/Page"
          value={savedWordsPerPageLabel}
          caption="Saved-word load"
        />

        <BookHubStatCard
          label="Avg Min/Page"
          value={averageMinutesPerPageLabel}
          caption="Timed page-tracked reading"
        />
      </div>
    </>
  );
}