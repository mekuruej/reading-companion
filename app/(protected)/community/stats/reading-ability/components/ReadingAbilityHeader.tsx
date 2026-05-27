import Link from "next/link";

export default function ReadingAbilityHeader({
  pageHeaderTone,
}: {
  pageHeaderTone: string;
}) {
  return (
    <div>
      <Link
        href="/community/stats"
        className="text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        ← Back to Stats Home
      </Link>

      <div
        className={`mt-5 rounded-3xl border-2 p-5 shadow-sm ${pageHeaderTone}`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Reading Ability
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
          Reading Ability
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          Pace, support, difficulty, and reader-fit patterns from your reading
          life.
        </p>
      </div>
    </div>
  );
}