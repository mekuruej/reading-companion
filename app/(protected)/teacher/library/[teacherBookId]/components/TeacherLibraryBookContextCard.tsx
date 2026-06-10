import Link from "next/link";

type TeacherLibraryBookContextBook = {
  title: string | null;
  author: string | null;
  cover_url: string | null;
};

type TeacherLibraryBookContextCardProps = {
  book: TeacherLibraryBookContextBook | null;
  teacherBookId: string;
  showAddMore: boolean;
  onAddMore: () => void;
};

export default function TeacherLibraryBookContextCard({
  book,
  teacherBookId,
  showAddMore,
  onAddMore,
}: TeacherLibraryBookContextCardProps) {
  return (
    <div className="mb-4 mt-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex min-w-0 items-center gap-4">
        {book?.cover_url ? (
          <img
            src={book.cover_url}
            alt=""
            className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
          />
        ) : (
          <div className="h-20 w-14 shrink-0 rounded-md bg-stone-200" />
        )}

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            For teaching book
          </p>
          <div className="truncate text-base font-semibold text-stone-900">
            {book?.title ?? "Untitled book"}
          </div>
          {book?.author ? (
            <p className="truncate text-sm text-stone-500">{book.author}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        {showAddMore ? (
          <button
            type="button"
            onClick={onAddMore}
            className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
          >
            Add More Items
          </button>
        ) : null}

        <Link
          href={`/teacher/library/${teacherBookId}/follow`}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          Follow-Along
        </Link>
      </div>
    </div>
  );
}