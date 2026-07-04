import Link from "next/link";

const basicStudyTools = [
  {
    title: "Kana Study",
    href: "/library-study/kana",
    eyebrow: "Character Study",
    description:
      "Practice hiragana, katakana, dakuten, combo sounds, and romaji-to-kana recognition.",
    className: "border-rose-200 bg-rose-50 text-rose-950",
  },
  {
    title: "Kanji Reading Study",
    href: "/library-study/kanji",
    eyebrow: "Character Study",
    description:
      "Practice kanji readings from vocabulary you have saved while reading.",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
  {
    title: "Radical Flashcards",
    href: "/library-study/radicals",
    eyebrow: "Character Patterns",
    description:
      "Practice the main radicals for kanji used in Mekuru.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
  },
];

const comingSoonTools = [
  {
    title: "Demo Flashcards",
    eyebrow: "Sample deck",
    description:
      "A small sample flashcard set so you can try Mekuru-style book study before using your own saved words.",
  },
];

export default function BasicStudyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Study
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Basic Study
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Start here for simple, low-pressure study. Practice kana and kanji
            basics, or try a small demo flashcard set before moving into the
            full vocabulary cycle.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Character Study
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Build reading foundations
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {basicStudyTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`group rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tool.className}`}
              >
                <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
                  {tool.eyebrow}
                </div>

                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black">{tool.title}</h3>
                    <p className="mt-2 text-sm leading-6 opacity-80">
                      {tool.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Coming Soon
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              More basic practice
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {comingSoonTools.map((tool) => (
              <div
                key={tool.title}
                className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-700 shadow-sm"
              >
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {tool.eyebrow}
                </div>

                <div className="mt-3">
                  <h3 className="text-2xl font-black text-slate-900">
                    {tool.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {tool.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 text-center">
          <Link
            href="/library-study"
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Study Hub
          </Link>
        </div>
      </div>
    </main>
  );
}