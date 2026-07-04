"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function GlobalWordAddEditCard({ children }: Props) {
  return (
    <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 border-b border-stone-100 pb-4">
        <div className="text-base font-black text-stone-900">
          Add / Prepare Global Entry
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
          Use this like a single Add Word form for global vocabulary and cultural references. This saves an exact global vocabulary-cache entry without adding it to any book.
        </p>
      </div>

      {children}
    </section>
  );
}
