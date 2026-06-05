type LibraryReviewProgressCardProps = {
  current: number;
  total: number;
};

export default function LibraryReviewProgressCard({
  current,
  total,
}: LibraryReviewProgressCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Review Progress
          </p>

          <p className="text-base font-semibold text-slate-800">
            Card {current}/{total}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Review Pool
          </p>

          <p className="text-base font-semibold text-slate-800">
            {total}
          </p>
        </div>
      </div>
    </div>
  );
}