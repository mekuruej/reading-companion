import Link from "next/link";

export default function TrialEndedPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">
          Your Japanese Learning Tools trial has ended
        </h1>
        <p className="mt-4 text-base leading-7 text-stone-700">
          Your Library, reading records, and saved vocabulary archive are still here.
        </p>
        <p className="mt-4 text-base leading-7 text-stone-700">
          Free reading tools remain available. You can keep tracking books, reading,
          listening, and using your Reading Journal.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/reading-access"
            className="inline-block rounded-2xl bg-stone-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2">
            Continue with Japanese Learning Tools
          </Link>
          <Link href="/books"
            className="inline-block rounded-2xl border border-stone-300 bg-white px-5 py-3 text-center text-sm font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2">
            Return to My Library
          </Link>
        </div>
      </div>
    </main>
  );
}
