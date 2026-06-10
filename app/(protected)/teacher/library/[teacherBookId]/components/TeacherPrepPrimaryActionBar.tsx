type TeacherPrepPrimaryActionBarProps = {
  label: string;
  loadingLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export default function TeacherPrepPrimaryActionBar({
  label,
  loadingLabel,
  isLoading = false,
  disabled = false,
  onClick,
}: TeacherPrepPrimaryActionBarProps) {
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className="w-full rounded-2xl border border-emerald-700 bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {isLoading && loadingLabel ? loadingLabel : label}
      </button>
    </div>
  );
}