type ColorDeltaPillProps = {
  value: number | null;
  // The page passes the color-specific classes so color meaning stays page-owned.
  className: string;
};

export default function ColorDeltaPill({
  value,
  className,
}: ColorDeltaPillProps) {
  if (value == null) return null;

  const icon = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  const label = value > 0 ? `+${value}` : String(value);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black shadow-sm ${className}`}
    >
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </span>
  );
}