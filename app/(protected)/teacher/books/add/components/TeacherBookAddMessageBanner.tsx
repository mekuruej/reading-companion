type TeacherBookAddMessageBannerProps = {
  message: string;
  tone?: "neutral" | "success" | "error";
};

export function TeacherBookAddMessageBanner({
  message,
  tone = "neutral",
}: TeacherBookAddMessageBannerProps) {
  if (!message) {
    return null;
  }

  const toneClasses =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-stone-200 bg-white text-stone-700";

  return (
    <div className={`rounded-2xl border p-4 text-sm ${toneClasses}`}>
      {message}
    </div>
  );
}
