// Study Hub
//

import Link from "next/link";

const studyTools = [
  {
    title: "Ability Check",
    href: "/library-study/check",
    eyebrow: "Daily check",
    description:
      "A once-a-day check for words that are ready to move by reading or meaning ability.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
  },
  {
    title: "Library Practice",
    href: "/library-study/practice",
    eyebrow: "Review only",
    description:
      "Review your existing words freely. Practice does not move colors.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
  {
    title: "Book Flashcards",
    href: "/book-flashcards",
    eyebrow: "Book-based study",
    description:
      "Study words from individual books when you want a focused book session.",
    className: "border-violet-200 bg-violet-50 text-violet-950",
  },
  {
    title: "Kanji Readings",
    href: "/library-study/kanji",
    eyebrow: "Kanji study",
    description:
      "Practice kanji readings from saved vocabulary. More global kanji tools can live here later.",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
  {
    title: "Word Sky",
    href: "/library-study/word-sky",
    eyebrow: "Add words",
    description:
      "Add easier words to your study pool when Ability Check does not have enough cards.",
    className: "border-slate-200 bg-white text-slate-900",
  },
];

export default function StudyToolsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Study
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Study Hub
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Choose how you want to study today:
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Check your ability, review freely, focus on a book, or add easier words to your pool.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {studyTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tool.className}`}
            >
              <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
                {tool.eyebrow}
              </div>

              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{tool.title}</h2>
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
      </div>
    </main>
  );
}