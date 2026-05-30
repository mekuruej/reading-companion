// Credits Page

export default function CreditsPage() {
  return (
    <main className="min-h-screen bg-amber-50/40 px-6 py-12 text-stone-800">
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white/90 p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
          MEKURU
        </p>

        <h1 className="mt-3 text-3xl font-black text-stone-950">
          Credits
        </h1>

        <p className="mt-4 leading-relaxed text-stone-700">
          MEKURU is built with the help of open data projects, public resources,
          and creative communities that support language learning and independent
          development.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold text-stone-950">
            Dictionary & Language Data
          </h2>
          <p className="leading-relaxed">
            Japanese dictionary data is sourced from JMdict/EDICT and related
            resources developed by the Electronic Dictionary Research and
            Development Group (EDRDG).
          </p>
          <p className="leading-relaxed">
            Kanji radical/component data is adapted from the EDRDG
            KRADFILE/RADKFILE project.
          </p>
          <p className="leading-relaxed">
            These resources are used under their respective Creative Commons and
            open data licenses.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <a
                href="https://www.edrdg.org/"
                className="font-medium text-amber-800 underline"
              >
                EDRDG
              </a>
            </li>
            <li>
              <a
                href="https://www.edrdg.org/jmdict/edict.html"
                className="font-medium text-amber-800 underline"
              >
                JMdict / EDICT
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold text-stone-950">
            Japanese Lookup Support
          </h2>
          <p className="leading-relaxed">
            MEKURU currently uses Jisho.org as part of its Japanese word lookup
            workflow.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <a
                href="https://jisho.org/"
                className="font-medium text-amber-800 underline"
              >
                Jisho.org
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold text-stone-950">
            Book Metadata
          </h2>
          <p className="leading-relaxed">
            Book lookup metadata and cover images may be provided by openBD,
            Google Books, and Open Library.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <a
                href="https://openbd.jp/"
                className="font-medium text-amber-800 underline"
              >
                openBD
              </a>
            </li>
            <li>
              <a
                href="https://books.google.com/"
                className="font-medium text-amber-800 underline"
              >
                Google Books
              </a>
            </li>
            <li>
              <a
                href="https://openlibrary.org/"
                className="font-medium text-amber-800 underline"
              >
                Open Library
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold text-stone-950">
            Icons & Illustrations
          </h2>
          <p className="leading-relaxed">
            Parrot and role icons are from SVG Repo and are used under their
            listed licenses.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <a
                href="https://www.svgrepo.com/"
                className="font-medium text-amber-800 underline"
              >
                SVG Repo
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold text-stone-950">Photography</h2>
          <p className="leading-relaxed">
            Homepage photography by Hakan Nural via Pexels.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <a
                href="https://www.pexels.com/"
                className="font-medium text-amber-800 underline"
              >
                Pexels
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold text-stone-950">Built With</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Next.js</li>
            <li>React</li>
            <li>TypeScript</li>
            <li>Supabase</li>
            <li>Vercel</li>
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-bold text-stone-950">Personal Note</h2>
          <p className="mt-3 leading-relaxed">
            I’m not a professional software developer. I’m a Japanese teacher
            and lifelong learner building the reading tool I always wished I
            had.
          </p>
          <p className="mt-3 leading-relaxed">
            MEKURU has been created through years of language learning, teaching
            experience, extensive testing, reader feedback, and the help of
            modern AI tools.
          </p>
        </section>
      </div>
      <br />
      <div className="text-center">
        <p className="mb-3">
          Support Mekuru
          <br />
          Help this small reading project grow.
        </p>

        <a
          href="https://ko-fi.com/japanesemekuru"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
        >
          Support app development
        </a>
      </div>
    </main>
  );
}
