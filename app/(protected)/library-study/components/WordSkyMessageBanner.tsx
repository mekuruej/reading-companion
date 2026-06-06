type WordSkyMessageBannerProps = {
  message: string;
};

export default function WordSkyMessageBanner({
  message,
}: WordSkyMessageBannerProps) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {message}
    </div>
  );
}