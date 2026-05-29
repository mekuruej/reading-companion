type BookVocabRepeatCountCellProps = {
  repeatCount: number;
};

// Visual cell for book-specific repeat counts.
// page.tsx still calculates the repeat count; this component only decides
// whether to show the number in the table.
export default function BookVocabRepeatCountCell({
  repeatCount,
}: BookVocabRepeatCountCellProps) {
  return (
    <td className="p-2 text-center text-xs text-gray-600">
      {repeatCount > 1 ? repeatCount : ""}
    </td>
  );
}