import Link from "next/link";

type TeacherRatingsHeaderProps = {
  backHref?: string;
  backLabel?: string;
};

export function TeacherRatingsHeader({
  backHref = "/teacher",
  backLabel = "← Teacher Hub",
}: TeacherRatingsHeaderProps) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <Link href={backHref} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        {backLabel}
      </Link>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        Lesson planning
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
        Teacher Ratings
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
        Compare teacher-facing book ratings, notes, and learner-fit signals so
        useful lesson books are easier to find again.
      </p>
    </section>
  );
}
