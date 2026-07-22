// Adult English Conversation Lessons

import Link from "next/link";

const TRIAL_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdOLSjK2XmYrajjWCuX2OFxvTXmzmdzJDOstr9x4A9cLYOnuA/viewform?usp=header";

export default function EnglishAdultsPage() {
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
                Adult English Conversation
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
            好奇心から始まる英会話。
          </p>
          <h2 className="whitespace-pre-line text-3xl font-semibold md:text-5xl">
            {"大人のための\nプライベート\n英会話レッスン"}
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-[#4f473d]">
            アメリカ出身の英語講師として、17年以上日本で英語を教えてきました。
          </p>
          <div className="pt-4">
            <a
              href={TRIAL_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-2xl border border-stone-900 bg-white px-6 py-3 text-base font-semibold text-stone-950 shadow-sm hover:bg-emerald-50 hover:shadow-md"
            >
              体験レッスンについて相談する
            </a>
          </div>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-[#6b6257]">
            まずは、現在の英語レベルや学習目的、ご希望について、簡単な事前フォームにご回答ください。
            内容を確認後、体験レッスンの日程をご予約いただけるリンクをメールでお送りします。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">たくさん話すことを大切にした英会話レッスンです。</h2>
          <p className="text-base leading-7 text-[#4f473d]">
            私は、英語はたくさん話すことで少しずつ身についていくと考えています。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            レッスンでは、一人ひとりのレベルや目的に合わせて、英語でたくさん会話をします。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            言葉がすぐに出てこなかったり、間違えたりしても大丈夫です。実際に英語を使いながら、
            少しずつ自信を育てていきます。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            文法の勉強や英検対策、英語についてわからないことがあれば、お気軽にご相談ください。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            お持ちの教材や宿題、レッスンで聞きたい英語の質問を持ち込んでいただくこともできます。
          </p>
          <p className="text-base leading-7 text-[#4f473d]">
            レッスンは英語で会話をしながら進めます。必要なときは日本語で説明やサポートを行うので、
            安心してご参加ください。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">レッスンの進め方</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[#4f473d]">
              <li>• リラックスして話せる雰囲気</li>
              <li>• 会話を中心にしたレッスン</li>
              <li>• レベルや目的に合わせた内容</li>
              <li>• 必要なときは日本語で説明やサポート</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">持ち込みできる内容</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[#4f473d]">
              <li>• 文法の質問</li>
              <li>• 英検対策</li>
              <li>• 宿題やお持ちの教材</li>
              <li>• 英語について気になっていること</li>
            </ul>
          </div>
        </section>

        <section className="mt-16 space-y-4">
          <h2 className="text-2xl font-semibold">レッスンの基本情報</h2>
          <div className="space-y-4 text-sm text-stone-700">
            <div>
              <p className="font-medium">対象</p>
              <p>大人向け</p>
            </div>
            <div>
              <p className="font-medium">レッスン形式</p>
              <p>オンライン / 山梨県北杜市での対面レッスン</p>
            </div>
            <div>
              <p className="font-medium">体験レッスン</p>
              <p>事前フォームの内容を確認後、日程予約リンクをメールでお送りします。</p>
            </div>
          </div>
        </section>

        <section className="mt-16 space-y-4">
          <h2 className="text-2xl font-semibold">料金について</h2>

          <div className="space-y-3 text-stone-700">
            <p>
              <span className="font-medium">ターム払い</span>は{" "}
              <strong>1ターム¥8,000から</strong>
            </p>

            <p>
              <span className="font-medium">月払い</span>は{" "}
              <strong>月¥4,000から</strong>
            </p>
          </div>

          <p className="text-sm text-stone-600">
            スケジュールやご予算に合わせて、4つのレッスンプランをご用意しています。
          </p>

          <p className="text-xs text-stone-500">
            詳しい料金は体験レッスン後にご案内します。
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-6 pt-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold">講師について</h2>
            <img
              src="/devon.jpg"
              alt="Devon - English conversation teacher"
              className="mx-auto mb-4 w-full max-w-sm rounded-2xl object-cover shadow-md md:float-left md:mb-4 md:mr-6"
            />
            <p className="text-base leading-7 text-[#4f473d]">
              コロラド州デンバー出身で、現在は山梨県北杜市に住んでいます。
              日本で17年以上、子どもから大人まで英語を教えてきました。
            </p>
            <p className="text-base leading-7 text-[#4f473d]">
              一人ひとりに合う学び方は違います。たくさん自由に話したい方もいれば、
              文法や英検、教材を使ったサポートがある方が安心できる方もいます。
            </p>
            <p className="text-base leading-7 text-[#4f473d]">
              継続して英語を使うことで、自信は少しずつ育っていきます。
              間違いを恐れずに話せる環境を大切にしながら、続けやすいレッスンの形を一緒に探していきます。
            </p>
            <div className="clear-both" />
          </div>
        </section>

        <div className="pt-2 text-center">
          <a
            href={TRIAL_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-2xl border border-stone-900 bg-white px-6 py-3 text-base font-semibold text-stone-950 shadow-sm hover:bg-emerald-50 hover:shadow-md"
          >
            体験レッスン事前フォームへ
          </a>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6b6257]">
            まずは、現在の英語レベルや学習目的、ご希望について、簡単な事前フォームにご回答ください。
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
