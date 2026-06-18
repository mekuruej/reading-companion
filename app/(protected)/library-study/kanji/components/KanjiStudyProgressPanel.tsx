type KanjiStudyProgressPanelProps = {
  current: number;
  total: number;
  summaryText?: string;
  answerModeLabel?: string;
  levelSummaryLabel?: string;
};

export default function KanjiStudyProgressPanel({
  current,
  total,
  summaryText,
  answerModeLabel,
  levelSummaryLabel,
}: KanjiStudyProgressPanelProps) {
  const studyingNowLabel = [
    summaryText || "Kanji Reading Study",
    answerModeLabel,
    levelSummaryLabel,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="mt-4 w-full max-w-3xl">
      <section className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Studying Now
            </p>

            <p className="mt-1 truncate text-lg font-bold text-slate-950">
              {studyingNowLabel}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Session progress
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {current} / {total}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}