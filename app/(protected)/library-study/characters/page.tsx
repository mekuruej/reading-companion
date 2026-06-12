import Link from "next/link";

const characterStudyTools = [
  {
    title: "Kana Study",
    href: "/library-study/kana",
    eyebrow: "Kana basics",
    description:
      "Practice hiragana, katakana, dakuten, combo sounds, and romaji-to-kana recognition.",
    className: "border-rose-200 bg-rose-50 text-rose-950",
  },
  {
    title: "Kanji Reading Study",
    href: "/library-study/kanji",
    eyebrow: "Saved-word kanji",
    description:
      "Practice kanji readings from vocabulary you have saved while reading.",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
];

export default function CharacterStudyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Study
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Character Study
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Practice the characters that help you read more smoothly, from kana
            basics to kanji readings found in your saved words.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {characterStudyTools.map((tool) => (
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
                  <h2 className="text-2xl font-black">{tool.title}</h2>
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

          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-slate-700 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Coming Soon
            </div>

            <div className="mt-3">
              <h2 className="text-2xl font-black text-slate-900">Radicals</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                A future place to practice kanji building blocks and character
                patterns. Coming soon.
              </p>
            </div>
          </div>
        </div>

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
