"use client";

import Link from "next/link";

export default function GlobalWordPageHeader() {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <Link href="/teacher/general-upkeep" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        ← General Upkeep
      </Link>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        Global upkeep
      </p>

      <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
        Global Word Entry
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        Prepare global vocabulary, cultural references, famous people, places, works,
        organizations, and Word Sky candidates one careful entry at a time.
      </p>

      <p className="mt-2 max-w-2xl text-xs leading-5 text-amber-700">
        Saves global vocabulary-cache entries only. Word Sky approval stays separate and limited to N5-N3 words.
      </p>
    </section>
  );
}
