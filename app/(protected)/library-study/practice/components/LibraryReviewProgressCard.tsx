type LibraryReviewProgressCardProps = {
  current: number;
  total: number;
  studyingNowLabel: string;
};

export default function LibraryReviewProgressCard({
  current,
  total,
  studyingNowLabel,
}: LibraryReviewProgressCardProps) {
  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
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
    </div>
  );
}