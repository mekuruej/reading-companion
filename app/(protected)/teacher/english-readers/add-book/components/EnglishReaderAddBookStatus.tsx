type EnglishReaderAddBookStatusProps = {
  message: string;
  tone?: "info" | "success" | "error";
};

export default function EnglishReaderAddBookStatus({
  message,
  tone = "info",
}: EnglishReaderAddBookStatusProps) {
  if (!message) return null;

  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-stone-200 bg-stone-50 text-stone-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${toneClass}`}>
      {message}
    </div>
  );
}
