type LearningTaskAction = {
  href: string;
  label: string;
};

type LearningTaskCardProps = {
  title: string;
  typeLabel: string;
  instructions: string | null;
  details: string[];
  action: LearningTaskAction | null;
  canComplete: boolean;
  isCompleting: boolean;
  onOpenAction: (href: string) => void;
  onComplete: () => void;
};

export default function LearningTaskCard({
  title,
  typeLabel,
  instructions,
  details,
  action,
  canComplete,
  isCompleting,
  onOpenAction,
  onComplete,
}: LearningTaskCardProps) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-left shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>

          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            {typeLabel}
          </div>

          {instructions ? (
            <div className="mt-1 text-xs leading-5 text-slate-600">
              {instructions}
            </div>
          ) : null}
        </div>

        <div className="text-xs font-semibold text-emerald-700">
          {details.join(" · ")}
        </div>
      </div>

      {action || canComplete ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {action ? (
            <button
              type="button"
              onClick={() => onOpenAction(action.href)}
              className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-900"
            >
              {action.label}
            </button>
          ) : null}

          {canComplete ? (
            <button
              type="button"
              onClick={onComplete}
              disabled={isCompleting}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              {isCompleting ? "Marking..." : "Mark done"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}