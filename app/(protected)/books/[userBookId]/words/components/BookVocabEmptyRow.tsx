type BookVocabEmptyRowProps = {
  colSpan?: number;
};

// Empty table row shown when the current filters hide all saved words.
// The page still decides when the list is empty; this component only renders the message.
export default function BookVocabEmptyRow({
  colSpan = 10,
}: BookVocabEmptyRowProps) {
  return (
    <tr>
      <td className="p-4 text-gray-500" colSpan={colSpan}>
        No words match your filters.
      </td>
    </tr>
  );
}