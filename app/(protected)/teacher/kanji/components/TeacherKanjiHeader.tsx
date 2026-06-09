import Link from "next/link";

type TeacherKanjiHeaderProps = {
  homeHref: string;
};

export default function TeacherKanjiHeader({
  homeHref,
}: TeacherKanjiHeaderProps) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Teacher Workbench
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            Kanji Enrichment Queue
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Review saved vocabulary that needs kanji-reading enrichment. Work through
            students and books from one teacher page instead of jumping between Book Hubs.
          </p>
        </div>

        <Link
          href={homeHref}
          className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          ← Teacher Home
        </Link>
      </div>
    </section>
  );
}