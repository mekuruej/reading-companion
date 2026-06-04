"use client";

import Link from "next/link";

export default function GlobalWordPageHeader() {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <Link href="/teacher" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        ← Teacher Home
      </Link>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        Global vocabulary prep
      </p>

      <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
        Global Word Entry
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        Prepare global vocabulary, cultural references, famous people, places, works,
        organizations, and Word Sky candidates before the global save flow is wired.
      </p>
    </section>
  );
}
