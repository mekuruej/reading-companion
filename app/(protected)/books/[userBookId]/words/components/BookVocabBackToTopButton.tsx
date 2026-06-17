// app/(protected)/books/[userBookId]/words/components/BookVocabBackToTopButton.tsx
"use client";

import { useEffect, useState } from "react";

const SCROLL_THRESHOLD = 500;

export function BookVocabBackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-4 z-50 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-lg shadow-stone-200/70 transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-300 sm:right-6"
    >
      ↑ Top
    </button>
  );
}