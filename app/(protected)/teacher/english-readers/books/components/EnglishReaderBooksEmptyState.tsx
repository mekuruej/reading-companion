import Link from "next/link";

export default function EnglishReaderBooksEmptyState() {
  return (
    <section className="rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        No English Reader books yet
      </p>
      <h2 className="mt-3 text-2xl font-black text-stone-900">
        Start with one manual English book.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600">
        Add a teacher-managed English book first, then prepare Japanese support from the existing Teacher Workspace.
      </p>
      <Link
        href="/teacher/english-readers/add-book"
        className="mt-5 inline-flex rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-stone-800"
      >
        Add English Book
      </Link>
    </section>
  );
}
