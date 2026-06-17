type LibraryReviewIntroCardProps = {
  title?: string;
  description?: string;
};

export default function LibraryReviewIntroCard({
  title = "Saved Words Review",
  description = "Practice all saved words across your books. This review does not change word colors.",
}: LibraryReviewIntroCardProps) {
  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}