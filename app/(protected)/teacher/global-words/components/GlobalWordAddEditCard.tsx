"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function GlobalWordAddEditCard({ children }: Props) {
  return (
    <section className="mt-4 rounded-2xl border border-stone-300 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-stone-900">
          Add / Prepare Global Entry
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Prepare one careful global entry at a time. This first pass stores nothing.
        </p>
      </div>

      {children}
    </section>
  );
}
