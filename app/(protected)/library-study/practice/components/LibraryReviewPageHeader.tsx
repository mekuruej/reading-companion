type LibraryReviewPageHeaderProps = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: string;
  iconClassName?: string;
  onBackToStudyHub?: () => void;
};

export default function LibraryReviewPageHeader({
  title = "Saved Words Review",
  subtitle = "Practice tricky words across your books.",
  eyebrow = "From your library",
  icon = "📚",
  iconClassName = "text-stone-900",
  onBackToStudyHub,
}: LibraryReviewPageHeaderProps) {
  return (
    <div className="w-full max-w-3xl">
      {onBackToStudyHub ? (
        <button
          type="button"
          onClick={onBackToStudyHub}
          className="mb-2 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Study Hub
        </button>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-4 rounded-xl text-left">
          <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-[2.6rem] font-bold leading-none shadow-sm">
            <span className={iconClassName}>{icon}</span>
          </div>

          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              {eyebrow}
            </p>

            <h1 className="truncate text-base font-semibold text-stone-900">
              {title}
            </h1>

            <p className="mt-1 text-sm font-medium text-stone-500">
              {subtitle}
            </p>

            <p className="mt-2 text-sm font-semibold leading-6 text-blue-700">
              Recommendation: make a small pool with filters, then work through all study modes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
