export default function LegalPage() {
    return (
        <div className="mx-auto max-w-3xl px-6 py-12 space-y-6 text-sm">

            {/* Japanese */}
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">特定商取引法に基づく表記</h1>

                <p>販売事業者名: Mekuru English</p>
                <p>運営責任者: Devon Furuta</p>
                <p>所在地: 山梨県北杜市（※請求があった場合に遅滞なく開示いたします）</p>
                <p>メールアドレス: mekuru.ej@gmail.com</p>

                <p>提供サービス: 日本語読解コーチング（オンライン個人レッスン）</p>
                <p>販売価格: 各サービスページまたは申込時にご案内します</p>
                <p>商品代金以外の必要料金: インターネット接続料金等はお客様のご負担となります</p>

                <p>お支払い方法: クレジットカード（Stripe）</p>
                <p>お支払い時期: お申し込み確定時にお支払いいただきます</p>

                <p>サービス提供時期: ご予約確定後、合意した日時に提供します</p>

                <p>キャンセル・返金について: キャンセルおよび返金の条件は、申込時に個別にご案内します</p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 pt-4" />

            {/* English */}
            <div className="space-y-2 text-gray-700">
                <h2 className="text-lg font-semibold">Legal Information (Specified Commercial Transactions Act)</h2>

                <p>Business Name: Mekuru English</p>
                <p>Representative: Devon Furuta</p>
                <p>Location: Hokuto City, Yamanashi, Japan (full address available upon request)</p>
                <p>Email: mekuru.ej@gmail.com</p>

                <p>Service: Online private lessons and learning support focused on improving Japanese reading ability</p>
                <p>Pricing: Provided on service pages or at the time of application</p>
                <p>Additional Fees: Internet connection fees are the responsibility of the customer</p>

                <p>Payment Method: Credit card (Stripe)</p>
                <p>Payment Timing: Payment is required at the time of booking confirmation</p>

                <p>Service Delivery: Services are provided at the scheduled time after booking confirmation</p>

                <p>Cancellation & Refunds: Details will be provided individually at the time of booking</p>
            </div>

        </div>
    );
}