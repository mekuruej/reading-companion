type TeacherKanjiStudentCellProps = {
  studentName: string;
  username: string | null;
};

export default function TeacherKanjiStudentCell({
  studentName,
  username,
}: TeacherKanjiStudentCellProps) {
  return (
    <>
      <div className="font-semibold text-stone-900">{studentName}</div>

      {username ? (
        <div className="text-xs text-stone-500">@{username}</div>
      ) : null}
    </>
  );
}