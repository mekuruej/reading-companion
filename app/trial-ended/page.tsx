export default function TrialEndedPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">
          Your full-access trial has ended
        </h1>

        <p className="mt-4 text-base leading-7 text-stone-700">
          Your library, reading records, and profile are still here. MEKURU now
          keeps free reading features available after a trial ends; only
          full-access study tools pause until another trial, lesson, or paid
          access grant is active.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/books"
            className="inline-block rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-stone-700"
          >
            Go to my Library
          </a>

          <a
            href="/"
            className="inline-block rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
          >
            Back to homepage
          </a>
        </div>

        <p className="mt-4 text-sm text-stone-500">
          Interested in continuing with full access? Reach out and I’ll help you get set up.
        </p>
      </div>
    </main>
  );
}
