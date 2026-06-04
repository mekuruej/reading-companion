"use client";

import Link from "next/link";

export default function GlobalWordPageHeader() {
  return (
    <div>
      <Link href="/teacher" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
        ← Teacher Home
      </Link>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        Global vocabulary prep
      </p>

      <h1 className="mt-2 text-2xl font-semibold text-stone-900">
        Global Word Entry
      </h1>

      <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
        Prepare global vocabulary, cultural references, famous people, places, works,
        organizations, and Word Sky candidates before the global save flow is wired.
      </p>
    </div>
  );
}
