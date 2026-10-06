import Link from "next/link";

import SubscriptionControls from "@/components/SubscriptionControls";

const readingAccessFeatures = [
  "Save vocabulary from books",
  "Review words and readings",
  "Use Follow-Along while reading",
  "Use Curiosity Reading",
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
                Japanese Learning
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
            Japanese Learning 🔒
          </p>
          <h2 className="mt-4 text-4xl font-black leading-tight text-stone-950 sm:text-5xl">
            Keep reading with MEKURU.
          </h2>

          <div className="mt-5 max-w-2xl">
            <p className="text-xl font-semibold leading-8 text-stone-900 sm:text-2xl">
              Get full access to MEKURU’s Japanese Learning Tools.
            </p>

            <p className="mt-2 text-base leading-7 text-stone-700 sm:text-lg">
              Track your reading, save vocabulary, and review the words and readings you
              encounter.
            </p>
          </div>

          <SubscriptionControls />

          <div className="mt-7 flex flex-wrap items-center gap-3">


            <Link
              href="/books"
              className="inline-flex rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md"
            >
              Back to my Library
            </Link>
          </div>

          <p className="mt-4 text-xs leading-5 text-stone-500">
            Manage your subscription, payment method, and billing details securely through Stripe.
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
            Want lesson support for Japanese reading?
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-700 sm:text-base">
            Japanese Learning gives you the tools to keep reading on your own. If
            you would like regular support, Devon also offers Japanese reading
            lessons 1-4 times per month, with term-based payments. Lessons are
            separate from Japanese Learning.
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
