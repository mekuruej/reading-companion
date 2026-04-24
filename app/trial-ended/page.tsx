export default function TrialEndedPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">
          Your MEKURU trial has ended
        </h1>

        <p className="mt-4 text-base leading-7 text-stone-700">
          Thanks for trying MEKURU. Your account is still here, and I can
          reactivate access anytime if you decide to continue with lessons.
        </p>

        <div className="mt-6 space-y-3">
          <a
            href="/"
            className="inline-block rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-stone-700"
          >
            Back to homepage
          </a>
        </div>

        <p className="mt-4 text-sm text-stone-500">
          Interested in continuing? Reach out and I’ll help you get set up.
        </p>
      </div>
    </main>
  );
}