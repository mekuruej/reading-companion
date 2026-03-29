"use client";

import Link from "next/link";

export default function Header() {
  const handleComingSoon = (label: string) => {
    if (label === "Study") {
      alert(
        "Full study mode is coming soon. For now, open a book from your Library to study."
      );
      return;
    }

    if (label === "Book Hubs") {
      alert(
        "Book Hubs is coming soon. For now, choose a book from your Library."
      );
      return;
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="leading-tight text-stone-900"
        >
          <div className="text-base font-semibold tracking-tight">
            MEKURU READING COMPANION
          </div>
          <div className="text-xs text-stone-500">
            ページをめくって、話しまくろう
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3 text-sm">
          <Link
            href="/books"
            className="rounded-full px-3 py-2 text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
          >
            Library
          </Link>

          <button
            type="button"
            onClick={() => handleComingSoon("Book Hubs")}
            className="rounded-full px-3 py-2 text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
          >
            Book Hubs
          </button>

          <button
            type="button"
            onClick={() => handleComingSoon("Study")}
            className="rounded-full px-3 py-2 font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
          >
            Study
          </button>

          <Link
            href="/vocab/dictionary"
            className="rounded-full px-3 py-2 text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
          >
            Dictionary
          </Link>
        </nav>
      </div>
    </header>
  );
}