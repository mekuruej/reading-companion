type TeacherKanjiMessageBannerProps = {
  type: "error" | "success";
  message: string | null;
};

export default function TeacherKanjiMessageBanner({
  type,
  message,
}: TeacherKanjiMessageBannerProps) {
  if (!message) return null;

  const className =
    type === "error"
      ? "mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      : "mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700";

  return <section className={className}>{message}</section>;
}