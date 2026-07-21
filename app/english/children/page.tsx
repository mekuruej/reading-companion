// Children's English Lessons

import Link from "next/link";

export default function EnglishChildrenPage() {
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
          <Link href="/english" className="flex items-center gap-4">
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
                English for Children
              </h1>
            </div>
          </Link>

          <Link
            href="/english"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
          >
            English Lessons
          </Link>
        </header>

        <section className="space-y-4 text-center">
          <p className="text-sm font-semibold text-[#6b6257]">
            ストーリーから始まる英語。
          </p>
          <h2 className="whitespace-pre-line text-3xl font-semibold md:text-5xl">
            {"子どものための\nプライベート\n英語レッスン"}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-[#4f473d]">
            小学生・中学生向け · オンラインレッスン
          </p>
          <p className="mx-auto max-w-2xl text-base leading-7 text-[#4f473d]">
            アメリカ出身の英語講師として、17年以上日本で英語を教えてきました。
          </p>
          <div className="pt-4">
            <button
              type="button"
              className="inline-block rounded-2xl bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-700"
            >
              体験レッスン事前フォームへ
            </button>
          </div>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-[#6b6257]">
            まずは、お子さまの年齢や英語学習歴、現在のレベル、ご希望について、簡単な事前フォームにご回答ください。
            内容を確認後、体験レッスンの日程をご予約いただけるリンクをメールでお送りします。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">物語を読むことを中心に進める英語レッスンです。</h2>
          <p className="text-base leading-7 text-[#4f473d]">
            私は、本を読むことが英語を好きになる大切なきっかけだと考えています。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            レッスンでは、物語を一緒に読みながら、英語で読む習慣を身につけ、
            語彙力や読解力を少しずつ育てていきます。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            読む力が育つことで、自分の考えや気持ちを英語で伝える自信も育っていきます。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            レッスンでは、英語の本を読むことを中心に、会話や学習サポートも取り入れながら進めます。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            お子さまのレベルや興味に合わせて本を選び、必要なときは日本語でも説明を行います。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            継続して読むことで、英語の文章に少しずつ慣れ、将来の学校の勉強や英検、
            さらにその先の英語学習にもつながる土台を育てます。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">レッスンで育てたい力</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[#4f473d]">
              <li>• 物語を通して出会う語彙力</li>
              <li>• 英文を読むことに少しずつ慣れる力</li>
              <li>• 英語で読む習慣</li>
              <li>• 自分の考えや気持ちを英語で伝える自信</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">レッスン内容</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[#4f473d]">
              <li>• 英語の本を一緒に読む</li>
              <li>• 読んだ内容について英語で話す</li>
              <li>• 必要に応じた語彙・文法のサポート</li>
              <li>• わからないところは日本語でも説明</li>
            </ul>
          </div>
        </section>

        <section className="mt-16 space-y-4">
          <h2 className="text-2xl font-semibold">レッスンの基本情報</h2>
          <div className="space-y-4 text-sm text-stone-700">
            <div>
              <p className="font-medium">対象</p>
              <p>小学生・中学生</p>
            </div>
            <div>
              <p className="font-medium">レッスン形式</p>
              <p>オンラインレッスン</p>
            </div>
            <div>
              <p className="font-medium">体験レッスン</p>
              <p>事前フォームの内容を確認後、日程予約リンクをメールでお送りします。</p>
            </div>
          </div>
        </section>

        <section className="mt-16 space-y-4">
          <h2 className="text-2xl font-semibold">Tuition</h2>

          <div className="space-y-3 text-stone-700">
            <p>
              <span className="font-medium">Term payments</span> from{" "}
              <strong>¥**** per term</strong>
            </p>

            <p>
              <span className="font-medium">Monthly installments</span> from{" "}
              <strong>¥**** per month</strong>
            </p>
          </div>

          <p className="text-sm text-stone-600">
            Four lesson plans are available to fit different schedules and budgets.
          </p>

          <p className="text-xs text-stone-500">
            Detailed pricing is provided after your free trial session.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-6 pt-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">講師について</h2>
            <img
              src="/devon.jpg"
              alt="Devon - English teacher"
              className="mx-auto mb-4 w-full max-w-sm rounded-2xl object-cover shadow-md md:float-left md:mb-4 md:mr-6"
            />
            <p className="text-base leading-7 text-[#4f473d]">
              コロラド州デンバー出身で、現在は山梨県北杜市に住んでいます。
              日本で17年以上、子どもから大人まで英語を教えてきました。
            </p>
            <p className="text-base leading-7 text-[#4f473d]">
              一人ひとりに合う学び方は違います。子どもの英語レッスンでは、
              無理に急がず、英語に継続して触れること、そして読むことを通して少しずつ自信を育てることを大切にしています。
            </p>
            <p className="text-base leading-7 text-[#4f473d]">
              間違いを恐れずに英語に触れられる環境を作りながら、お子さまに合ったペースで進めていきます。
            </p>
            <div className="clear-both" />
          </div>
        </section>

        <div className="pt-2 text-center">
          <button
            type="button"
            className="inline-block rounded-2xl bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-700"
          >
            体験レッスン事前フォームへ
          </button>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6b6257]">
            まずは、お子さまの年齢や英語学習歴、現在のレベル、ご希望について、簡単な事前フォームにご回答ください。
            内容を確認後、体験レッスンの日程をご予約いただけるリンクをメールでお送りします。
          </p>
        </div>

        <footer className="mt-16 border-t border-stone-200">
          <div className="mt-12 space-x-4 text-center text-xs text-stone-500">
            <Link href="/english" className="hover:underline">
              English Lessons
            </Link>
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
