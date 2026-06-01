type ReadingColorsErrorBannerProps = {
  message: string;
};

export default function ReadingColorsErrorBanner({
  message,
}: ReadingColorsErrorBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}