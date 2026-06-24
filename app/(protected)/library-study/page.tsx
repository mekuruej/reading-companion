// Study Hub
//

import Link from "next/link";

const studyPaths = [
  {
    title: "Free Study",
    href: "/library-study/characters",
    eyebrow: "Start here",
    description:
      "Practice kana, kanji readings, and eventually a small demo flashcard set. Good for simple, low-pressure study.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
  {
    title: "Book Study",
    href: "/library-study/book-study",
    eyebrow: "Saved words",
    description:
      "Study the words you saved from your books with focused book flashcards or free saved-word review.",
    className: "border-indigo-200 bg-indigo-50 text-indigo-950",
  },
  {
    title: "Advanced Study",
    href: "/library-study/advanced",
    eyebrow: "Vocabulary growth cycle",
    description:
      "Use Mekuru’s full saved-word cycle: save words from books, study them, follow colors, check ability, and notice them again while reading.",
    className: "border-indigo-200 bg-indigo-50 text-indigo-950",
  },
];

export default function StudyToolsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Study
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Study Hub
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Choose a study path. Free Study is for character practice, Book
            Study is for everyday saved-word study, and Advanced Study explains
            Mekuru’s full vocabulary growth cycle.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {studyPaths.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className={`group rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${path.className}`}
            >
              <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
                {path.eyebrow}
              </div>

              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">{path.title}</h2>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    {path.description}
                  </p>
                </div>

                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/75 p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            Not sure where to go?
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Start with Free Study for character practice and simple study tools.
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Choose Book Study when you want to study saved words from your
            books. Book Study uses Mekuru’s full-access saved-word tools.
          </p>
        </div>
      </div>
    </main>
  );
}
