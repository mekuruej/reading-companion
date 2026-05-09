// Book Clubs Coming Soon
//

import Link from "next/link";

export default function BookClubsComingSoonPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
            Coming soon
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Book Clubs
          </h1>

          <p className="mt-4 text-sm leading-7 opacity-80">
            Eventually, this space can help readers gather around a shared book, compare reading
            comfort, and make a Japanese book feel less lonely without turning reading into homework.
          </p>

          <div className="mt-5 rounded-2xl border border-white/70 bg-white/70 p-4 text-sm leading-6">
            <div className="font-black">Future ideas</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Small reading groups around one shared book</li>
              <li>Comfort and difficulty check-ins by chapter</li>
              <li>Shared discussion prompts without exposing private vocab</li>
              <li>Teacher-led clubs for trial lessons or class reading</li>
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/community"
              className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-100"
            >
              Back to Community
            </Link>

            <Link
              href="/community/profile"
              className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-100"
            >
              Open Profile
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
