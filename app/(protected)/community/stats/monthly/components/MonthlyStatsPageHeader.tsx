import Link from "next/link";

export default function MonthlyStatsPageHeader() {
  return (
    <div className="mb-8">
      <Link
        href="/community/stats"
        className="text-sm font-bold text-stone-500 hover:text-stone-900"
      >
        ← Back to Stats Home
      </Link>

      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
        Monthly stats
      </p>

      <h1 className="mt-2 text-3xl font-black text-stone-900 sm:text-4xl">
        Monthly Details
      </h1>

      <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
        A colorful snapshot of this month’s reading rhythm: pages, time,
        listening, saved words, and the kinds of books you spent time with.
      </p>
    </div>
  );
}