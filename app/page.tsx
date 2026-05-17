// MEKURU Landing Page

import Image from "next/image";
import Link from "next/link";
import AuthReturnRedirect from "@/components/AuthReturnRedirect";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-950">
      <AuthReturnRedirect />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: "url('/mekuru-home-photo.jpg')" }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-slate-100/70 backdrop-blur-[1px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[28rem] bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent"
      />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
              <Image
                src="/mekuru-logo.png"
                alt="MEKURU logo"
                width={200}
                height={200}
                className="h-full w-full object-contain p-1"
                priority
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 sm:text-sm">
                Reading-based language lessons & community
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                MEKURU
              </h1>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
          >
            Student Login
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-between gap-8 pt-8 sm:pt-10">
          <div className="max-w-4xl">
            <p className="mb-5 inline-flex rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              Real books. Real language. A reading community for language learners.
            </p>

            <h2 className="max-w-4xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Read more deeply.
              <br />
              Think more flexibly.
              <br />
              Keeping turning the page.
            </h2>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700">
              MEKURU is a language space for learners who want to build real
              communication through stories, books, conversation, vocabulary,
              and community.
            </p>
          </div>

          <div className="grid gap-4 pb-2 md:grid-cols-3">
            <Link
              href="/japanese"
              className="group flex min-h-[210px] flex-col justify-between rounded-[1.75rem] border border-slate-300 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
                  Japanese
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">
                  Read real Japanese with support
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Private reading lessons, vocabulary support, book clubs, and
                  real-text reading practice for Japanese learners.
                </p>
              </div>

              <p className="mt-6 text-sm font-bold text-slate-950 group-hover:underline">
                Japanese through real books →
              </p>
            </Link>

            <Link
              href="/english"
              className="group flex min-h-[210px] flex-col justify-between rounded-[1.75rem] border border-slate-300 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
                  English
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">
                  Build English through stories and conversation
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  English lessons for Japanese speakers, using stories, books,
                  personal experiences, and conversation to build natural
                  communication.
                </p>
              </div>

              <p className="mt-6 text-sm font-bold text-slate-950 group-hover:underline">
                English through stories & conversation →
              </p>
            </Link>

            <Link
              href="/reading-companion"
              className="group flex min-h-[210px] flex-col justify-between rounded-[1.75rem] border border-slate-400 bg-slate-700 p-6 text-white shadow-md transition hover:-translate-y-1 hover:bg-slate-800 hover:shadow-xl"
            >
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-200">
                  Japanese Student App
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight">
                  Continue your MEKURU reading practice
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Current Japanese-reading students can track books, save vocabulary,
                  review words, and continue reading between lessons.
                </p>
              </div>

              <p className="mt-6 text-sm font-bold group-hover:underline">
                App explanation →
              </p>
            </Link>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-300 py-5 text-sm text-slate-500">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p>© MEKURU</p>
              <p className="text-xs text-slate-500">
                Background photo by{" "}
                <a
                  href="https://www.pexels.com/@hakannural/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-slate-900"
                >
                  Hakan Nural
                </a>{" "}
                via Pexels.
              </p>
            </div>

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
