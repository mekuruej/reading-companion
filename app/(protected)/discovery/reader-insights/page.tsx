// Reader Insights Coming Soon
//

import Link from "next/link";

export default function ReaderInsightsComingSoonPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-violet-950 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
            Coming soon
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Reader Insights
          </h1>

          <p className="mt-4 text-sm leading-7 opacity-80">
            Eventually, this space can help you discover books through anonymous
            reading comfort, difficulty, and rating patterns from readers around
            your level.
          </p>

          <div className="mt-5 rounded-2xl border border-white/70 bg-white/70 p-4 text-sm leading-6">
            <div className="font-black">Future ideas</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Books that felt comfortable for readers around your level</li>
              <li>Average comfort and difficulty ratings</li>
              <li>Commonly saved words by book</li>
              <li>Completion patterns for different book types</li>
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/discovery"
              className="rounded-2xl border border-violet-200 bg-white px-5 py-3 text-sm font-semibold text-violet-950 shadow-sm transition hover:bg-violet-100"
            >
              Back to Discovery
            </Link>

            <Link
              href="/discovery/dictionary"
              className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-100"
            >
              Open Dictionary
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}