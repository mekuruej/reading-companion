import Link from "next/link";

const bookStudyTools = [
  {
    title: "Book Flashcards",
    href: "/library-study/book-flashcards",
    eyebrow: "One book",
    description:
      "Study saved words from one specific book. This is the simplest place to start when you want a focused book-based session.",
    className: "border-indigo-200 bg-indigo-50 text-indigo-950",
  },
  {
    title: "Saved Words Review",
    href: "/library-study/practice",
    eyebrow: "Across books",
    description:
      "Review saved words freely across your library. Review does not move colors.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
];

export default function BookStudyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Book Study
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Study Words From Your Books
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Choose where to study the words you saved while reading.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {bookStudyTools.map((tool) => (
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

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/80 p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            Book Study uses Mekuru’s full-access saved-word tools.
          </p>
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
