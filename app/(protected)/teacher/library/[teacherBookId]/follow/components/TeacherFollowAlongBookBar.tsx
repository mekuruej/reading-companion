import Link from "next/link";

type TeacherFollowAlongBook = {
  title: string | null;
  author: string | null;
  cover_url: string | null;
};

type TeacherFollowAlongBookBarProps = {
  teacherBookId: string;
  book: TeacherFollowAlongBook | null;
};

export function TeacherFollowAlongBookBar({
  teacherBookId,
  book,
}: TeacherFollowAlongBookBarProps) {
  return (
    <div className="mb-4 mt-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <Link
        href={`/teacher/library/${teacherBookId}`}
        className="flex min-w-0 items-center gap-4 rounded-xl text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400"
      >
        {book?.cover_url ? (
          <img
            src={book.cover_url}
            alt=""
            className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
          />
        ) : null}

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            For teaching book
          </p>
          <div className="truncate text-base font-semibold text-stone-900 hover:text-stone-700">
            {book?.title ?? "Untitled book"}
          </div>
          {book?.author ? (
            <p className="truncate text-sm text-stone-500">{book.author}</p>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Link
          href={`/teacher/library/${teacherBookId}`}
          className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
        >
          Prep Add
        </Link>
        <Link
          href="/teacher/library"
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          Teacher Library
        </Link>
      </div>
    </div>
  );
}