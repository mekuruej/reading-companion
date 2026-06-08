type StatsErrorBannerProps = {
  message: string | null;
  tone: "red" | "purple";
};

export default function StatsErrorBanner({
  message,
  tone,
}: StatsErrorBannerProps) {
  if (!message) return null;

  const classes =
    tone === "purple"
      ? "border-purple-200 bg-purple-50 text-purple-800"
      : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${classes}`}>
      {message}
    </div>
  );
}