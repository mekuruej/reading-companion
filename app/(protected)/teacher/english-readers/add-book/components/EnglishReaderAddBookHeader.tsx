import Link from "next/link";

export default function EnglishReaderAddBookHeader() {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <Link
        href="/teacher/english-readers"
        className="text-sm font-semibold text-stone-500 transition hover:text-stone-900"
      >
        Back to English Readers
      </Link>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        English Readers
      </p>

      <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
        Add English Book
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        Create a manual English book record for teacher-prepared Japanese support.
      </p>
    </section>
  );
}
