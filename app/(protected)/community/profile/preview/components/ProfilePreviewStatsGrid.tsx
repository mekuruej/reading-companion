type PublicStatItem = {
  label: string;
  value: string;
};

type ReadingLevelInfo = {
  value: string;
  plain: string;
  cefr: string;
  jlpt: string;
};

type ProfilePreviewStatsGridProps = {
  loading: boolean;
  publicStats: PublicStatItem[];
  readingLevel: ReadingLevelInfo | null;
  fallbackLevelLabel: string;
};

export default function ProfilePreviewStatsGrid({
  loading,
  publicStats,
  readingLevel,
  fallbackLevelLabel,
}: ProfilePreviewStatsGridProps) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-4">
      {publicStats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3"
        >
          <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
            {stat.label}
          </div>
          <div className="mt-1 text-lg font-black text-stone-900">
            {loading ? "—" : stat.value}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
          Japanese Level
        </div>
        {loading ? (
          <div className="mt-1 text-lg font-black text-stone-900">—</div>
        ) : readingLevel ? (
          <>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-xl font-black text-stone-950">
                {readingLevel.value}
              </span>
              <span className="text-sm font-black text-stone-800">
                {readingLevel.plain}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-black uppercase tracking-wide text-stone-500">
              {readingLevel.cefr} · {readingLevel.jlpt}
            </div>
          </>
        ) : (
          <div className="mt-1 text-lg font-black text-stone-900">
            {fallbackLevelLabel}
          </div>
        )}
      </div>
    </div>
  );
}