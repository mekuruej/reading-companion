type SaveBarProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export default function SaveBar({
  label,
  onClick,
  disabled = false,
}: SaveBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
      >
        {label}
      </button>
    </div>
  );
}