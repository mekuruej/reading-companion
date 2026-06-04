"use client";

import type { ReactNode } from "react";

type Props = {
  surface: string;
  children: ReactNode;
};

export default function GlobalWordFormShell({ surface, children }: Props) {
  return (
    <div
      className={`space-y-4 rounded-xl border p-4 ${
        surface.trim()
          ? "border-amber-200 bg-amber-50"
          : "border-stone-200 bg-stone-50"
      }`}
    >
      {surface.trim() ? (
        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-800">
          Preparing "{surface.trim()}"
        </div>
      ) : null}

      {children}
    </div>
  );
}
