type FindBooksErrorBannerProps = {
  message: string;
};

export default function FindBooksErrorBanner({
  message,
}: FindBooksErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {message}
    </div>
  );
}