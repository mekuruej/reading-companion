import BookHubStatCard from "./BookHubStatCard";

type BookHubProgressSummaryProps = {
  // Progress math and reading-session calculations stay in page.tsx.
  progressLabel: string;
  progressBarWidth: string;
  lastReadDateLabel: string;
  daysEngagedLabel: string;
  pagesReadLabel: string;
  wordsSavedLabel: string;
  averageMinutesPerPageLabel: string;
  showVocabularySummary?: boolean;
};

export default function BookHubProgressSummary({
  progressLabel,
  progressBarWidth,
  lastReadDateLabel,
  daysEngagedLabel,
  pagesReadLabel,
  wordsSavedLabel,
  averageMinutesPerPageLabel,
  showVocabularySummary = true,
}: BookHubProgressSummaryProps) {
  return (
    <>
      <div>
        <div className="mb-2 text-sm text-stone-700">
          <div className="font-medium">Progress</div>
          <div className="mt-1 text-stone-500">{progressLabel}</div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-stone-700 transition-all"
            style={{ width: progressBarWidth }}
          />
        </div>
      </div>

      <p className="mt-2 mb-4 text-xs text-stone-500">
        Last read: {lastReadDateLabel}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BookHubStatCard
          label="Days Engaged"
          value={daysEngagedLabel}
          caption="Reading or listening"
        />

        <BookHubStatCard
          label="Pages Read"
          value={pagesReadLabel}
          caption="Page-tracked only"
        />

        {showVocabularySummary ? (
          <BookHubStatCard
            label="Words Saved"
            value={wordsSavedLabel}
            caption="Unique saved words"
          />
        ) : null}

        <BookHubStatCard
          label="Avg Min/Page"
          value={averageMinutesPerPageLabel}
          caption="Timed page-tracked reading"
        />
      </div>
    </>
  );
}