import Link from "next/link";

export function TeacherReadingFitHeader() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Teacher Portal
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
          Teacher Review Index
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Finished books missing learner reflection signals. Use this index to find
          books that still need reader level, ease rating, or entertainment rating.
          Teacher placement ratings can move here later.
        </p>
      </div>

      <Link
        href="/teacher"
        className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
      >
        ← Teacher Home
      </Link>
    </div>
  );
}