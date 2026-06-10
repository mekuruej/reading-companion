import Link from "next/link";

type TeacherLibraryBookHeaderProps = {
  teacherBookId: string;
  showFollowLink: boolean;
};

export default function TeacherLibraryBookHeader({
  teacherBookId,
  showFollowLink,
}: TeacherLibraryBookHeaderProps) {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/teacher/library"
          className="text-sm font-semibold text-stone-500 hover:text-stone-900"
        >
          &larr; Teacher Library
        </Link>

        {showFollowLink ? (
          <Link
            href={`/teacher/library/${teacherBookId}/follow`}
            className="text-sm font-semibold text-stone-500 hover:text-stone-900"
          >
            Follow-Along
          </Link>
        ) : null}
      </div>

      <h1 className="mt-4 text-2xl font-semibold text-stone-900">Prep Add</h1>
    </>
  );
}