"use client";

import Link from "next/link";

export default function StatsComingSoonPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Coming Soon
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Full Stats</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
          A fuller Mekuru stats page is on the way. It will hold the richer charts and reading-life
          views without crowding the calmer Library snapshot.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-medium text-slate-900">Planned for this page</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Reading rhythm and consistency views</li>
            <li>Fluid, curiosity, and listening time breakdowns</li>
            <li>Books that flowed and books that pushed back</li>
            <li>Book type, pace, and author patterns</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/books"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Back to My Library
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
