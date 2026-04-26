"use client";

import Link from "next/link";

export default function StudyComingSoonPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 pb-10 pt-15">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Global Study
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          A fuller across-books study space is coming. This will eventually be the place for
          global review, broader study sessions, and cross-book patterns without crowding the
          book-by-book study tools.
        </p>

        <div className="mt-6 space-y-2 text-sm text-stone-600">
          <div>Coming next:</div>
          <div>• frequency color logic</div>
          <div>• richer filtering and rotation</div>
          <div>• clearer connection with your long-term study patterns</div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/book-flashcards"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:bg-stone-50"
          >
            Open Book Flashcards
          </Link>
          <Link
            href="/book-kanji-readings"
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:bg-stone-50"
          >
            Open Book Kanji Readings
          </Link>
        </div>
      </div>
    </main>
  );
}
