import type {
  LibraryStudyColor,
  LibraryStudyColorStatus,
} from "@/lib/libraryStudyColor";

type BookVocabLibraryStudyStatusBadgeProps = {
  status: LibraryStudyColorStatus;
  showNumbers: boolean;
  encounterCount: number;
};

function colorLabel(color: LibraryStudyColor) {
  if (color === "none") return "No color yet";

  return color.charAt(0).toUpperCase() + color.slice(1);
}

function badgeColorClass(color: LibraryStudyColor) {
  if (color === "red") return "border-red-800 bg-red-600 text-white";
  if (color === "orange") return "border-orange-700 bg-orange-400 text-stone-950";
  if (color === "yellow") return "border-yellow-500 bg-yellow-300 text-stone-900";
  if (color === "green") return "border-green-800 bg-green-600 text-white";
  if (color === "blue") return "border-blue-800 bg-blue-600 text-white";
  if (color === "purple") return "border-purple-800 bg-purple-600 text-white";
  if (color === "grey") return "border-slate-700 bg-slate-500 text-white";

  return "border-stone-400 bg-stone-300 text-stone-700";
}

// Fallback Library Study badge for words without shared color lookup info.
// page.tsx still calculates the status and encounter count; this component only
// turns that already-computed status into the small visual badge shown in the row.
export default function BookVocabLibraryStudyStatusBadge({
  status,
  showNumbers,
  encounterCount,
}: BookVocabLibraryStudyStatusBadgeProps) {
  const showStageNumber =
    showNumbers &&
    status.stageNumber != null &&
    status.stageCount != null &&
    status.stageCount > 1;

  const title = [
    `${colorLabel(status.color)}${showStageNumber ? ` ${status.stageNumber}` : ""}`,
    status.reason,
    `${encounterCount} encounter${encounterCount === 1 ? "" : "s"} across saved books`,
  ].join(" · ");

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold shadow-sm ${badgeColorClass(
        status.color
      )} ${showStageNumber ? "h-6 min-w-6 px-1.5" : "h-4 w-4"}`}
    >
      {showStageNumber ? status.stageNumber : ""}
    </span>
  );
}