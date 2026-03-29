"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="text-center md:text-left">
          <Link
            href="/books"
            className="text-lg font-semibold tracking-tight text-stone-900"
          >
            MEKURU
          </Link>
        </div>

        <nav className="mt-2 flex flex-wrap justify-center gap-3 text-sm md:justify-end">
          <Link href="/books" className="text-stone-700 transition hover:text-stone-900">
            Library
          </Link>

          <button
            type="button"
            onClick={() =>
              alert("Book Hubs is coming soon. For now, choose a book from your Library.")
            }
            className="text-stone-700 transition hover:text-stone-900"
          >
            Book Hubs
          </button>

          <button
            type="button"
            onClick={() =>
              alert("Full study mode is coming soon. For now, open a book from your Library to study.")
            }
            className="text-stone-700 transition hover:text-stone-900"
          >
            Study
          </button>

          <Link
            href="/vocab/dictionary"
            className="text-stone-700 transition hover:text-stone-900"
          >
            Dictionary
          </Link>
        </nav>

        <div className="mt-2 text-center text-xs text-stone-500 md:text-left">
          ページをめくって、話しまくろう
        </div>
      </div>
    </header>
  );
}