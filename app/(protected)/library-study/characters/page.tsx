import Link from "next/link";

const basicStudyTools = [
  {
    title: "Kana Study",
    href: "/library-study/kana",
    eyebrow: "Kana",
    description:
      "Practice hiragana, katakana, dakuten, combo sounds, and romaji-to-kana recognition.",
    className: "border-rose-200 bg-rose-50 text-rose-950",
  },
  {
    title: "Kanji Reading Study",
    href: "/library-study/kanji",
    eyebrow: "Kanji",
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
  {
    title: "Foundation Vocabulary",
    href: "/library-study/foundation-vocabulary",
    eyebrow: "N5 Words",
    description:
      "Study a small JLPT N5 starter deck with book-flashcard-style cards.",
    className: "border-indigo-200 bg-indigo-50 text-indigo-950",
  },
];

export default function BasicStudyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Foundation Sets
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Build Reading Foundations
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Start here for simple, low-pressure study. Practice kana, kanji
            readings, radicals, and core N5 vocabulary before moving into book-based study.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Foundation Sets
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
