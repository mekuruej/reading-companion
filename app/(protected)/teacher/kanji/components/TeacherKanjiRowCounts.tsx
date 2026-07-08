type TeacherKanjiRowCountsProps = {
  flaggedMapRowCount: number;
};

export default function TeacherKanjiRowCounts({
  flaggedMapRowCount,
}: TeacherKanjiRowCountsProps) {
  return (
    <div className="text-xs text-stone-600">
      {flaggedMapRowCount > 0 ? (
        <div className="font-semibold text-red-700">
          Flagged: {flaggedMapRowCount}
        </div>
      ) : (
        <div className="text-stone-400">No reader flags</div>
      )}
    </div>
  );
}
