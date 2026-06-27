import Link from "next/link";

type TeacherStudentsHeaderProps = {
  backHref?: string;
  backLabel?: string;
};

export default function TeacherStudentsHeader({
  backHref = "/teacher",
  backLabel = "← Teacher Home",
}: TeacherStudentsHeaderProps) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Teacher Workspace
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
            My students
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Choose a learner, open their library, check assigned books, and
            eventually keep lesson notes and student-specific reading stats in
            one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={backHref}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
