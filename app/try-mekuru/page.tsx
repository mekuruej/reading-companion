import Link from "next/link";

export default function TryMekuruPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="space-y-8">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
            MEKURU Japanese Reading
          </p>

          <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
            Interested in trying MEKURU Japanese Reading?
          </h1>

          <p className="text-lg leading-8 text-stone-700">
            MEKURU is currently being tested with a small number of Japanese
            readers.
          </p>
        </div>

        <div className="space-y-4 text-stone-700">
          <p>
            Anyone can create a free MEKURU account and use the regular reading
            tools.
          </p>

          <p>
            Japanese Learning access is separate and requires approval. To try
            the learning features with guided reading support, start from the
            Japanese Learning page and request an invitation in the app.
          </p>

          <p>
            If approved, you can book an initial 30-minute private reading session.
          </p>

          <p>
            We’ll read Japanese together and talk about your reading goals,
            needs, and comfort level.
          </p>

          <p>
            Your 28-day Japanese Learning trial will begin after the reading
            session.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="text-xl font-semibold text-stone-900">
            How it works
          </h2>

          <ol className="mt-4 space-y-3 text-stone-700">
            <li>
              <strong>1.</strong> Create a free MEKURU account or log in.
            </li>
            <li>
              <strong>2.</strong> Go to the Japanese Learning page.
            </li>
            <li>
              <strong>3.</strong> Choose “Request an invitation.”
            </li>
            <li>
              <strong>4.</strong> If approved, book your initial 30-minute private reading session.
            </li>
            <li>
              <strong>5.</strong> Your 28-day Japanese Learning trial begins after the session.
            </li>
          </ol>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login/beta-signup"
            className="inline-flex items-center justify-center rounded-xl border border-stone-300 px-5 py-3 font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Create an Account or Log In
          </Link>
        </div>

        <p className="text-sm text-stone-500">
          Creating an account or requesting an invitation does not start your
          trial. Japanese Learning trial access requires approval and begins
          only after your initial reading session.
        </p>
      </section>
    </main>
  );
}