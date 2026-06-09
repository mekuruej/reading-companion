type TeacherKanjiRowCountsProps = {
  kanjiCount: number;
  mapRowCount: number;
  completePositionCount: number;
  incompleteRowCount: number;
  flaggedMapRowCount: number;
};

export default function TeacherKanjiRowCounts({
  kanjiCount,
  mapRowCount,
  completePositionCount,
  incompleteRowCount,
  flaggedMapRowCount,
}: TeacherKanjiRowCountsProps) {
  return (
    <div className="text-xs text-stone-600">
      <div>Kanji: {kanjiCount}</div>
      <div>Rows: {mapRowCount}</div>
      <div>Complete: {completePositionCount}</div>
      <div>Incomplete: {incompleteRowCount}</div>

      {flaggedMapRowCount > 0 ? (
        <div className="font-semibold text-red-700">
          Flagged: {flaggedMapRowCount}
        </div>
      ) : null}
    </div>
  );
}