type TeacherStudentsEmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function TeacherStudentsEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: TeacherStudentsEmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <p className="text-lg font-black text-stone-900">{title}</p>

      {description ? (
        <p className="mt-2 text-sm text-stone-500">{description}</p>
      ) : null}

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}