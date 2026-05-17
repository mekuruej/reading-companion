// MEKURU Reading Companion Page
//

import Link from "next/link";

export default function ReadingCompanionPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url('/mekuru-home-photo.jpg')" }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-slate-100/85 backdrop-blur-[1px]"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
              <img
                src="/mekuru-logo.png"
                alt="MEKURU logo"
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 sm:text-sm">
                MEKURU
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Reading Companion
              </h1>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
          >
            Home
          </Link>
        </header>

        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-300 bg-white/90 p-8 shadow-xl shadow-slate-300/40">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            MEKURU
          </p>

          <h2 className="mt-3 text-4xl font-black">
            MEKURU Reading Companion Web App
          </h2>

          <p className="mt-4 leading-7 text-slate-700">
            The MEKURU reading companion is currently available for Japanese
            reading students and book club members. Students can use it to track
            books, save vocabulary, review words, and continue reading between
            lessons.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-950">
              Standalone access is not open yet.
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Independent Japanese readers can join the future beta waitlist while
              the system continues to develop.
            </p>

            <a
              href="https://forms.gle/5QLgohvkNvDBzTuH9"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
            >
              Join the beta waitlist
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
            >
              Back to MEKURU
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-lg"
            >
              Student Login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}