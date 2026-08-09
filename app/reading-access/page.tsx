import Link from "next/link";

const kofiReadingAccessUrl =
  process.env.NEXT_PUBLIC_KOFI_READING_ACCESS_URL;

const readingAccessFeatures = [
  "Save vocabulary from books",
  "Review words with flashcards",
  "Use Follow-Along supported reading",
  "Use Curiosity Reading / Save Words",
  "View vocabulary lists",
  "View Reading History",
  "See book stats",
  "Keep using personal reading tools after trial",
];

export default function ReadingAccessPage() {
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

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[28rem] bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent"
      />

      <div className="relative z-10 mx-auto max-w-4xl space-y-8 px-6 py-8 sm:px-8 lg:px-10">
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
                Reading Access
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

        <section className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-lg shadow-slate-300/30 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-600">
            Reading Access
          </p>
          <h2 className="mt-4 text-4xl font-black leading-tight text-stone-950 sm:text-5xl">
            Keep reading with MEKURU.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
            Reading Access is the ¥500/month MEKURU app tools option for
            independent readers who want to keep saving vocabulary, reviewing
            words, and tracking their reading after a trial.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {kofiReadingAccessUrl ? (
              <a
                href={kofiReadingAccessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-700 hover:shadow-md"
              >
                Join Reading Access on Ko-fi
              </a>
            ) : (
              <span className="inline-flex cursor-not-allowed rounded-2xl border border-stone-200 bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-500">
                Ko-fi link coming soon
              </span>
            )}

            <Link
              href="/books"
              className="inline-flex rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md"
            >
              Back to my Library
            </Link>
          </div>

          <p className="mt-4 text-xs leading-5 text-stone-500">
            After joining on Ko-fi, your MEKURU access will be updated manually.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {readingAccessFeatures.map((feature) => (
            <div
              key={feature}
              className="rounded-3xl border border-violet-100 bg-violet-50/80 p-5 shadow-sm"
            >
              <p className="text-sm font-black leading-6 text-stone-950">
                {feature}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white/85 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">
            Separate lesson option
          </p>
          <h2 className="mt-3 text-2xl font-black text-stone-950">
            Want guided reading support?
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-700 sm:text-base">
            Reading Access gives you the tools to keep reading on your own. If
            you would like regular support, Devon also offers Japanese reading
            lessons 1-4 times per month, with term-based payments. Lessons are
            separate from Reading Access.
          </p>
          <Link
            href="/japanese"
            className="mt-5 inline-flex rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md"
          >
            See Japanese Reading Lessons
          </Link>
        </section>
      </div>
    </main>
  );
}
