// Reading Tools
//

import Link from "next/link";

export default function ReadingToolsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Library
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Reading Tools
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Choose a book first, then open its reading tools from the Book Hub.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/books"
            className="group rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
              Start from books
            </div>
            <h2 className="mt-3 text-xl font-black">Open My Library</h2>
            <p className="mt-2 text-sm leading-6 opacity-80">
              Pick a book, then choose Curiosity Reading, Fluid Reading, or other book tools.
            </p>
          </Link>

          <Link
            href="/library/book-hubs"
            className="group rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
              Book spaces
            </div>
            <h2 className="mt-3 text-xl font-black">Open Book Hubs</h2>
            <p className="mt-2 text-sm leading-6 opacity-80">
              Jump into a book space with reading, vocab, notes, and study options.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}