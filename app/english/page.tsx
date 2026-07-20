// English Lessons Hub

import Link from "next/link";

export default function EnglishPage() {
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

      <div className="relative z-10 mx-auto max-w-5xl space-y-12 px-6 py-8 sm:px-8 lg:px-10">
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

        <section className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            Personalized English lessons
          </p>
          <h2 className="text-3xl font-semibold md:text-5xl">
            英語レッスン
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-[#4f473d]">
            MEKURUでは、子ども向けの英語レッスンと、大人向けの英会話レッスンを行っています。
          </p>
          <p className="mx-auto max-w-2xl text-base leading-7 text-[#4f473d]">
            一人ひとりの年齢、レベル、目的に合わせて、無理なく続けられるレッスンを大切にしています。
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-slate-300/30">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              PRIVATE ENGLISH LESSONS FOR CHILDREN
            </p>
            <h3 className="mt-3 text-2xl font-black text-stone-950">
              子どものための英語レッスン
            </h3>
            <p className="mt-3 text-base font-semibold leading-7 text-[#2f2a24]">
              ストーリーや読書を大切にした、小学生・中学生向けのオンライン英語レッスンです。
            </p>
            <p className="mt-4 text-sm leading-6 text-[#4f473d]">
              英語で読む習慣を育てながら、語彙力、読解力、そして自分の考えを英語で伝える自信につなげていきます。
            </p>
            <Link
              href="/english/children"
              className="mt-6 inline-flex rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
            >
              子どもの英語レッスンを見る
            </Link>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-slate-300/30">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              PRIVATE ENGLISH CONVERSATION LESSONS FOR ADULTS
            </p>
            <h3 className="mt-3 text-2xl font-black text-stone-950">
              大人のための英会話レッスン
            </h3>
            <p className="mt-3 text-base font-semibold leading-7 text-[#2f2a24]">
              一人ひとりのレベルや目的に合わせて、英語でたくさん話すことを大切にしたレッスンです。
            </p>
            <p className="mt-4 text-sm leading-6 text-[#4f473d]">
              必要なときは日本語で説明やサポートを行います。文法、英検、お持ちの教材、英語についての質問にも対応します。
            </p>
            <Link
              href="/english/adults"
              className="mt-6 inline-flex rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
            >
              大人の英会話レッスンを見る
            </Link>
          </article>
        </section>

        <section className="mt-12 rounded-3xl border border-stone-200 bg-white/80 p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-900">
            英語レッスンやMEKURUについてのご質問
          </p>
          <p className="mt-2 text-sm text-stone-600">
            Contact:{" "}
            <a
              href="mailto:mekuru.ej@gmail.com"
              className="font-semibold underline underline-offset-4 hover:text-stone-900"
            >
              mekuru.ej@gmail.com
            </a>
          </p>
        </section>

        <footer className="mt-16 border-t border-stone-200">
          <div className="mt-12 space-x-4 text-center text-xs text-stone-500">
            <Link href="/legal" className="hover:underline">
              Commercial Disclosure
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
