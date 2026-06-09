type TeacherKanjiBookCellProps = {
  bookTitle: string;
};

export default function TeacherKanjiBookCell({
  bookTitle,
}: TeacherKanjiBookCellProps) {
  return (
    <div className="max-w-[240px] font-medium text-stone-800">
      {bookTitle}
    </div>
  );
}