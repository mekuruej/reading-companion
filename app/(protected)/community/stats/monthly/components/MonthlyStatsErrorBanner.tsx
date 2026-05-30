type MonthlyStatsErrorBannerProps = {
  errorMsg: string;
};

export default function MonthlyStatsErrorBanner({
  errorMsg,
}: MonthlyStatsErrorBannerProps) {
  if (!errorMsg) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {errorMsg}
    </div>
  );
}