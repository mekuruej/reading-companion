import Link from "next/link";

export default function PrivacyPage() {
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
        <h1 className="text-xl font-semibold text-stone-900">Privacy Policy</h1>

        <p>
          Mekuru may collect personal information such as your name and email
          address for the purpose of providing lessons, responding to inquiries,
          and communicating with you.
        </p>

        <p>
          Your information will not be shared with third parties except as
          necessary for payment processing and related services, such as Stripe,
          or where required by law.
        </p>

        <p>
          We take reasonable steps to protect your personal information and to
          handle it appropriately.
        </p>

        <p>
          If you have any questions about this Privacy Policy, please contact:
          {" "}mekuru.ej@gmail.com
        </p>
      </div>

      <div className="border-t border-stone-200 pt-4" />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-stone-900">
          プライバシーポリシー
        </h2>

        <p>
          Mekuruでは、レッスンの提供、お問い合わせへの対応、およびご連絡のために、
          お名前やメールアドレスなどの個人情報を収集する場合があります。
        </p>

        <p>
          これらの情報は、Stripeなどの決済処理や関連サービスに必要な場合、
          または法令に基づく場合を除き、第三者に提供することはありません。
        </p>

        <p>
          個人情報は適切に取り扱い、合理的な範囲で安全管理に努めます。
        </p>

        <p>
          本ポリシーに関するお問い合わせ先：mekuru.ej@gmail.com
        </p>
      </div>
    </div>
  );
}