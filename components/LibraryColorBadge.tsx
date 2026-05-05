// Library Color Badge
//

import type { LibraryStudyColorStatus } from "@/lib/libraryStudyColor";

type MekuruColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "grey"
  | "none";

type LibraryColorBadgeProps = {
  colorStatus?: LibraryStudyColorStatus | null;
  color?: MekuruColor | null;
  label?: string | null;
  size?: "sm" | "md";
};

function colorFromStatus(
  colorStatus?: LibraryStudyColorStatus | null,
  fallback?: MekuruColor | null
): MekuruColor {
  return colorStatus?.color ?? fallback ?? "grey";
}

function labelFromColor(color: MekuruColor) {
  if (color === "grey") return "Limbo";
  if (color === "none") return "Not ready";
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function dotClass(color: MekuruColor) {
  if (color === "red") return "bg-red-500";
  if (color === "orange") return "bg-orange-500";
  if (color === "yellow") return "bg-yellow-300";
  if (color === "green") return "bg-emerald-500";
  if (color === "blue") return "bg-sky-500";
  if (color === "purple") return "bg-violet-500";
  if (color === "grey") return "bg-slate-500";
  if (color === "none") return "bg-slate-300";

  return "bg-slate-300";
}

function badgeClass(color: MekuruColor, size: "sm" | "md") {
  const base =
    "inline-flex items-center rounded-full border bg-white font-semibold shadow-sm";

  const sizing =
    size === "sm"
      ? "gap-1.5 px-2.5 py-1 text-[11px]"
      : "gap-2 px-3 py-1.5 text-xs";

  if (color === "red") return `${base} ${sizing} border-red-100 text-red-700`;
  if (color === "orange") return `${base} ${sizing} border-orange-100 text-orange-800`;
  if (color === "yellow") return `${base} ${sizing} border-amber-100 text-amber-800`;
  if (color === "green") return `${base} ${sizing} border-emerald-100 text-emerald-800`;
  if (color === "blue") return `${base} ${sizing} border-sky-100 text-sky-800`;
  if (color === "purple") return `${base} ${sizing} border-violet-100 text-violet-800`;

  return `${base} ${sizing} border-slate-100 text-slate-600`;
}

export default function LibraryColorBadge({
  colorStatus,
  color,
  label,
  size = "sm",
}: LibraryColorBadgeProps) {
  const resolvedColor = colorFromStatus(colorStatus, color);
  const resolvedLabel = label ?? labelFromColor(resolvedColor);

  return (
    <span
      className={badgeClass(resolvedColor, size)}
      title={`Library Study color: ${resolvedLabel}`}
    >
      <span
        className={`inline-block rounded-full ${size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"} ${dotClass(
          resolvedColor
        )}`}
      />
      {resolvedLabel}
    </span>
  );
}