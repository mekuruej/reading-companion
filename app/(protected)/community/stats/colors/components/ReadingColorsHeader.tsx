import Link from "next/link";

export default function ReadingColorsHeader() {
  return (
    <div className="mb-8">
      <Link
        href="/community/stats"
        className="text-sm font-bold text-stone-500 hover:text-stone-900"
      >
        ← Back to Stats Home
      </Link>

      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
        Study colors
      </p>

      <h1 className="mt-2 text-3xl font-black text-stone-900 sm:text-4xl">
        Reading Colors
      </h1>
    </div>
  );
}