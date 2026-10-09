"use client";

import Link from "next/link";

import SubscriptionControls from "@/components/SubscriptionControls";

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
                Subscription &amp; Access
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
          <SubscriptionControls />

          <Link
            href="/books"
            className="mt-7 inline-flex rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md"
          >
            Back to my Library
          </Link>

        </section>
      </div>
    </main>
  );
}
