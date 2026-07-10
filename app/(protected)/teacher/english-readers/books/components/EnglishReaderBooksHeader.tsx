import Link from "next/link";

type EnglishReaderBooksHeaderProps = {
  count: number;
};

export default function EnglishReaderBooksHeader({
  count,
}: EnglishReaderBooksHeaderProps) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <Link
        href="/teacher/english-readers"
        className="text-sm font-semibold text-stone-500 transition hover:text-stone-900"
      >
        Back to English Readers
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            English Readers
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
            Manage English Reader Books
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Teacher-managed English books for Japanese support and linked learner work.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-stone-600">
            {count} {count === 1 ? "book" : "books"}
          </span>
          <Link
            href="/teacher/english-readers/add-book"
            className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-stone-800"
          >
            Add Book
          </Link>
        </div>
      </div>
    </section>
  );
}
