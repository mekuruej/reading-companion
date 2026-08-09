import BookHubStatCard from "./BookHubStatCard";

type BookHubProgressSummaryProps = {
  // Progress math and reading-session calculations stay in page.tsx.
  progressLabel: string;
  progressSummaryLabel: string;
  progressBarWidth: string;
  progressPercentLabel?: string;
  lastSavedWordLabel?: string;
  lastChapterLabel?: string;
  lastPageLabel?: string;
  daysEngagedLabel: string;
  daysEngagedCaption?: string;
  savedWordsPerPageLabel: string;
  averageMinutesPerPageLabel: string;
  showVocabularyStats?: boolean;
  summaryStats?: {
    label: string;
    value: string;
    caption?: string;
  }[];
};

export default function BookHubProgressSummary({
  progressLabel,
  progressSummaryLabel,
  progressBarWidth,
  progressPercentLabel,
  lastSavedWordLabel,
  lastChapterLabel,
  lastPageLabel,
  daysEngagedLabel,
  daysEngagedCaption = "Reading or listening",
  savedWordsPerPageLabel,
  averageMinutesPerPageLabel,
  showVocabularyStats = true,
  summaryStats,
}: BookHubProgressSummaryProps) {
  const showLastDetailLine = lastSavedWordLabel || lastChapterLabel || lastPageLabel;
  const statGridClass = summaryStats
    ? summaryStats.length >= 3
      ? "sm:grid-cols-3"
      : summaryStats.length === 2
        ? "sm:grid-cols-2"
        : ""
    : showVocabularyStats
      ? "sm:grid-cols-3"
      : "sm:grid-cols-2";

  return (
    <>
      <div>
        <div className="mb-3 rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm sm:px-5">
          <div className="font-semibold text-stone-900">Your Progress</div>
          {progressSummaryLabel ? (
            <div className="mt-1 text-stone-600">{progressSummaryLabel}</div>
          ) : null}
          {showLastDetailLine ? (
            <div className="mt-1 text-stone-600">
              {lastSavedWordLabel ? (
                <>
                  Last saved word: <span className="text-stone-800">{lastSavedWordLabel}</span>
                </>
              ) : null}
              {lastChapterLabel ? (
                <>
                  {lastSavedWordLabel ? (
                    <>
                      {" "}
                      <span className="text-stone-400">·</span>{" "}
                    </>
                  ) : null}
                  Last chapter:{" "}
                  <span className="text-stone-800">{lastChapterLabel}</span>
                </>
              ) : null}
              {lastPageLabel ? (
                <>
                  {lastSavedWordLabel || lastChapterLabel ? (
                    <>
                      {" "}
                      <span className="text-stone-400">·</span>{" "}
                    </>
                  ) : null}
                  Page reached: <span className="text-stone-800">{lastPageLabel}</span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-stone-500">
          <span>Current Page Progress</span>
          <span>
            {progressPercentLabel ? `${progressPercentLabel} · ` : ""}{progressLabel}
          </span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-stone-700 transition-all"
            style={{ width: progressBarWidth }}
          />
        </div>
      </div>

      {summaryStats && summaryStats.length === 0 ? null : (
        <div className={`grid grid-cols-1 gap-3 ${statGridClass}`}>
          {summaryStats ? (
            summaryStats.map((stat) => (
              <BookHubStatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                caption={stat.caption}
              />
            ))
          ) : (
            <>
              <BookHubStatCard
                label="Days Engaged"
                value={daysEngagedLabel}
                caption={daysEngagedCaption}
              />

              {showVocabularyStats ? (
                <BookHubStatCard
                  label="Saved Words/Page"
                  value={savedWordsPerPageLabel}
                  caption="Saved-word load"
                />
              ) : null}

              <BookHubStatCard
                label="Avg Min/Page"
                value={averageMinutesPerPageLabel}
                caption="Timed page-tracked reading"
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
