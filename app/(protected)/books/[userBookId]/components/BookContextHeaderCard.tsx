type BookContextHeaderCardProps = {
  eyebrow?: string;
  title: string;
  coverUrl?: string | null;
  contextLine?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onOpenBookHub?: () => void;
};

export default function BookContextHeaderCard({
  eyebrow = "For book",
  title,
  coverUrl,
  contextLine,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onOpenBookHub,
}: BookContextHeaderCardProps) {
  return (
    <div className="mb-4 mt-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <button
        type="button"
        onClick={onOpenBookHub}
        disabled={!onOpenBookHub}
        className="flex min-w-0 items-center gap-4 rounded-xl text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:cursor-default disabled:hover:opacity-100"
        title={onOpenBookHub ? `Go to ${title} Book Hub` : title}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            aria-hidden="true"
            className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
          />
        ) : null}

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            {eyebrow}
          </p>

          <div className="truncate text-base font-semibold text-stone-900">
            {title}
          </div>

          {contextLine ? (
            <p className="mt-1 text-sm font-medium text-stone-500">
              {contextLine}
            </p>
          ) : null}
        </div>
      </button>

      {(primaryActionLabel && onPrimaryAction) ||
      (secondaryActionLabel && onSecondaryAction) ? (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {secondaryActionLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              {secondaryActionLabel}
            </button>
          ) : null}

          {primaryActionLabel && onPrimaryAction ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              {primaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}