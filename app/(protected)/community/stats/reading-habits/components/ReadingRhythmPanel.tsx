import SectionBand from "./SectionBand";

export type ReadingRhythmDay = {
  day: string;
  minutes: number;
  pages: number;
  sessions: number;
  fluidSessions: number;
  curiositySessions: number;
  listeningSessions: number;
};

export type ReadingRhythmSummary = {
  activeDays: number;
  fluidDays: number;
  curiosityDays: number;
  listeningDays: number;
  mixedDays: number;
  minutes: number;
  sessions: number;
  pages: number;
};

type ReadingRhythmPanelProps = {
  selectedTimeLabel: string;
  readingRhythmWindowLabel: string;
  tone: string;
  visibleActivity: ReadingRhythmDay[];
  totalActivityDays: number;
  collapsedDayCount: number;
  showFullReadingRhythm: boolean;
  summary: ReadingRhythmSummary;
  formatMinutesAsReadableTime: (minutes: number) => string;
  onToggleFullReadingRhythm: () => void;
};

function readingRhythmColorClass(item: ReadingRhythmDay) {
  const hasFluid = item.fluidSessions > 0;
  const hasCuriosity = item.curiositySessions > 0;
  const hasListening = item.listeningSessions > 0;
  const activeModeCount = [hasFluid, hasCuriosity, hasListening].filter(Boolean).length;
  const isMixed = activeModeCount >= 2;
  const intensity = item.sessions + Math.floor(item.minutes / 30);

  if (item.sessions === 0) return "bg-slate-100";

  if (isMixed) {
    if (intensity < 3) return "bg-violet-300";
    if (intensity < 6) return "bg-violet-500";
    return "bg-violet-700";
  }

  if (hasListening) {
    if (intensity < 3) return "bg-sky-300";
    if (intensity < 6) return "bg-sky-500";
    return "bg-sky-700";
  }

  if (hasCuriosity) {
    if (intensity < 3) return "bg-amber-200";
    if (intensity < 6) return "bg-amber-400";
    return "bg-amber-600";
  }

  if (intensity < 3) return "bg-emerald-300";
  if (intensity < 6) return "bg-emerald-500";
  return "bg-emerald-700";
}

function ReadingRhythmLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-emerald-500" />
        Fluid
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        Curiosity
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-sky-500" />
        Listening
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-violet-500" />
        Mixed modes
      </div>
    </div>
  );
}

function ReadingRhythmSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-900/10 bg-white px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function ReadingRhythmPanel({
  selectedTimeLabel,
  readingRhythmWindowLabel,
  tone,
  visibleActivity,
  totalActivityDays,
  collapsedDayCount,
  showFullReadingRhythm,
  summary,
  formatMinutesAsReadableTime,
  onToggleFullReadingRhythm,
}: ReadingRhythmPanelProps) {
  return (
    <SectionBand
      eyebrow={`Reading Rhythm — ${selectedTimeLabel}`}
      title="Reading rhythm by day"
      description={`${readingRhythmWindowLabel}: which days you read, listened, or mixed modes. Untimed sessions still count as activity.`}
      tone={tone}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-800">
          Showing: {readingRhythmWindowLabel}
        </div>

        {totalActivityDays > collapsedDayCount ? (
          <button
            type="button"
            onClick={onToggleFullReadingRhythm}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {showFullReadingRhythm
              ? "Collapse to recent 90 days"
              : `Show full ${selectedTimeLabel.toLowerCase()}`}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))] xl:grid-cols-[repeat(28,minmax(0,1fr))]">
        {visibleActivity.map((item, index) => {
          const previousItem = visibleActivity[index - 1];
          const startsMonth =
            index === 0 || item.day.slice(0, 7) !== previousItem?.day.slice(0, 7);

          const monthLabel = new Date(`${item.day}T00:00:00`)
            .toLocaleString("en-US", { month: "short" })
            .toUpperCase();

          const monthTextClass =
            item.sessions > 0 ? "text-white drop-shadow-sm" : "text-slate-500";

          return (
            <div key={item.day} className="space-y-1">
              <div
                className={`relative h-10 rounded-lg border border-white/70 ${readingRhythmColorClass(
                  item
                )}`}
                title={`${item.day}: ${item.sessions} session${
                  item.sessions === 1 ? "" : "s"
                }, ${item.pages} page${item.pages === 1 ? "" : "s"}, ${
                  item.minutes
                } minute${item.minutes === 1 ? "" : "s"}`}
              >
                {startsMonth ? (
                  <span
                    className={`absolute left-1 top-1 text-[8px] font-black tracking-wide ${monthTextClass}`}
                  >
                    {monthLabel}
                  </span>
                ) : null}
              </div>

              <div className="text-center text-[9px] text-slate-500">
                {item.day.slice(8)}
              </div>
            </div>
          );
        })}
      </div>

      <ReadingRhythmLegend />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ReadingRhythmSummaryCard label="Active days" value={summary.activeDays} />
        <ReadingRhythmSummaryCard label="Fluid days" value={summary.fluidDays} />
        <ReadingRhythmSummaryCard label="Curiosity days" value={summary.curiosityDays} />
        <ReadingRhythmSummaryCard label="Listening days" value={summary.listeningDays} />
        <ReadingRhythmSummaryCard label="Mixed-mode days" value={summary.mixedDays} />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Reading rhythm</div>

        <div className="mt-2 text-sm leading-6 text-slate-600">
          {summary.sessions === 0
            ? "No reading sessions in this window yet. One tiny session is enough to start a rhythm."
            : `You logged ${summary.sessions} session${
                summary.sessions === 1 ? "" : "s"
              }, ${formatMinutesAsReadableTime(summary.minutes)}, and ${summary.pages} page${
                summary.pages === 1 ? "" : "s"
              } in this window.`}
        </div>
      </div>
    </SectionBand>
  );
}