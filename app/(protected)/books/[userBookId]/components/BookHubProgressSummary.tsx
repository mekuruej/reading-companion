import { useState } from "react";
import BookHubStatCard from "./BookHubStatCard";

type BookHubProgressSummaryProps = {
  // The compact card is also used by BookProgressSummaryBar; full hub statistics remain optional.
  progressLabel: string;
  progressSummaryLabel: string;
  progressBarWidth: string;
  progressPercentLabel?: string;
  lastSavedWordLabel?: string;
  lastReadPhrase?: string;
  lastChapterLabel?: string;
  lastPageLabel?: string;
  daysEngagedLabel: string;
  daysEngagedCaption?: string;
  savedWordsPerPageLabel: string;
  averageMinutesPerPageLabel: string;
  showVocabularyStats?: boolean;
  showSummaryCard?: boolean;
  showProgressSection?: boolean;
  learningStats?: BookHubStat[];
  summaryStats?: {
    label: string;
    value?: string;
    caption?: string;
    details?: { label: string; value: string }[];
  }[];
};

type BookHubStat = {
  label: string;
  value?: string;
  caption?: string;
  details?: { label: string; value: string }[];
};

export default function BookHubProgressSummary({
  progressLabel,
  progressSummaryLabel,
  progressBarWidth,
  progressPercentLabel,
  lastSavedWordLabel,
  lastReadPhrase,
  lastChapterLabel,
  lastPageLabel,
  daysEngagedLabel,
  daysEngagedCaption = "Reading or listening",
  savedWordsPerPageLabel,
  averageMinutesPerPageLabel,
  showVocabularyStats = true,
  showSummaryCard = true,
  showProgressSection = true,
  summaryStats,
  learningStats,
}: BookHubProgressSummaryProps) {
  const [snapshotView, setSnapshotView] = useState<"reading" | "learning">("reading");
  const hasLearningStats = Boolean(learningStats && summaryStats);
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
      {showSummaryCard ? (
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
                  Position reached: <span className="text-stone-800">{lastPageLabel}</span>
                </>
              ) : null}
            </div>
          ) : null}
          {lastReadPhrase ? (
            <div className="mt-1 whitespace-pre-wrap break-words text-stone-600">
              Last read phrase: <span className="text-stone-800">{lastReadPhrase}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {showProgressSection ? (
        <>
          <div>
            <div data-hub-surface-text="body" className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-stone-500">
              <span>Current Progress</span>
              <span>
                {progressPercentLabel ? `${progressPercentLabel} · ` : ""}{progressLabel}
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-white ring-1 ring-stone-300">
              <div
                className="h-full rounded-full bg-stone-700 transition-all"
                style={{ width: progressBarWidth }}
              />
            </div>
          </div>

          {hasLearningStats ? (
            <div
              role="region"
              aria-label={`${snapshotView === "reading" ? "Reading" : "Learning"} progress snapshot`}
              className="rounded-3xl"
            >
              <div role="group" aria-label="Choose progress snapshot" className="mb-2 flex flex-wrap gap-2">
                {(["reading", "learning"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    aria-pressed={snapshotView === view}
                    data-hub-button={snapshotView === view ? "primary" : "secondary"}
                    onClick={() => setSnapshotView(view)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${snapshotView === view ? "border-violet-700 bg-violet-700 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"}`}
                  >
                    {view === "reading" ? "Reading" : "Learning"}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-stone-500">
                  {snapshotView === "reading" ? "Reading Snapshot" : "Learning Snapshot"}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(snapshotView === "reading" ? summaryStats : learningStats)?.map(stat => (
                    <BookHubStatCard key={stat.label} label={stat.label} value={stat.value} caption={stat.caption} details={stat.details} />
                  ))}
                </div>
              </div>
            </div>
          ) : summaryStats && summaryStats.length === 0 ? null : (
            <div className={`grid grid-cols-1 gap-3 ${learningStats ? "sm:grid-cols-3" : statGridClass}`}>
              {summaryStats ? (
                summaryStats.map((stat) => (
                  <BookHubStatCard
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    caption={stat.caption}
                    details={stat.details}
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
      ) : null}
    </>
  );
}
