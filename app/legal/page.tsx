import Link from "next/link";

export default function LegalPage() {
    return (
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-sm">
            <div className="mb-6">
                <Link
                    href="/"
                    className="text-sm text-stone-500 underline underline-offset-4 transition hover:text-stone-900"
                >
                    ← Back to Home
                </Link>
            </div>

            {/* English */}
            <div className="space-y-2 text-gray-700">
                <h2 className="text-lg font-semibold">Commercial Disclosure</h2>

                <p>Seller: Devon Renee Furuta</p>
                <p>Business Name: Mekuru</p>
                <p>Representative: Devon Renee Furuta</p>

                <p>Address: Hokuto City, Yamanashi, Japan (full address will be disclosed without delay upon request)</p>
                <p>Phone: 080-3918-8726</p>
                <p>Email: mekuru.ej@gmail.com</p>

                <p>Service: Online private lessons and learning support focused on improving Japanese reading ability</p>
                <p>Pricing: Prices are provided on the relevant service page or at the time of enrollment.</p>
                <p>Additional Fees: Bank transfer fees and any required study materials (such as books) are the responsibility of the customer.</p>

                <p>Payment Method: Credit card (Stripe) or bank transfer</p>
                <p>Payment Timing: Students may choose from monthly or term payment plans. Monthly payments are due by the 20th of the previous month. Term payments are due before the start of the term unless otherwise agreed.</p>
                <p>Service Delivery: Services are provided at the scheduled time after booking confirmation.</p>
                <p>
                    Cancellation and Refund Policy: Payments are generally non-refundable once made. However, students may reschedule lessons in accordance with their selected lesson plan. In cases of unavoidable circumstances, such as technical issues or instructor cancellation, a make-up lesson or alternative arrangement will be provided. Details regarding rescheduling and lesson policies are provided at the time of enrollment.
                </p>
            </div>

            <div className="border-t border-gray-200 pt-4" />

            {/* Japanese */}
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">特定商取引法に基づく表記</h1>

                <p>販売事業者名：古田デボンリネー</p>
                <p>サービス名：Mekuru</p>
                <p>運営責任者：Devon Renee Furuta</p>

                <p>所在地：山梨県北杜市（※請求があった場合に遅滞なく開示いたします）</p>
                <p>電話番号：080-3918-8726</p>
                <p>メールアドレス：mekuru.ej@gmail.com</p>

                <p>提供サービス：日本語読解コーチング（オンライン個人レッスン）</p>
                <p>販売価格：各サービスページまたはお申し込み時にご案内いたします</p>
                <p>商品代金以外の必要料金：振込手数料および教材費（書籍代等）はお客様のご負担となります</p>

                <p>お支払い方法：クレジットカード（Stripe）、銀行振込</p>
                <p>お支払い時期：月額プランは前月20日まで、学期プランは開始前までにお支払いいただきます</p>

                <p>サービス提供時期：ご予約確定後、合意した日時にオンラインで提供します</p>

                <p>
                    キャンセル・返金について：お支払い後の返金は原則として行っておりません。ただし、各プランの規定に従い、レッスンの振替は可能です。講師都合やシステムトラブルなどの場合は、振替レッスン等で対応いたします。詳細はお申し込み時にご案内する利用規約をご確認ください。
                </p>
            </div>
        </div>
    );
}