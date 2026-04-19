import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-sm text-stone-700">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-stone-500 underline underline-offset-4 transition hover:text-stone-900"
        >
          ← Back to Home
        </Link>
      </div>


      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-stone-900">Terms of Service</h1>

        <p>
          By booking lessons with Mekuru, you agree to the following terms.
        </p>

        <p>
          Lessons are scheduled in advance and are provided online at the agreed time.
        </p>

        <p>
          Payments are generally non-refundable once made, except in cases of instructor
          cancellation or technical issues that prevent the lesson from being provided.
        </p>

        <p>
          Students may reschedule lessons in accordance with the rules of their selected
          lesson plan. Details regarding lesson frequency, payment, cancellations, and
          rescheduling will be provided at the time of enrollment.
        </p>

        <p>
          Customers are responsible for preparing their own internet connection, devices,
          and any required books or study materials unless otherwise stated.
        </p>

        <p>Mekuru reserves the right to update these terms when necessary.</p>
      </div>

      <div className="border-t border-stone-200 pt-4" />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-stone-900">利用規約</h2>

        <p>
          Mekuruのレッスンをご予約いただくことで、以下の内容に同意したものとみなします。
        </p>

        <p>
          レッスンは事前予約制で、合意した日時にオンラインで提供されます。
        </p>

        <p>
          お支払い後の返金は、講師都合によるキャンセルや、レッスンの提供が困難となる
          技術的な問題が発生した場合を除き、原則として行っておりません。
        </p>

        <p>
          レッスンの振替は、各プランの規定に従って可能です。レッスン回数、お支払い、
          キャンセル、振替に関する詳細は、お申し込み時にご案内いたします。
        </p>

        <p>
          インターネット環境、使用機器、書籍や教材など、受講に必要なものは、別途明記が
          ない限りお客様ご自身でご用意いただきます。
        </p>

        <p>Mekuruは、必要に応じて本規約を更新することがあります。</p>
      </div>
    </div>
  );
}