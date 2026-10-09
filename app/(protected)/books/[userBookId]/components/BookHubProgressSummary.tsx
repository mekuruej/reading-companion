import { useEffect, useState } from "react";
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
  learningStats?: { label: string; value: string; caption: string }[];
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
  const [snapshotHovered, setSnapshotHovered] = useState(false);
  const [snapshotFocused, setSnapshotFocused] = useState(false);
  const [snapshotVisible, setSnapshotVisible] = useState(true);
  const hasLearningStats = Boolean(learningStats && summaryStats);
  useEffect(() => {
    if (!hasLearningStats || !showProgressSection || snapshotHovered || snapshotFocused) return;
    let contentChange: number | undefined;
    let fadeIn: number | undefined;
    const rotation = window.setInterval(() => {
      setSnapshotVisible(false);
      contentChange = window.setTimeout(() => {
        setSnapshotView(view => view === "reading" ? "learning" : "reading");
        fadeIn = window.setTimeout(() => setSnapshotVisible(true), 150);
      }, 450);
    }, 15000);
    return () => {
      window.clearInterval(rotation);
      window.clearTimeout(contentChange);
      window.clearTimeout(fadeIn);
    };
  }, [hasLearningStats, showProgressSection, snapshotHovered, snapshotFocused]);
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
              aria-label="Reading and learning progress snapshot"
              tabIndex={0}
              onMouseEnter={() => { setSnapshotHovered(true); setSnapshotVisible(true); }}
              onMouseLeave={() => setSnapshotHovered(false)}
              onFocusCapture={() => { setSnapshotFocused(true); setSnapshotVisible(true); }}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setSnapshotFocused(false);
              }}
              className="grid rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
            >
              {(["reading", "learning"] as const).map(view => (
                <div
                  key={view}
                  aria-hidden={snapshotView !== view}
                  className={`col-start-1 row-start-1 space-y-2 transition-opacity duration-[450ms] motion-reduce:transition-none ${snapshotView === view && snapshotVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                  <h3 className="text-xs font-semibold tracking-wide text-stone-500">
                    {view === "reading" ? "Reading Snapshot" : "Learning Snapshot"}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(view === "reading" ? summaryStats : learningStats)?.map(stat => (
                      <BookHubStatCard key={stat.label} label={stat.label} value={stat.value} caption={stat.caption} />
                    ))}
                  </div>
                </div>
              ))}
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
