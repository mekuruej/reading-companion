// English Lessons Placeholder Page

import Image from "next/image";
import Link from "next/link";

export default function EnglishPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: "url('/mekuru-home-photo.jpg')" }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-slate-100/75 backdrop-blur-[1px]"
      />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
              <Image
                src="/mekuru-logo.png"
                alt="MEKURU logo"
                width={56}
                height={56}
                className="h-full w-full object-contain p-1"
                priority
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 sm:text-sm">
                MEKURU
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                English Lessons
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

        <section className="flex flex-1 items-center py-16">
          <div className="w-full rounded-[2rem] border border-slate-300 bg-white/90 p-6 shadow-xl shadow-slate-300/40 sm:p-8">
            <p className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              English through stories & conversation
            </p>

            <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              English lessons are coming soon.
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
              This page is still being prepared. MEKURU English lessons will focus
              on natural communication through stories, books, personal experiences,
              and conversation.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-black text-slate-950">
                  For children
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Story-rich lessons with reading, questions, comprehension,
                  and meaningful English input.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-black text-slate-950">
                  For teens and adults
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Conversation practice built around interests, topics, books,
                  life experiences, and personal stories.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:mekuru.ej@gmail.com"
                className="rounded-2xl bg-slate-800 px-5 py-3 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-lg"
              >
                Contact MEKURU
              </a>

              <Link
                href="/japanese"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
              >
                Japanese Reading Lessons
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-300 py-5 text-sm text-slate-500">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>© MEKURU</p>
            <div className="flex gap-4">
              <Link href="/legal" className="hover:text-slate-900">
                Legal
              </Link>
              <Link href="/terms" className="hover:text-slate-900">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-slate-900">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}